/* ===========================================================
   ai.js — Enrico "intelligente": collegamento a Claude tramite
   l'SDK ufficiale Anthropic (caricato on-demand dal CDN).

   - chat(): conversazione in streaming con strumenti che leggono
     e modificano i dati dell'app (scheda, diario, obiettivi…)
   - lookupFood(): calorie e macro di un alimento qualsiasi
   - parsePlanPdf(): legge una scheda PDF e la struttura
   - parseDietPdf(): legge una dieta PDF (giorni, pasti, grammature)
   - analyzeFoodLog(): cosa ho mangiato da testo, PDF o foto

   La chiave API resta salvata solo su questo dispositivo
   (localStorage, nei dati dell'utente) e viene inviata soltanto
   ad api.anthropic.com.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const db = () => window.GA.db;
  const calc = () => window.GA.calc;
  const coach = () => window.GA.coach;
  const foods = () => window.GA.foods;

  const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm";
  const DEFAULT_MODEL = "claude-opus-5";
  const MODELS = [
    { id: "claude-opus-5", label: "Claude Opus 5", hint: "Consigliato: il più bravo a ragionare" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", hint: "Più rapido ed economico" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Il nuovissimo Opus" },
  ];

  let Anthropic = null;
  let clientCache = null;

  function settings() {
    const data = db().getData();
    const ai = (data && data.settings && data.settings.ai) || {};
    return { apiKey: ai.apiKey || "", model: ai.model || DEFAULT_MODEL };
  }
  function saveSettings(patch) {
    db().updateData((d) => {
      d.settings.ai = Object.assign({}, d.settings.ai || {}, patch);
    });
    clientCache = null;
  }
  function isConfigured() {
    return !!settings().apiKey;
  }

  async function getClient() {
    const { apiKey } = settings();
    if (!apiKey) throw new Error("NO_KEY");
    if (!Anthropic) {
      const mod = await import(SDK_URL);
      Anthropic = mod.default || mod.Anthropic;
    }
    if (!clientCache || clientCache.key !== apiKey) {
      clientCache = { key: apiKey, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
    }
    return clientCache.client;
  }

  // Parametri comuni: su Opus 5 attiviamo il fallback lato server così un
  // eventuale falso positivo dei filtri di sicurezza non blocca la risposta.
  function baseParams(model) {
    const p = { model, thinking: { type: "adaptive" } };
    if (model === "claude-opus-5") {
      p.betas = ["server-side-fallback-2026-07-01"];
      p.fallbacks = "default";
    }
    return p;
  }

  function friendlyError(err) {
    if (err && err.message === "NO_KEY") return "Per usare Enrico con l'intelligenza artificiale serve una chiave API: aprila dal menu → Enrico AI.";
    if (Anthropic && err instanceof Anthropic.AuthenticationError) return "La chiave API non è valida. Controllala dal menu → Enrico AI.";
    if (Anthropic && err instanceof Anthropic.PermissionDeniedError) return "La chiave API non ha i permessi per questo modello. Prova a cambiare modello dal menu → Enrico AI.";
    if (Anthropic && err instanceof Anthropic.NotFoundError) return "Modello non disponibile per questa chiave: scegline un altro dal menu → Enrico AI.";
    if (Anthropic && err instanceof Anthropic.RateLimitError) return "Troppe richieste in poco tempo: riprova tra qualche secondo.";
    if (Anthropic && err instanceof Anthropic.BadRequestError) return "Richiesta non valida: " + (err.message || "");
    if (Anthropic && err instanceof Anthropic.APIError) return "Errore del servizio (" + (err.status || "?") + "): riprova tra poco.";
    if (err && /Failed to fetch|NetworkError|import/i.test(String(err.message))) return "Sembra che tu sia offline: per le risposte intelligenti serve la connessione.";
    return "Qualcosa è andato storto: " + ((err && err.message) || err);
  }

  /* =========================================================
     Contesto dell'app passato a Claude a ogni messaggio
     ========================================================= */
  const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

  function setsSummary(h) {
    if (!h) return null;
    const sets = h.sets && h.sets.length ? h.sets.map((s) => s.w + "kg×" + s.r).join(", ") : h.weight + "kg×" + h.reps;
    return h.date + ": " + sets + (h.feedback ? " (" + h.feedback + ")" : "");
  }

  function snapshot(data) {
    const nut = window.GA.nutrition;
    const iso = coach().todayISO();
    const day = data.nutrition.mealLog[iso] || {};
    const tot = nut ? nut.totals(day) : { kcal: 0, p: 0, c: 0, f: 0 };
    const meals = {};
    Object.keys(day).forEach((m) => {
      if ((day[m] || []).length) meals[m] = day[m].map((it) => it.name + (it.grams ? " " + it.grams + "g" : "") + " (" + it.kcal + " kcal)");
    });
    const plan = data.plan
      ? {
          tipo: data.plan.name || data.plan.type,
          note_scheda: data.plan.notes || undefined,
          iniziata: new Date(data.plan.startedAt).toISOString().slice(0, 10),
          obiettivo_allenamento: data.plan.trainingGoal || calc().trainingGoalFromProfile(data.profile),
          giorni: data.plan.days.map((d) => ({
            giorno: d.label,
            esercizi: d.exercises.map((e) => {
              const hist = data.history[e.id] || [];
              const o = { nome: e.name, serie: e.sets, reps: e.reps, recupero_s: e.restSec, recupero_prima_del_prossimo_s: window.GA.workout.restAfter(e) };
              if (e.notes) o.note = e.notes;
              if (e.targetWeight) o.peso_impostato_prossima = e.targetWeight;
              const last = hist.filter((h) => !h.suggested).slice(-2).map(setsSummary);
              if (last.length) o.ultime_sessioni = last;
              return o;
            }),
          })),
        }
      : null;
    return {
      oggi: iso + " (" + WEEKDAYS[new Date().getDay()] + ")",
      nome_utente: (db().getCurrentUser() || {}).name,
      profilo: data.profile,
      target_giornalieri: { kcal: data.targets.kcal, proteine_g: data.targets.protein, carboidrati_g: data.targets.carbs, grassi_g: data.targets.fat },
      mangiato_oggi: { kcal: Math.round(tot.kcal), proteine_g: Math.round(tot.p), carboidrati_g: Math.round(tot.c), grassi_g: Math.round(tot.f), pasti: meals },
      scheda: plan,
      ultime_sessioni: data.sessionsLog.slice(-5).map((s) => s.date + " — " + s.dayLabel),
      peso_corporeo_recente: data.weightLog.slice(-6).map((w) => w.date + ": " + w.weight + "kg"),
      alimenti_personali: data.nutrition.customFoods.map((f) => f.name),
      dieta_importata: data.nutrition.dietPlan
        ? {
            nome: data.nutrition.dietPlan.name,
            note: data.nutrition.dietPlan.notes || undefined,
            giorni: data.nutrition.dietPlan.days.map((d) => ({
              giorno: d.label,
              pasti: d.meals.map((m) => m.label + ": " + m.items.map((it) => it.name + " " + it.grams + "g" + (it.alternatives ? " (oppure " + it.alternatives + ")" : "")).join(", ")),
            })),
          }
        : null,
      calendario_prossimi_giorni: data.calendar.filter((c) => c.date >= iso).slice(0, 10).map((c) => c.date + ": " + c.label),
    };
  }

  const SYSTEM_PROMPT = [
    "Sei Enrico, il coach personale di allenamento e alimentazione dentro un'app mobile. Parli in italiano, dai del tu, con tono diretto, caldo e motivante, da allenatore esperto che conosce bene l'utente.",
    "",
    "Competenze: programmazione dell'allenamento con i pesi (ipertrofia, forza, ricomposizione), progressione dei carichi, RIR/RPE, scarichi, tecnica degli esercizi, prevenzione infortuni, allenamento per chi pratica sport di squadra, nutrizione sportiva (fabbisogno, macro, timing, integrazione di base), ricette pratiche.",
    "",
    "Ogni messaggio dell'utente arriva con un blocco <stato_app> che contiene i suoi dati aggiornati (profilo, target, cosa ha mangiato oggi, scheda con le ultime sessioni, peso corporeo, calendario). Usalo per dare risposte concrete e personalizzate: cita numeri reali (es. «ieri hai fatto 80kg×8 alla panca, oggi prova 82,5»). Se c'è una dieta_importata, è il piano del suo nutrizionista: rispettala nei consigli e proponi sostituzioni equivalenti invece di stravolgerla. Non ripetere il blocco all'utente.",
    "",
    "Strumenti: puoi modificare i dati dell'app (obiettivo, target, diario alimentare, alimenti personali, ricette, pesi della prossima sessione, scheda, peso corporeo). Usali quando l'utente te lo chiede o quando conferma una tua proposta; se una modifica è importante (es. sostituire tutta la scheda) e la richiesta è ambigua, proponi prima e chiedi conferma. Quando l'utente dice di aver mangiato qualcosa, registralo nel diario stimando grammature e valori realistici. Dopo aver usato uno strumento, conferma in una frase cosa hai cambiato.",
    "",
    "Stile: risposte brevi e scorrevoli adatte allo schermo di un telefono. Usa elenchi puntati solo quando aiutano (es. una ricetta o una scheda), grassetto per i numeri chiave, niente tabelle. Se ti chiedono una ricetta, dai ingredienti con grammi e macro totali stimate.",
    "",
    "Sicurezza: non sei un medico. Per dolori persistenti, infortuni, patologie o disturbi alimentari suggerisci con delicatezza un professionista. Non proporre diete sotto il metabolismo basale né integratori rischiosi.",
    "",
    "Latency-sensitive: inizia subito la risposta visibile.",
  ].join("\n");

  /* =========================================================
     Strumenti (client-side) che Claude può usare
     ========================================================= */
  const MEAL_ENUM = ["colazione", "pranzo", "cena", "spuntini"];
  const CAT_ENUM = () => foods().CATEGORIES.map((c) => c.id);

  function toolDefs() {
    const tools = [
      {
        name: "update_goal",
        description: "Cambia l'obiettivo generale dell'utente e ricalcola automaticamente calorie e macro giornaliere.",
        input_schema: { type: "object", properties: { goal: { type: "string", enum: ["mantenimento", "bulk", "cut"] } }, required: ["goal"] },
      },
      {
        name: "set_daily_targets",
        description: "Imposta manualmente il target calorico giornaliero ed eventualmente i grammi di macro. Se ometti le macro vengono distribuite automaticamente (proteine ~1.8 g/kg, grassi 25%, resto carboidrati).",
        input_schema: {
          type: "object",
          properties: {
            kcal: { type: "integer", description: "Calorie giornaliere" },
            protein_g: { type: "integer" },
            carbs_g: { type: "integer" },
            fat_g: { type: "integer" },
          },
          required: ["kcal"],
        },
      },
      {
        name: "log_food",
        description: "Aggiunge uno o più alimenti al diario alimentare di oggi. I valori sono riferiti alla porzione indicata (non per 100 g).",
        input_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  grams: { type: "number" },
                  meal: { type: "string", enum: MEAL_ENUM },
                  kcal: { type: "number" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" },
                  emoji: { type: "string", description: "Una emoji che rappresenta il cibo" },
                },
                required: ["name", "grams", "meal", "kcal", "protein_g", "carbs_g", "fat_g"],
              },
            },
          },
          required: ["items"],
        },
      },
      {
        name: "save_custom_food",
        description: "Salva un nuovo alimento nel catalogo personale dell'utente, con valori per 100 g.",
        input_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string", enum: CAT_ENUM() },
            kcal_100g: { type: "number" },
            protein_100g: { type: "number" },
            carbs_100g: { type: "number" },
            fat_100g: { type: "number" },
            portion_g: { type: "number", description: "Porzione tipica in grammi" },
            emoji: { type: "string" },
          },
          required: ["name", "category", "kcal_100g", "protein_100g", "carbs_100g", "fat_100g", "portion_g"],
        },
      },
      {
        name: "save_recipe",
        description: "Salva una ricetta tra le ricette dell'utente.",
        input_schema: { type: "object", properties: { title: { type: "string" }, text: { type: "string", description: "Ingredienti con grammi, procedimento breve e macro stimate" } }, required: ["title", "text"] },
      },
      {
        name: "set_next_weight",
        description: "Imposta il peso (kg) da usare nella prossima sessione per un esercizio della scheda. Il nome può essere parziale.",
        input_schema: { type: "object", properties: { exercise_name: { type: "string" }, weight_kg: { type: "number" } }, required: ["exercise_name", "weight_kg"] },
      },
      {
        name: "set_plan",
        description: "Crea o sostituisce l'intera scheda di allenamento. Per modificarla parzialmente, passa la scheda completa con le modifiche. Lo storico dei carichi viene mantenuto per gli esercizi con lo stesso nome.",
        input_schema: {
          type: "object",
          properties: {
            training_goal: { type: "string", enum: ["forza", "ipertrofia", "resistenza"] },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "es. 'Giorno A — Push'" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sets: { type: "integer" },
                        reps: { type: "string", description: "es. '8-10' o '5'" },
                        rest_sec: { type: "integer" },
                        notes: { type: "string" },
                      },
                      required: ["name", "sets", "reps", "rest_sec"],
                    },
                  },
                },
                required: ["label", "exercises"],
              },
            },
          },
          required: ["days"],
        },
      },
      {
        name: "log_body_weight",
        description: "Registra il peso corporeo di oggi.",
        input_schema: { type: "object", properties: { weight_kg: { type: "number" } }, required: ["weight_kg"] },
      },
      {
        name: "get_exercise_history",
        description: "Legge tutto lo storico (date, serie, pesi, ripetizioni, feedback) di un esercizio della scheda. Il nome può essere parziale.",
        input_schema: { type: "object", properties: { exercise_name: { type: "string" } }, required: ["exercise_name"] },
      },
      {
        name: "get_nutrition_history",
        description: "Legge i totali giornalieri (kcal e macro) degli ultimi N giorni.",
        input_schema: { type: "object", properties: { days: { type: "integer" } }, required: ["days"] },
      },
    ];
    // lo stream degli input degli strumenti arriva man mano che vengono generati
    tools.forEach((t) => { t.eager_input_streaming = true; });
    return tools;
  }

  const num = (v) => typeof v === "number" && isFinite(v);
  const str = (v) => typeof v === "string" && v.trim().length > 0;

  function findExercises(data, name) {
    if (!data.plan) return [];
    const q = foods().normalize(name);
    const out = [];
    data.plan.days.forEach((d) => d.exercises.forEach((e) => {
      if (foods().normalize(e.name).includes(q) || q.includes(foods().normalize(e.name))) out.push(e);
    }));
    return out;
  }

  // Esegue uno strumento. Ritorna { result, label?, isError? }
  function runTool(name, input) {
    input = input || {};
    const data = db().getData();
    switch (name) {
      case "update_goal": {
        if (!["mantenimento", "bulk", "cut"].includes(input.goal)) return { result: "goal non valido", isError: true };
        let t;
        db().updateData((d) => { d.profile.goal = input.goal; d.targets = t = calc().computeTargets(d.profile); });
        return { result: "Obiettivo aggiornato. Nuovi target: " + JSON.stringify(t), label: "Obiettivo: " + input.goal };
      }
      case "set_daily_targets": {
        if (!num(input.kcal) || input.kcal < 800 || input.kcal > 8000) return { result: "kcal non valide", isError: true };
        const kcal = Math.round(input.kcal);
        const w = data.profile.weight || 75;
        const fat = num(input.fat_g) ? Math.round(input.fat_g) : Math.round((kcal * 0.25) / 9);
        const protein = num(input.protein_g) ? Math.round(input.protein_g) : Math.round(1.8 * w);
        const carbs = num(input.carbs_g) ? Math.round(input.carbs_g) : Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 0);
        db().updateData((d) => { d.targets = Object.assign({}, d.targets, { kcal, protein, carbs, fat, computedAt: Date.now() }); });
        return { result: "Target salvati: " + kcal + " kcal, P" + protein + " C" + carbs + " G" + fat, label: "Target " + kcal + " kcal" };
      }
      case "log_food": {
        const items = Array.isArray(input.items) ? input.items : [];
        const valid = items.filter((it) => str(it.name) && num(it.grams) && MEAL_ENUM.includes(it.meal) && num(it.kcal));
        if (!valid.length) return { result: "Nessun alimento valido", isError: true };
        db().updateData((d) => {
          const day = window.GA.nutrition.todayLog(d);
          valid.forEach((it) => {
            day[it.meal].push({
              id: db().uid("item"), name: it.name.trim(), grams: Math.round(it.grams), kcal: Math.round(it.kcal),
              p: Math.round((it.protein_g || 0) * 10) / 10, c: Math.round((it.carbs_g || 0) * 10) / 10, f: Math.round((it.fat_g || 0) * 10) / 10,
              emoji: it.emoji || "🍽️", cat: "altro", ts: Date.now(),
            });
          });
        });
        return { result: "Aggiunti " + valid.length + " alimenti al diario di oggi", label: valid.length === 1 ? valid[0].name + " nel diario" : valid.length + " alimenti nel diario" };
      }
      case "save_custom_food": {
        if (!str(input.name) || !num(input.kcal_100g)) return { result: "Dati alimento non validi", isError: true };
        const food = {
          id: db().uid("cf"), cat: CAT_ENUM().includes(input.category) ? input.category : "altro", name: input.name.trim(),
          kcal: Math.round(input.kcal_100g), p: +input.protein_100g || 0, c: +input.carbs_100g || 0, f: +input.fat_100g || 0,
          portion: Math.round(input.portion_g || 100), emoji: input.emoji || "",
        };
        db().updateData((d) => { d.nutrition.customFoods.push(food); });
        return { result: "Alimento salvato", label: food.name + " salvato" };
      }
      case "save_recipe": {
        if (!str(input.title) || !str(input.text)) return { result: "Ricetta vuota", isError: true };
        db().updateData((d) => { d.nutrition.savedRecipes.push({ id: db().uid("rec"), title: input.title, text: input.text, ts: Date.now() }); });
        return { result: "Ricetta salvata", label: "Ricetta salvata" };
      }
      case "set_next_weight": {
        if (!str(input.exercise_name) || !num(input.weight_kg)) return { result: "Parametri non validi", isError: true };
        const matches = findExercises(data, input.exercise_name);
        if (!matches.length) return { result: "Nessun esercizio della scheda corrisponde a '" + input.exercise_name + "'", isError: true };
        const ids = matches.map((e) => e.id);
        db().updateData((d) => {
          d.plan.days.forEach((day) => day.exercises.forEach((e) => { if (ids.includes(e.id)) e.targetWeight = input.weight_kg; }));
          if (d.workoutDraft && d.workoutDraft.ex) ids.forEach((id) => delete d.workoutDraft.ex[id]);
        });
        return { result: "Peso impostato per: " + matches.map((m) => m.name).join(", "), label: matches[0].name + " → " + input.weight_kg + " kg" };
      }
      case "set_plan": {
        const days = Array.isArray(input.days) ? input.days : [];
        const clean = days
          .map((d) => ({
            label: str(d.label) ? d.label.trim() : "Giorno",
            exercises: (Array.isArray(d.exercises) ? d.exercises : []).filter((e) => str(e.name)).map((e) => ({
              name: e.name.trim(), sets: Math.max(1, Math.min(12, parseInt(e.sets, 10) || 3)), reps: String(e.reps || "8-12"),
              restSec: Math.max(15, Math.min(600, parseInt(e.rest_sec, 10) || 90)), notes: str(e.notes) ? e.notes.trim() : "",
            })),
          }))
          .filter((d) => d.exercises.length);
        if (!clean.length) return { result: "Scheda vuota", isError: true };
        const plan = buildPlanPreservingIds(data, clean, { source: "coach", trainingGoal: input.training_goal });
        db().updateData((d) => { d.plan = plan; d.workoutDraft = null; });
        window.GA.workout && window.GA.workout.resetDraft();
        return { result: "Scheda salvata con " + plan.days.length + " giorni", label: "Scheda aggiornata" };
      }
      case "log_body_weight": {
        if (!num(input.weight_kg) || input.weight_kg < 30 || input.weight_kg > 300) return { result: "Peso non valido", isError: true };
        const w = Math.round(input.weight_kg * 10) / 10;
        db().updateData((d) => {
          const today = coach().todayISO();
          d.weightLog = d.weightLog.filter((x) => x.date !== today);
          d.weightLog.push({ id: db().uid("w"), date: today, weight: w });
          d.profile.weight = w;
        });
        return { result: "Peso registrato", label: "Peso " + w + " kg" };
      }
      case "get_exercise_history": {
        const matches = findExercises(data, input.exercise_name || "");
        if (!matches.length) return { result: "Nessun esercizio corrispondente nella scheda" };
        return { result: JSON.stringify(matches.map((e) => ({ esercizio: e.name, storico: (data.history[e.id] || []).filter((h) => !h.suggested).map(setsSummary) }))) };
      }
      case "get_nutrition_history": {
        const n = Math.max(1, Math.min(60, parseInt(input.days, 10) || 7));
        const out = [];
        for (let i = 0; i < n; i++) {
          const iso = coach().todayISO(-i);
          const day = data.nutrition.mealLog[iso];
          if (!day) continue;
          const t = window.GA.nutrition.totals(day);
          out.push(iso + ": " + Math.round(t.kcal) + " kcal, P" + Math.round(t.p) + " C" + Math.round(t.c) + " G" + Math.round(t.f));
        }
        return { result: out.length ? out.join("\n") : "Nessun dato nel periodo" };
      }
    }
    return { result: "Strumento sconosciuto", isError: true };
  }

  // Riusa gli id degli esercizi con lo stesso nome, così lo storico resta collegato.
  function buildPlanPreservingIds(data, days, opts) {
    const byName = {};
    if (data.plan) data.plan.days.forEach((d) => d.exercises.forEach((e) => { byName[foods().normalize(e.name)] = e; }));
    const planDays = days.map((d) => ({
      id: db().uid("day"),
      label: d.label,
      notes: d.notes || "",
      exercises: d.exercises.map((e) => {
        const prev = byName[foods().normalize(e.name)];
        return Object.assign({ id: prev ? prev.id : db().uid("ex") }, e, prev && prev.targetWeight && !e.targetWeight ? { targetWeight: prev.targetWeight } : {});
      }),
    }));
    return {
      type: planDays.length === 2 ? "AB" : planDays.length === 3 ? "ABC" : planDays.length + " giorni",
      name: opts.name || "",
      notes: opts.notes || "",
      days: planDays,
      startedAt: data.plan && opts.keepStart ? data.plan.startedAt : Date.now(),
      weekNumber: 1,
      lastDeloadWeek: 0,
      source: opts.source || "coach",
      trainingGoal: opts.trainingGoal || (data.plan && data.plan.trainingGoal) || calc().trainingGoalFromProfile(data.profile),
    };
  }

  /* =========================================================
     Chat in streaming con ciclo degli strumenti
     ========================================================= */
  function historyToMessages(chat) {
    const msgs = [];
    chat.slice(-40).forEach((m) => {
      if (!m.text) return;
      const role = m.role === "user" ? "user" : "assistant";
      if (!msgs.length && role === "assistant") return; // il primo messaggio deve essere dell'utente
      const last = msgs[msgs.length - 1];
      if (last && last.role === role) last.content += "\n\n" + m.text;
      else msgs.push({ role, content: m.text });
    });
    return msgs;
  }

  // onUpdate(text) viene chiamato a ogni pezzo di testo; onAction(label) quando uno strumento modifica i dati
  async function chat(userText, { onUpdate, onAction } = {}) {
    const client = await getClient();
    const { model } = settings();
    const data = db().getData();

    const messages = historyToMessages(data.chat);
    const stateBlock = { type: "text", text: "<stato_app>\n" + JSON.stringify(snapshot(data)) + "\n</stato_app>" };
    const last = messages[messages.length - 1];
    if (last && last.role === "user") {
      // l'ultimo messaggio dell'utente è quello appena inviato (già salvato in chat)
      last.content = [stateBlock, { type: "text", text: last.content }];
    } else {
      messages.push({ role: "user", content: [stateBlock, { type: "text", text: userText }] });
    }

    const tools = toolDefs();
    const system = [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];
    let text = "";
    const actions = [];
    let jsonRetries = 0;

    for (let turn = 0; turn < 8; turn++) {
      const stream = client.beta.messages.stream(Object.assign(baseParams(model), {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system,
        tools,
        messages,
      }));
      const prefix = text ? text + "\n\n" : "";
      let turnText = "";
      stream.on("text", (delta) => {
        turnText += delta;
        onUpdate && onUpdate(prefix + turnText);
      });

      let message;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // input di uno strumento non interpretabile: si ripete il turno (max 2 volte)
        if ((Anthropic && err instanceof Anthropic.APIError) || jsonRetries++ >= 2) throw err;
        continue;
      }
      if (turnText) text = prefix + turnText;

      if (message.stop_reason === "refusal") {
        if (!text) text = "Su questa richiesta non posso aiutarti. Chiedimi pure altro su allenamento o alimentazione!";
        break;
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      const uses = message.content.filter((b) => b.type === "tool_use");
      if (!uses.length) break;
      if (message.stop_reason === "max_tokens") throw new Error("Risposta troncata: riprova con una richiesta più breve.");

      messages.push({ role: "assistant", content: message.content });
      const results = uses.map((u) => {
        let r;
        try { r = runTool(u.name, u.input); } catch (e) { r = { result: "Errore: " + e.message, isError: true }; }
        if (r.label && !r.isError) { actions.push(r.label); onAction && onAction(r.label); }
        return { type: "tool_result", tool_use_id: u.id, content: String(r.result), is_error: !!r.isError };
      });
      messages.push({ role: "user", content: results });
    }
    return { text: text.trim(), actions };
  }

  /* =========================================================
     Calorie e macro di un alimento qualsiasi (output strutturato)
     ========================================================= */
  async function lookupFood(query) {
    const client = await getClient();
    const { model } = settings();
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome dell'alimento in italiano, pulito e con iniziale maiuscola" },
        emoji: { type: "string" },
        category: { type: "string", enum: CAT_ENUM() },
        basis: { type: "string", description: "A cosa si riferiscono i valori: 'crudo', 'cotto', 'per 100 ml', 'pronto'" },
        kcal: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        portion_g: { type: "integer", description: "Porzione tipica in grammi" },
        note: { type: "string", description: "Una frase breve e utile (es. marca di riferimento, differenza crudo/cotto)" },
        confidence: { type: "string", enum: ["alta", "media", "bassa"] },
      },
      required: ["name", "emoji", "category", "basis", "kcal", "protein", "carbs", "fat", "portion_g", "note", "confidence"],
      additionalProperties: false,
    };
    const res = await client.beta.messages.create(Object.assign(baseParams(model), {
      max_tokens: 4000,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system: "Sei un nutrizionista. Fornisci valori nutrizionali medi realistici PER 100 g (o 100 ml per le bevande), basati su tabelle CREA/USDA o sulle etichette più diffuse in Italia. Carboidrati netti (senza fibra).",
      messages: [{ role: "user", content: "Alimento: " + query }],
    }));
    if (res.stop_reason === "refusal") throw new Error("Non riesco a calcolare questo alimento.");
    const block = res.content.find((b) => b.type === "text");
    const out = JSON.parse(block.text);
    return {
      name: out.name, emoji: out.emoji, cat: out.category, basis: out.basis,
      kcal: Math.round(out.kcal), p: round1(out.protein), c: round1(out.carbs), f: round1(out.fat),
      portion: out.portion_g || 100, note: out.note, confidence: out.confidence,
    };
  }
  const round1 = (n) => Math.round((+n || 0) * 10) / 10;

  /* =========================================================
     Lettura di una scheda da PDF (anche scansionata)
     ========================================================= */
  async function parsePlanPdf(base64) {
    const client = await getClient();
    const { model } = settings();
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Titolo della scheda se presente, es. 'Scheda Push Pull Legs'; stringa vuota se assente" },
        general_notes: { type: "string", description: "Indicazioni generali della scheda: alternanza delle settimane/schede, riscaldamento, recuperi generali, progressione, frequenza. Stringa vuota se assenti" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Nome del giorno/seduta come scritto, es. 'Push A' o 'Giorno A — Petto e tricipiti'" },
              notes: { type: "string", description: "Indicazioni che valgono per tutta la seduta; stringa vuota se assenti" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nome dell'esercizio, senza le alternative tra parentesi" },
                    sets: { type: "integer" },
                    reps: { type: "string", description: "Ripetizioni come scritte, compresa l'unità e 'per lato'/'per gamba', es. '8-10', '8 per lato', '30-40s per lato', '30m', 'max'" },
                    rest_sec: { type: "integer", description: "Recupero tra le serie in secondi SOLO se scritto nella scheda (per l'esercizio, la seduta o in generale); 0 se non indicato" },
                    rest_after_sec: { type: "integer", description: "Recupero prima dell'esercizio successivo in secondi SOLO se scritto nella scheda; 0 se non indicato" },
                    weight_kg: { type: "number", description: "Carico indicato nella scheda; 0 se assente" },
                    notes: { type: "string", description: "Come eseguirlo: alternative ('In alternativa: leg curl'), % del massimale, tempo di esecuzione, RPE/RIR, superserie/circuiti, parti extra (es. '+ 3 sprint'). Stringa vuota se assenti" },
                  },
                  required: ["name", "sets", "reps", "rest_sec", "rest_after_sec", "weight_kg", "notes"],
                  additionalProperties: false,
                },
              },
            },
            required: ["label", "notes", "exercises"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "general_notes", "days"],
      additionalProperties: false,
    };
    const res = await client.beta.messages.create(Object.assign(baseParams(model), {
      max_tokens: 16000,
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Questa è una scheda di allenamento. Estrai tutti i giorni/sedute e, per ognuno, gli esercizi in ordine con serie, ripetizioni, recuperi, eventuale carico e note su come eseguirli. Mantieni i nomi degli esercizi come scritti (correggi solo refusi evidenti). Se una superserie o un circuito raggruppa più esercizi, elencali separatamente e scrivilo nelle note. Non inventare i recuperi: se la scheda non li indica metti 0. Riporta tutte le indicazioni scritte (alternanza tra schede o settimane, note, avvertenze) nelle note generali, della seduta o dell'esercizio a cui si riferiscono." },
        ],
      }],
    }));
    if (res.stop_reason === "refusal") throw new Error("Non riesco a leggere questo PDF.");
    const block = res.content.find((b) => b.type === "text");
    return JSON.parse(block.text);
  }

  /* =========================================================
     Lettura di una dieta da PDF (anche scansionata)
     ========================================================= */
  const WEEKDAY_ENUM = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica", ""];

  async function parseDietPdf(base64) {
    const client = await getClient();
    const { model } = settings();
    const item = {
      type: "object",
      properties: {
        name: { type: "string", description: "Alimento come scritto, iniziale maiuscola" },
        grams: { type: "number", description: "Grammi (o ml) indicati; se è indicato un numero di pezzi o nulla, stima i grammi di una porzione tipica" },
        kcal: { type: "number", description: "Calorie della porzione indicata (non per 100 g)" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        emoji: { type: "string" },
        alternatives: { type: "string", description: "Alternative/sostituzioni indicate nella dieta per questo alimento; stringa vuota se assenti" },
      },
      required: ["name", "grams", "kcal", "protein_g", "carbs_g", "fat_g", "emoji", "alternatives"],
      additionalProperties: false,
    };
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", description: "Titolo breve della dieta, es. 'Dieta ipercalorica — Dott.ssa Rossi'" },
        daily_targets: {
          type: "object",
          description: "Target giornalieri se scritti nel PDF, altrimenti 0",
          properties: { kcal: { type: "number" }, protein_g: { type: "number" }, carbs_g: { type: "number" }, fat_g: { type: "number" } },
          required: ["kcal", "protein_g", "carbs_g", "fat_g"],
          additionalProperties: false,
        },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "es. 'Lunedì', 'Giorno di allenamento', 'Ogni giorno'" },
              weekday: { type: "string", enum: WEEKDAY_ENUM, description: "Giorno della settimana se il giorno ne corrisponde a uno, altrimenti stringa vuota" },
              meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    meal: { type: "string", enum: MEAL_ENUM, description: "Pasto del diario in cui rientra (merenda/spuntino → spuntini)" },
                    label: { type: "string", description: "Nome del pasto come scritto, es. 'Spuntino di metà mattina'" },
                    items: { type: "array", items: item },
                  },
                  required: ["meal", "label", "items"],
                  additionalProperties: false,
                },
              },
            },
            required: ["label", "weekday", "meals"],
            additionalProperties: false,
          },
        },
        notes: { type: "string", description: "Indicazioni generali utili (acqua, condimenti, regole); stringa vuota se assenti" },
      },
      required: ["name", "daily_targets", "days", "notes"],
      additionalProperties: false,
    };
    const res = await client.beta.messages.create(Object.assign(baseParams(model), {
      max_tokens: 32000,
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: "Sei un nutrizionista. Valori nutrizionali: usa quelli scritti nel PDF se presenti, altrimenti stimali da tabelle CREA/USDA per la grammatura indicata (crudo se non specificato). Carboidrati netti.",
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Questa è una dieta/piano alimentare. Estrai i giorni e, per ognuno, i pasti in ordine con tutti gli alimenti e le grammature. Se la dieta è uguale tutti i giorni restituisci un solo giorno chiamato 'Ogni giorno'. Se distingue giorni di allenamento e riposo, crea un giorno per ciascuno. Quando per un alimento sono proposte alternative («oppure», «a scelta»), usa la prima come alimento e scrivi le altre in alternatives. Mantieni i nomi come scritti (correggi solo refusi evidenti)." },
        ],
      }],
    }));
    if (res.stop_reason === "refusal") throw new Error("Non riesco a leggere questo PDF.");
    if (res.stop_reason === "max_tokens") throw new Error("La dieta è troppo lunga da leggere in una volta.");
    const block = res.content.find((b) => b.type === "text");
    return JSON.parse(block.text);
  }

  /* =========================================================
     Cosa ho mangiato: da testo libero, PDF o foto (piatto o
     confezione) a una lista di alimenti con valori stimati
     ========================================================= */
  // input: { text } | { pdf: base64 } | { image: base64, mediaType }
  async function analyzeFoodLog(input) {
    const client = await getClient();
    const { model } = settings();
    const schema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome del piatto o prodotto in italiano, iniziale maiuscola (con la marca se visibile)" },
              meal: { type: "string", enum: MEAL_ENUM.concat(["non_indicato"]), description: "Pasto se indicato o deducibile, altrimenti non_indicato" },
              grams: { type: "number", description: "Grammi (o ml) della porzione mangiata; stimali se non indicati" },
              kcal: { type: "number", description: "Calorie della porzione (non per 100 g)" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              emoji: { type: "string" },
              source: { type: "string", enum: ["indicato", "etichetta", "stima"], description: "indicato = valori scritti dall'utente/documento; etichetta = letti dalla tabella nutrizionale della confezione; stima = stimati" },
            },
            required: ["name", "meal", "grams", "kcal", "protein_g", "carbs_g", "fat_g", "emoji", "source"],
            additionalProperties: false,
          },
        },
        note: { type: "string", description: "Una frase breve per l'utente (es. porzione ipotizzata, cosa non si vedeva bene); stringa vuota se non serve" },
      },
      required: ["items", "note"],
      additionalProperties: false,
    };
    let content;
    if (input.image) {
      content = [
        { type: "image", source: { type: "base64", media_type: input.mediaType || "image/jpeg", data: input.image } },
        { type: "text", text: "Questa è la foto di cosa ho mangiato: un piatto oppure una confezione. Se è un piatto, riconosci gli alimenti e stima porzioni e valori (un elemento per componente distinto, o uno solo se è un piatto unico come una pizza). Se è una confezione, riconosci il prodotto e, se è leggibile la tabella nutrizionale, usa quei valori (source=etichetta) per una porzione tipica o per il contenuto della confezione se è monoporzione." + (input.text ? "\nNota dell'utente: " + input.text : "") },
      ];
    } else if (input.pdf) {
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdf } },
        { type: "text", text: "Questo documento contiene cosa ho mangiato. Estrai ogni alimento o piatto con porzione e valori nutrizionali: usa quelli scritti se presenti, altrimenti stimali." },
      ];
    } else {
      content = "Ecco cosa ho mangiato. Estrai ogni alimento o piatto con porzione e valori nutrizionali: usa quelli che ho scritto se presenti (anche parziali), altrimenti stimali.\n\n" + input.text;
    }
    const res = await client.beta.messages.create(Object.assign(baseParams(model), {
      max_tokens: 16000,
      output_config: { effort: input.image ? "medium" : "low", format: { type: "json_schema", schema } },
      system: "Sei un nutrizionista. Valori nutrizionali medi realistici basati su tabelle CREA/USDA, etichette dei prodotti più diffusi in Italia e porzioni tipiche italiane (ristorante o casa). Carboidrati netti. Se l'utente indica solo le calorie, stima le macro coerenti con quelle calorie.",
      messages: [{ role: "user", content }],
    }));
    if (res.stop_reason === "refusal") throw new Error("Non riesco ad analizzare questo contenuto.");
    const block = res.content.find((b) => b.type === "text");
    const out = JSON.parse(block.text);
    return {
      note: out.note || "",
      items: (out.items || []).filter((it) => it.name).map((it) => ({
        name: it.name, meal: MEAL_ENUM.includes(it.meal) ? it.meal : "", grams: Math.round(it.grams) || 0,
        kcal: Math.round(it.kcal), p: round1(it.protein_g), c: round1(it.carbs_g), f: round1(it.fat_g), emoji: it.emoji || "🍽️", source: it.source,
      })),
    };
  }

  async function testKey() {
    const client = await getClient();
    const { model } = settings();
    await client.beta.messages.create(Object.assign(baseParams(model), {
      max_tokens: 2000,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Rispondi solo: ok" }],
    }));
    return true;
  }

  window.GA.ai = { MODELS, DEFAULT_MODEL, settings, saveSettings, isConfigured, chat, lookupFood, parsePlanPdf, parseDietPdf, analyzeFoodLog, testKey, friendlyError, buildPlanPreservingIds, runTool };
})();
