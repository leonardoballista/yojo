/* ===========================================================
   coach.js — "coach AI": motore a regole che usa i dati reali
   dell'utente per generare piani, decidere la progressione,
   suggerire ricette e rispondere/agire in chat.

   Nota: non è collegato a un modello linguistico esterno — è un
   motore euristico locale che ragiona sui dati salvati in app.
   Tutte le sue "decisioni" sono trasparenti e spiegabili.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const calc = () => window.GA.calc;
  const db = () => window.GA.db;

  function todayISO(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function weeksSince(ts) {
    if (!ts) return 0;
    return Math.floor((Date.now() - ts) / (7 * 24 * 3600 * 1000));
  }

  /* ---------- Progressione allenamento ---------- */
  // Decide il prossimo peso/reps suggerito per un esercizio in base al feedback
  // e all'obiettivo di allenamento (forza / ipertrofia / resistenza).
  function nextSuggestion({ lastWeight, lastReps, feedback, trainingGoal, repsTarget }) {
    lastWeight = lastWeight || 0;
    const goal = trainingGoal || "ipertrofia";
    let deltaKg = 0;
    let note = "";

    if (feedback === "facile") {
      deltaKg = goal === "forza" ? 2.5 : goal === "resistenza" ? 1 : 2;
      note = "Ultima volta era facile: aumento il carico per continuare a progredire.";
    } else if (feedback === "difficile") {
      deltaKg = goal === "forza" ? -2.5 : -1.5;
      note = "Ultima volta era difficile: riduco leggermente per consolidare la tecnica.";
    } else {
      // giusto / RIR 2
      deltaKg = goal === "resistenza" ? 0 : 0.5 * (goal === "forza" ? 1 : 1);
      note = "Era il carico giusto: piccolo incremento per continuare a progredire gradualmente.";
      if (goal === "ipertrofia") note = "Era il carico giusto: prova ad aggiungere una ripetizione, poi aumenteremo il peso.";
    }

    const suggestedWeight = Math.max(0, Math.round((lastWeight + deltaKg) * 2) / 2);
    return { suggestedWeight, note };
  }

  function feedbackToRIR(feedback) {
    if (feedback === "facile") return 4;
    if (feedback === "difficile") return 0;
    return 2;
  }

  /* ---------- Deload ---------- */
  function checkDeload(plan, settings) {
    if (!plan) return null;
    const reminderWeeks = (settings && settings.deloadReminderWeeks) || 7;
    const weeksSinceStart = weeksSince(plan.startedAt);
    const weeksSinceDeload = plan.lastDeloadWeek ? weeksSinceStart - plan.lastDeloadWeek : weeksSinceStart;
    if (weeksSinceDeload >= reminderWeeks) {
      return {
        due: true,
        message:
          "Sono passate " + weeksSinceDeload + " settimane dall'ultimo scarico. Ti consiglio una settimana di scarico: stesso schema ma volume -40% e carichi -20%, per far recuperare articolazioni e sistema nervoso prima di spingere di nuovo.",
      };
    }
    return { due: false };
  }

  /* ---------- Ricette / suggerimenti pasto ---------- */
  function remainingMacros(data) {
    const day = data.nutrition.mealLog[todayISO()] || {};
    let kcal = 0, p = 0, c = 0, f = 0;
    Object.values(day).forEach((items) => {
      (items || []).forEach((it) => {
        kcal += it.kcal; p += it.p; c += it.c; f += it.f;
      });
    });
    const t = data.targets;
    return {
      kcal: Math.max(t.kcal - kcal, 0),
      p: Math.max(t.protein - p, 0),
      c: Math.max(t.carbs - c, 0),
      f: Math.max(t.fat - f, 0),
      consumed: { kcal, p, c, f },
    };
  }

  function suggestRecipe(data, opts) {
    opts = opts || {};
    const rem = remainingMacros(data);
    const db_ = calc().FOOD_DB;
    if (rem.kcal < 80) {
      return { title: "Giornata quasi completa", text: "Ti restano solo circa " + rem.kcal + " kcal: una porzione di frutta o yogurt magro è l'ideale per chiudere in equilibrio.", items: [] };
    }
    // scegli una fonte proteica, una di carboidrati e un contorno di verdura, scalate sui macro rimanenti
    let proteinFood = db_.find((f) => f.cat === "carni" && f.id === "f_pollo") || db_.find((f) => f.cat === "carni");
    let carbFood = db_.find((f) => f.id === "f_riso") || db_.find((f) => f.cat === "carboidrati");
    let vegFood = db_.find((f) => f.cat === "verdura");

    if (opts.wantsFish) proteinFood = db_.find((f) => f.cat === "pesce") || proteinFood;
    if (opts.wantsVegetarian) proteinFood = db_.find((f) => f.id === "f_uova") || proteinFood;

    const proteinGrams = Math.min(250, Math.max(80, Math.round((rem.p * 100) / proteinFood.p)));
    const carbGrams = Math.min(150, Math.max(40, Math.round((rem.c * 100) / carbFood.c)));

    const pPortion = calc().perGrams(proteinFood, proteinGrams);
    const cPortion = calc().perGrams(carbFood, carbGrams);
    const vPortion = calc().perGrams(vegFood, 150);

    const totalKcal = pPortion.kcal + cPortion.kcal + vPortion.kcal;

    const title = proteinFood.name + " con " + carbFood.name.toLowerCase() + " e " + vegFood.name.toLowerCase();
    const text =
      "Ti mancano circa " + rem.kcal + " kcal, " + rem.p + "g proteine, " + rem.c + "g carboidrati e " + rem.f + "g grassi oggi.\n\n" +
      "Ti propongo: " + proteinGrams + "g di " + proteinFood.name.toLowerCase() + " + " + carbGrams + "g di " + carbFood.name.toLowerCase() + " (peso a crudo) + 150g di " + vegFood.name.toLowerCase() + ".\n" +
      "Totale piatto: ~" + totalKcal + " kcal, " + Math.round(pPortion.p + cPortion.p + vPortion.p) + "g proteine, " + Math.round(pPortion.c + cPortion.c + vPortion.c) + "g carboidrati, " + Math.round(pPortion.f + cPortion.f + vPortion.f) + "g grassi.";

    return {
      title,
      text,
      items: [
        { food: proteinFood, grams: proteinGrams },
        { food: carbFood, grams: carbGrams },
        { food: vegFood, grams: 150 },
      ],
    };
  }

  /* ---------- Chat: parsing comandi + risposte ---------- */
  // Ritorna { reply: string, actions: [{type, ...}] } — le actions vengono
  // applicate dal chiamante (chat.js) ai dati dell'app.
  function handleMessage(text, data) {
    const t = text.trim();
    const low = t.toLowerCase();
    const actions = [];
    let reply = null;

    // --- Cambia obiettivo / fabbisogno ---
    if (/obiettivo/.test(low) && (/bulk|massa/.test(low))) {
      actions.push({ type: "set_goal", goal: "bulk" });
      reply = "Fatto: ho impostato l'obiettivo su bulk e ricalcolato calorie e macro di conseguenza.";
    } else if (/obiettivo/.test(low) && (/cut|definizione|dimagr/.test(low))) {
      actions.push({ type: "set_goal", goal: "cut" });
      reply = "Fatto: obiettivo impostato su cut (deficit calorico), macro aggiornate.";
    } else if (/obiettivo/.test(low) && /mantenimento/.test(low)) {
      actions.push({ type: "set_goal", goal: "mantenimento" });
      reply = "Fatto: obiettivo impostato su mantenimento, macro aggiornate.";
    } else if (/(imposta|cambia|metti).*(calorie|kcal)/.test(low)) {
      const m = low.match(/(\d{3,5})/);
      if (m) {
        actions.push({ type: "set_kcal", kcal: parseInt(m[1], 10) });
        reply = "Ho impostato il fabbisogno a " + m[1] + " kcal/giorno e ridistribuito le macro (25% grassi, resto tra proteine e carboidrati).";
      }
    }

    // --- Modifica peso di un esercizio ---
    if (!reply && /aumenta|imposta|metti|cambia/.test(low) && /peso/.test(low)) {
      const mWeight = low.match(/peso\s+(?:di\s+|per\s+|dell[oa']?\s+)?([a-zà-ù'\s]+?)\s+(?:a|di)?\s*(\d{1,3}(?:[.,]\d)?)\s*kg/i);
      if (mWeight) {
        const exName = mWeight[1].trim();
        const weight = parseFloat(mWeight[2].replace(",", "."));
        actions.push({ type: "set_exercise_weight", exerciseName: exName, weight });
        reply = "Ok, ho impostato il peso suggerito per \"" + exName + "\" a " + weight + " kg per la prossima sessione.";
      }
    }

    // --- Genera / rigenera scheda ---
    if (!reply && /(genera|crea|nuova)\s+scheda/.test(low)) {
      actions.push({ type: "request_generate_plan" });
      reply = "Perfetto, apro la generazione guidata della scheda: dimmi giorni disponibili e attrezzatura nella sezione Palestra, oppure scrivimi qui ad es. \"genera scheda 4 giorni palestra completa forza\".";
      const daysM = low.match(/(\d)\s*giorni/);
      const equipM = /corpo libero|casa|manubri/.test(low) ? "corpo_libero" : /palestra completa|attrezzat/.test(low) ? "completa" : null;
      const goalM = /forza/.test(low) ? "forza" : /resistenza/.test(low) ? "resistenza" : /ipertrofia|massa/.test(low) ? "ipertrofia" : null;
      if (daysM && (equipM || goalM)) {
        actions.length = 0;
        actions.push({
          type: "generate_plan",
          daysPerWeek: parseInt(daysM[1], 10),
          equipment: equipM || "completa",
          trainingGoal: goalM || "ipertrofia",
        });
        reply = "Genero subito una nuova scheda su misura, la trovi nella sezione Palestra.";
      }
    }

    // --- Ricetta ---
    if (!reply && /(ricett|cosa (mi )?manca|cosa mangio|cosa posso mangiare)/.test(low)) {
      const rec = suggestRecipe(data, {
        wantsFish: /pesce/.test(low),
        wantsVegetarian: /veg|senza carne|uova/.test(low),
      });
      reply = rec.text;
      actions.push({ type: "propose_recipe", recipe: rec });
    }

    // --- Domande sui macro rimanenti ---
    if (!reply && /(quante|quanto).*(proteine|carbo|grassi|calorie|kcal).*(manca|rimang|restan)/.test(low)) {
      const rem = remainingMacros(data);
      reply =
        "Oggi ti restano circa " + rem.kcal + " kcal, " + rem.p + "g proteine, " + rem.c + "g carboidrati e " + rem.f + "g grassi rispetto al tuo obiettivo giornaliero.";
    }

    // --- Domanda 1RM ---
    if (!reply && /massimale|1rm/.test(low)) {
      reply = "Il massimale stimato lo calcolo con la formula di Epley (peso × (1 + reps/30)) a partire dalla tua ultima serie pesante. Lo trovi nella scheda dell'esercizio in Palestra, sotto lo storico.";
    }

    // --- Deload ---
    if (!reply && /(scarico|deload)/.test(low)) {
      const dl = checkDeload(data.plan, data.settings);
      reply = dl && dl.due ? dl.message : "Non è ancora il momento di uno scarico: continua a seguire la scheda, te lo segnalerò io quando sarà il momento (di solito ogni 6-8 settimane).";
    }

    // --- Fallback generico ---
    if (!reply) {
      reply = fallbackReply(low, data);
    }

    return { reply, actions };
  }

  function fallbackReply(low, data) {
    if (/proteine/.test(low)) {
      return "Le proteine servono a mantenere e costruire massa muscolare: con il tuo obiettivo attuale punta a circa " + data.targets.protein + "g al giorno, distribuite nei vari pasti.";
    }
    if (/carboidrat/.test(low)) {
      return "I carboidrati sono la principale fonte di energia per gli allenamenti: il tuo target giornaliero è circa " + data.targets.carbs + "g.";
    }
    if (/grass/.test(low)) {
      return "I grassi buoni (olio EVO, frutta secca, pesce azzurro) sono importanti per gli ormoni: punta a circa " + data.targets.fat + "g al giorno.";
    }
    if (/ciao|salve|buongiorno|buonasera/.test(low)) {
      return "Ciao! Sono Enrico, il tuo coach. Posso aiutarti con allenamento, alimentazione, o modificare scheda, pesi, ricette e obiettivi: basta chiedere.";
    }
    return "Posso rispondere a domande su allenamento e alimentazione, oppure modificare direttamente scheda, pesi, ricette salvate e il tuo fabbisogno: dimmi cosa ti serve (es. \"aumenta il peso della panca a 60kg\", \"imposta obiettivo cut\", \"dammi una ricetta\").";
  }

  /* ---------- Messaggio di riepilogo post-sessione ---------- */
  function sessionSummaryMessage(entries, trainingGoal) {
    const ups = entries.filter((e) => e.feedback === "facile").length;
    const downs = entries.filter((e) => e.feedback === "difficile").length;
    let msg = "Sessione registrata. ";
    if (ups > downs) msg += "È andata bene: alla prossima sessione aumenterò leggermente i carichi dove segnato \"facile\".";
    else if (downs > ups) msg += "Qualche esercizio è stato duro: alla prossima sessione modererò i carichi dove segnato \"difficile\".";
    else msg += "Buon lavoro, carichi confermati per la prossima sessione con piccoli aggiustamenti mirati.";
    return msg;
  }

  window.GA.coach = {
    nextSuggestion,
    feedbackToRIR,
    checkDeload,
    remainingMacros,
    suggestRecipe,
    handleMessage,
    sessionSummaryMessage,
    todayISO,
    weeksSince,
  };
})();
