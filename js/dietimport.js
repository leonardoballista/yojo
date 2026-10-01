/* ===========================================================
   dietimport.js — la dieta del nutrizionista dentro Yojo.
   Importa una dieta da PDF, con lo stesso flusso della scheda:
   1) Se Enrico AI è configurato, Claude legge il PDF (anche
      scansionato) e restituisce giorni/pasti/alimenti con macro.
   2) Altrimenti (o in caso di errore) estraiamo il testo con
      pdf.js e lo interpretiamo con un parser euristico,
      calcolando le macro dal catalogo alimenti.
   L'utente rivede il risultato in un editor, poi la dieta
   compare nella sezione Cibo e ogni pasto si segna con un tocco.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const ai = () => window.GA.ai;
  const calc = () => window.GA.calc;
  const coach = () => window.GA.coach;
  const foods = () => window.GA.foods;
  const pdf = () => window.GA.pdfImport;

  const MEAL_IDS = ["colazione", "pranzo", "cena", "spuntini"];
  const MEAL_LABELS = { colazione: "Colazione", pranzo: "Pranzo", cena: "Cena", spuntini: "Spuntino" };
  const WEEKDAYS = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

  let selectedDayId = null;

  /* ---------------- Sheet: importa da PDF ---------------- */
  function open() {
    const aiOn = ai().isConfigured();
    const html =
      '<div class="sheet-title">' + ui().icon("file") + " Importa la dieta</div>" +
      '<label class="dropzone" id="diet-drop">' +
      '<div style="font-size:40px;margin-bottom:6px;">🥗</div>' +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:18px;">Scegli il PDF della dieta</div>' +
      '<div class="small muted" style="margin-top:4px;">o trascinalo qui</div>' +
      '<input type="file" id="diet-file" accept="application/pdf,.pdf" hidden />' +
      "</label>" +
      '<div class="key-status ' + (aiOn ? "ok" : "no") + '" style="margin-top:14px;">' + (aiOn
        ? "✨ Enrico AI attivo: legge anche PDF scansionati e tabelle, e calcola calorie e macro di ogni alimento."
        : "⚡ Modalità base: riconosco diete scritte come “Pasta 80 g” sotto a Colazione, Pranzo, Cena… Per PDF complessi o scansionati attiva Enrico AI dal menu.") + "</div>" +
      '<div id="diet-progress" style="margin-top:14px;"></div>';
    const overlay = ui().openSheet(html);
    const input = overlay.querySelector("#diet-file");
    const drop = overlay.querySelector("#diet-drop");
    input.addEventListener("change", () => input.files[0] && handleFile(input.files[0], overlay));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f, overlay); });
  }

  function steps(overlay, active, labels) {
    const box = overlay.querySelector("#diet-progress");
    if (!box) return;
    box.innerHTML = labels.map((l, i) =>
      '<div class="parse-step ' + (i < active ? "on ok" : i === active ? "on" : "") + '"><div class="ps-dot">' + (i < active ? ui().icon("check") : "") + "</div>" + l + "</div>"
    ).join("");
  }

  async function handleFile(file, overlay) {
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { ui().toast("Seleziona un file PDF"); return; }
    if (file.size > pdf().MAX_BYTES) { ui().toast("Il PDF è troppo grande (max 25 MB)"); return; }
    const labels = ["Apro “" + file.name + "”", ai().isConfigured() ? "Enrico legge la dieta e calcola le macro" : "Riconosco pasti e alimenti", "Preparo la tua dieta"];
    steps(overlay, 0, labels);
    const buf = await file.arrayBuffer();
    steps(overlay, 1, labels);

    let plan = null;
    let via = "local";
    if (ai().isConfigured()) {
      try {
        plan = fromAi(await ai().parseDietPdf(pdf().toBase64(buf)));
        via = "ai";
      } catch (err) {
        ui().toast(ai().friendlyError(err) + " Provo in locale…", 3500);
      }
    }
    if (!plan || !plan.days.length) {
      try {
        plan = parseLines(await pdf().extractLines(buf.slice(0)));
      } catch (err) {
        steps(overlay, 1, labels);
        ui().toast("Non riesco a leggere il PDF: " + (err.message || err), 4000);
        return;
      }
    }
    steps(overlay, 2, labels);

    if (!plan.days.length) {
      overlay.querySelector("#diet-progress").innerHTML =
        '<div class="card tint-pink flat"><p class="small" style="font-weight:600;">Non ho trovato pasti e alimenti nel PDF' +
        (ai().isConfigured() ? "." : ": forse è scansionato o ha un formato particolare. Attiva Enrico AI dal menu e riprova.") + "</p></div>";
      return;
    }
    const nItems = plan.days.reduce((a, d) => a + d.meals.reduce((b, m) => b + m.items.length, 0), 0);
    const unknown = plan.days.reduce((a, d) => a + d.meals.reduce((b, m) => b + m.items.filter((it) => it.unknown).length, 0), 0);
    plan.source = via;
    setTimeout(() => openEditor(plan, {
      banner: (via === "ai" ? "✨ Enrico ha letto " : "Ho trovato ") + plan.days.length + (plan.days.length === 1 ? " giorno, " : " giorni, ") + nItems + " alimenti." +
        (unknown ? " " + unknown + " non li ho trovati nel catalogo (segnati con ?): correggi il nome o le calorie." : "") +
        " Controlla e salva: la ritroverai ogni giorno nella sezione Cibo.",
    }), 350);
  }

  /* ---------------- Normalizzazione dei dati ---------------- */
  const r1 = (n) => Math.round((+n || 0) * 10) / 10;

  function makeItem(o) {
    const grams = Math.round(+o.grams) > 0 ? Math.round(+o.grams) : 100;
    return {
      name: String(o.name || "").trim(),
      grams,
      kcal: Math.round(+o.kcal || 0), p: r1(o.p), c: r1(o.c), f: r1(o.f),
      emoji: o.emoji || "🍽️",
      cat: o.cat || "altro",
      foodId: o.foodId,
      alternatives: String(o.alternatives || "").trim(),
      unknown: !!o.unknown,
    };
  }

  function fromAi(res) {
    const t = res.daily_targets || {};
    return {
      name: res.name || "La mia dieta",
      notes: res.notes || "",
      targets: t.kcal > 0 ? { kcal: Math.round(t.kcal), protein: Math.round(t.protein_g || 0), carbs: Math.round(t.carbs_g || 0), fat: Math.round(t.fat_g || 0) } : null,
      days: (res.days || []).map((d) => ({
        id: db().uid("dd"),
        label: d.label || "Ogni giorno",
        weekday: d.weekday || "",
        meals: (d.meals || []).map((m) => ({
          meal: MEAL_IDS.includes(m.meal) ? m.meal : "spuntini",
          label: m.label || MEAL_LABELS[m.meal] || "Pasto",
          items: (m.items || []).filter((it) => it.name).map((it) => makeItem({
            name: it.name, grams: it.grams, kcal: it.kcal, p: it.protein_g, c: it.carbs_g, f: it.fat_g, emoji: it.emoji, alternatives: it.alternatives,
          })),
        })).filter((m) => m.items.length),
      })).filter((d) => d.meals.length),
    };
  }

  /* ---------------- Parser euristico (senza AI) ---------------- */
  const DAY_RE = /^\s*(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica|giorno\s*\d+|giorno\s+(?:di\s+)?(?:allenamento|riposo|on|off)|giornata\s+(?:di\s+)?(?:allenamento|riposo)|day\s*\d+)(?![a-zà-ù])/i;
  const MEAL_RE = /^\s*(?:(prima\s+)?colazione|pranzo|cena|spuntin[oi]|merenda|snack|pre[\s-]?(?:workout|allenamento|nanna)|post[\s-]?(?:workout|allenamento)|dopo\s*cena)\b(?:\s+(?:di|del|della|a|metà|meta|mattina|mattutino|pomeriggio|pomeridiano|sera|serale|\([^)]*\)))*\s*:?/i;
  const QTY_RE = /(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|ml|cl)\b\.?/i;
  const PIECES_RE = /^(\d{1,2}|un|una|uno|mezz[oa])\s+(.{3,})$/i;
  const ALT_RE = /^\s*(oppure|in alternativa|o in alternativa|alternativa)\b[:\s]*/i;
  const STOP = new Set(["di", "del", "della", "dei", "delle", "con", "al", "alla", "allo", "ai", "e", "in", "da", "a", "o", "tipo", "circa", "fresco", "fresca"]);

  function matchFood(name) {
    const all = foods().DB.concat((db().getData().nutrition.customFoods || []).map((f) => Object.assign({ custom: true }, f)));
    const words = foods().normalize(name).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
    for (let n = words.length; n >= 1; n--) {
      const res = foods().search(words.slice(0, n).join(" "), all);
      if (res.length) return res[0];
    }
    const long = words.filter((w) => w.length >= 4);
    for (const w of long) {
      const res = foods().search(w, all);
      if (res.length) return res[0];
    }
    return null;
  }

  function itemFromText(text) {
    let s = text.replace(/^[\s\-–•·*]+/, "").replace(/\s+/g, " ").trim();
    if (!s || !/[a-zà-ù]{3}/i.test(s)) return null;
    let grams = null, name = s;
    const q = s.match(QTY_RE);
    if (q) {
      grams = parseFloat(q[1].replace(",", ".")) * (/^cl$/i.test(q[2]) ? 10 : 1);
      const before = s.slice(0, q.index).trim(), after = s.slice(q.index + q[0].length).trim();
      name = /[a-zà-ù]{3}/i.test(before) ? before : after.replace(/^(di|d')\s*/i, "");
    } else {
      const pc = s.match(PIECES_RE);
      if (!pc) return null;
      const cnt = /^\d+$/.test(pc[1]) ? parseInt(pc[1], 10) : /^mezz/i.test(pc[1]) ? 0.5 : 1;
      name = pc[2];
      const food = matchFood(name);
      grams = cnt * ((food && food.portion) || 50);
    }
    name = name.replace(/[:\-–,;.]+$/, "").replace(/\(.*?\)/g, "").trim();
    if (!/[a-zà-ù]{3}/i.test(name) || !grams) return null;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const food = matchFood(name);
    if (food) {
      const m = calc().perGrams(food, grams);
      return makeItem({ name, grams, kcal: m.kcal, p: m.p, c: m.c, f: m.f, emoji: food.emoji || foods().category(food.cat).emoji, cat: food.cat, foodId: food.id });
    }
    return makeItem({ name, grams, unknown: true });
  }

  function mealIdFromHeader(h) {
    const n = foods().normalize(h);
    if (/colazione/.test(n)) return "colazione";
    if (/pranzo/.test(n)) return "pranzo";
    if (/^\s*cena/.test(n)) return "cena";
    return "spuntini";
  }

  function weekdayOf(label) {
    const n = foods().normalize(label);
    return WEEKDAYS.find((w) => n.startsWith(w.slice(0, 5))) || "";
  }

  function parseLines(lines) {
    const days = [];
    let day = null, meal = null, lastItem = null;
    const ensureDay = () => {
      if (!day) { day = { id: db().uid("dd"), label: "Ogni giorno", weekday: "", meals: [] }; days.push(day); }
      return day;
    };
    const ensureMeal = () => {
      if (!meal) { meal = { meal: "spuntini", label: "Altro", items: [] }; ensureDay().meals.push(meal); }
      return meal;
    };
    const addItems = (text) => {
      text.split(/\s*[;,+|]\s*|\s+\+\s+/).forEach((part) => {
        const alt = part.match(ALT_RE);
        if (alt && lastItem) {
          const t = part.slice(alt[0].length).trim();
          if (t) lastItem.alternatives = (lastItem.alternatives ? lastItem.alternatives + ", " : "") + t;
          return;
        }
        const it = itemFromText(part);
        if (it) { ensureMeal().items.push(it); lastItem = it; }
      });
    };

    lines.forEach((raw) => {
      const line = raw.replace(/\s+/g, " ").trim();
      if (!line || line.length > 220) return;

      const dm = line.match(DAY_RE);
      if (dm && line.length < 50 && !QTY_RE.test(line)) {
        const label = line.replace(/[:\-–|]+$/g, "").replace(/\|/g, " ").trim();
        day = { id: db().uid("dd"), label: label.charAt(0).toUpperCase() + label.slice(1), weekday: weekdayOf(label), meals: [] };
        days.push(day);
        meal = null; lastItem = null;
        return;
      }
      const mm = line.match(MEAL_RE);
      if (mm) {
        const header = mm[0].replace(/[:\s]+$/, "").trim();
        meal = { meal: mealIdFromHeader(header), label: header.charAt(0).toUpperCase() + header.slice(1), items: [] };
        ensureDay().meals.push(meal);
        lastItem = null;
        const rest = line.slice(mm[0].length).replace(/^[\s:|\-–]+/, "");
        if (rest) addItems(rest);
        return;
      }
      const alt = line.match(ALT_RE);
      if (alt && lastItem) {
        lastItem.alternatives = (lastItem.alternatives ? lastItem.alternatives + ", " : "") + line.slice(alt[0].length).trim();
        return;
      }
      addItems(line);
    });

    days.forEach((d) => { d.meals = d.meals.filter((m) => m.items.length); });
    return { name: "La mia dieta", notes: "", targets: null, days: days.filter((d) => d.meals.length) };
  }

  /* ---------------- Editor di revisione ---------------- */
  function openEditor(plan, opts) {
    opts = opts || {};
    plan = JSON.parse(JSON.stringify(plan));
    // valori per grammo: servono a ricalcolare le macro quando cambi i grammi
    plan.days.forEach((d) => d.meals.forEach((m) => m.items.forEach(withRates)));
    let useTargets = !!plan.targets;

    const html =
      '<div class="sheet-title">' + ui().icon("edit") + " Controlla la dieta</div>" +
      (opts.banner ? '<div class="card tint-lime flat" style="padding:12px 14px;margin-bottom:14px;"><p class="small" style="font-weight:600;line-height:1.5;">' + ui().escapeHtml(opts.banner) + "</p></div>" : "") +
      '<div class="field"><label>Nome</label><input type="text" id="dr-name" value="' + ui().escapeHtml(plan.name) + '" /></div>' +
      (plan.targets
        ? '<label class="card flat tint-sun" style="display:flex;gap:10px;align-items:center;padding:12px 14px;margin-bottom:14px;"><input type="checkbox" id="dr-targets" checked style="width:20px;height:20px;" /><span class="small" style="font-weight:700;">Usa i target della dieta: ' + plan.targets.kcal + " kcal · P" + plan.targets.protein + " C" + plan.targets.carbs + " G" + plan.targets.fat + "</span></label>"
        : "") +
      '<p class="small muted" style="margin:0 0 10px;font-weight:700;">Per ogni alimento: nome · grammi · kcal. Cambiando i grammi le macro si ricalcolano.</p>' +
      '<div id="dr-body"></div>' +
      '<button class="btn" id="dr-save" style="margin-top:8px;">' + ui().icon("check") + " Salva la dieta</button>";
    const overlay = ui().openSheet(html);
    const body = overlay.querySelector("#dr-body");

    overlay.querySelector("#dr-name").addEventListener("input", (e) => { plan.name = e.target.value; });
    const tg = overlay.querySelector("#dr-targets");
    if (tg) tg.addEventListener("change", () => { useTargets = tg.checked; });

    function draw() {
      body.innerHTML = plan.days.map((d, di) =>
        '<div class="card" style="margin-bottom:14px;padding:14px;">' +
        '<div class="row" style="gap:8px;margin-bottom:8px;"><input type="text" data-daylabel="' + di + '" value="' + ui().escapeHtml(d.label) + '" style="font-family:var(--font-display);font-weight:800;" />' +
        (plan.days.length > 1 ? '<button class="iconbtn" data-delday="' + di + '" aria-label="Elimina giorno">' + ui().icon("trash") + "</button>" : "") + "</div>" +
        '<div class="small muted" style="font-weight:700;margin-bottom:6px;" data-daytot="' + di + '">' + dayTotalsLabel(d) + "</div>" +
        d.meals.map((m, mi) =>
          '<div style="margin-top:12px;">' +
          '<div class="row" style="gap:8px;"><select data-mealtype="' + di + "." + mi + '" style="flex:0 0 118px;">' +
          MEAL_IDS.map((id) => '<option value="' + id + '" ' + (id === m.meal ? "selected" : "") + ">" + MEAL_LABELS[id] + "</option>").join("") + "</select>" +
          '<input type="text" data-meallabel="' + di + "." + mi + '" value="' + ui().escapeHtml(m.label) + '" /></div>' +
          m.items.map((it, ii) => {
            const k = di + "." + mi + "." + ii;
            return '<div class="row" style="gap:6px;margin-top:6px;align-items:center;">' +
              '<span style="font-size:20px;width:26px;text-align:center;">' + (it.unknown ? "❓" : it.emoji) + "</span>" +
              '<input type="text" data-iname="' + k + '" value="' + ui().escapeHtml(it.name) + '" style="flex:1;min-width:0;" />' +
              '<input type="number" inputmode="decimal" data-igrams="' + k + '" value="' + it.grams + '" style="width:64px;flex:0 0 64px;" />' +
              '<input type="number" inputmode="decimal" data-ikcal="' + k + '" value="' + it.kcal + '" title="kcal" style="width:64px;flex:0 0 64px;" />' +
              '<button class="rm-btn" data-idel="' + k + '" aria-label="Rimuovi">' + ui().icon("close") + "</button></div>" +
              (it.alternatives ? '<div class="small muted" style="margin:2px 0 0 32px;font-weight:600;">oppure: ' + ui().escapeHtml(it.alternatives) + "</div>" : "");
          }).join("") +
          '<button class="link-btn" data-iadd="' + di + "." + mi + '" style="margin-top:4px;">' + ui().icon("plus") + " Alimento</button>" +
          "</div>"
        ).join("") +
        "</div>"
      ).join("");
      wireBody();
    }

    const at = (key) => { const [di, mi, ii] = key.split(".").map(Number); return { d: plan.days[di], m: plan.days[di].meals[mi], it: ii != null ? plan.days[di].meals[mi].items[ii] : null, di }; };
    const refreshTot = (di) => { const el = body.querySelector('[data-daytot="' + di + '"]'); if (el) el.textContent = dayTotalsLabel(plan.days[di]); };

    function wireBody() {
      body.querySelectorAll("[data-daylabel]").forEach((i) => i.addEventListener("input", () => {
        const d = plan.days[+i.dataset.daylabel];
        d.label = i.value;
        d.weekday = weekdayOf(i.value);
      }));
      body.querySelectorAll("[data-delday]").forEach((b) => b.addEventListener("click", () => { plan.days.splice(+b.dataset.delday, 1); draw(); }));
      body.querySelectorAll("[data-mealtype]").forEach((s) => s.addEventListener("change", () => { at(s.dataset.mealtype).m.meal = s.value; }));
      body.querySelectorAll("[data-meallabel]").forEach((i) => i.addEventListener("input", () => { at(i.dataset.meallabel).m.label = i.value; }));
      body.querySelectorAll("[data-iname]").forEach((i) => i.addEventListener("input", () => { at(i.dataset.iname).it.name = i.value; }));
      body.querySelectorAll("[data-igrams]").forEach((i) => i.addEventListener("input", () => {
        const { it, di } = at(i.dataset.igrams);
        const g = parseFloat(i.value);
        if (!(g > 0)) return;
        it.grams = Math.round(g);
        applyRates(it);
        const kIn = body.querySelector('[data-ikcal="' + i.dataset.igrams + '"]');
        if (kIn) kIn.value = it.kcal;
        refreshTot(di);
      }));
      body.querySelectorAll("[data-ikcal]").forEach((i) => i.addEventListener("input", () => {
        const { it, di } = at(i.dataset.ikcal);
        const k = parseFloat(i.value);
        if (!(k >= 0)) return;
        // kcal scritte a mano: le macro si scalano in proporzione (se note)
        const ratio = it.kcal > 0 ? k / it.kcal : 0;
        it.kcal = Math.round(k);
        if (ratio) { it.p = r1(it.p * ratio); it.c = r1(it.c * ratio); it.f = r1(it.f * ratio); }
        it.unknown = false;
        withRates(it);
        refreshTot(di);
      }));
      body.querySelectorAll("[data-idel]").forEach((b) => b.addEventListener("click", () => {
        const { m } = at(b.dataset.idel);
        m.items.splice(+b.dataset.idel.split(".")[2], 1);
        draw();
      }));
      body.querySelectorAll("[data-iadd]").forEach((b) => b.addEventListener("click", () => {
        at(b.dataset.iadd).m.items.push(withRates(makeItem({ name: "", grams: 100, unknown: true })));
        draw();
        const inputs = body.querySelectorAll('[data-iname^="' + b.dataset.iadd + '."]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }));
    }
    draw();

    overlay.querySelector("#dr-save").addEventListener("click", () => {
      plan.days.forEach((d) => {
        d.label = (d.label || "").trim() || "Ogni giorno";
        d.meals.forEach((m) => {
          m.label = (m.label || "").trim() || MEAL_LABELS[m.meal];
          m.items = m.items.filter((it) => it.name.trim()).map((it) => { const o = Object.assign({}, it, { name: it.name.trim() }); delete o.rate; return o; });
        });
        d.meals = d.meals.filter((m) => m.items.length);
      });
      plan.days = plan.days.filter((d) => d.meals.length);
      if (!plan.days.length) { ui().toast("La dieta è vuota"); return; }
      const final = { name: (plan.name || "").trim() || "La mia dieta", notes: plan.notes || "", source: plan.source || "pdf", importedAt: Date.now(), targets: plan.targets || null, days: plan.days };
      db().updateData((d) => {
        d.nutrition.dietPlan = final;
        d.nutrition.dietDone = {};
        if (useTargets && final.targets) d.targets = Object.assign({}, d.targets, final.targets, { custom: true, computedAt: Date.now() });
      });
      selectedDayId = null;
      ui().closeSheet();
      ui().toast("Dieta salvata 🥗");
      if (window.GA.app.currentTab() !== "alimentazione") window.GA.app.setTab("alimentazione");
      else window.GA.app.refresh();
    });
  }

  function withRates(it) {
    const g = it.grams || 100;
    it.rate = { kcal: it.kcal / g, p: it.p / g, c: it.c / g, f: it.f / g };
    return it;
  }
  function applyRates(it) {
    if (!it.rate) return;
    it.kcal = Math.round(it.rate.kcal * it.grams);
    it.p = r1(it.rate.p * it.grams); it.c = r1(it.rate.c * it.grams); it.f = r1(it.rate.f * it.grams);
  }

  function totalsOf(items) {
    return items.reduce((a, it) => ({ kcal: a.kcal + it.kcal, p: a.p + it.p, c: a.c + it.c, f: a.f + it.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  }
  function dayTotalsLabel(d) {
    const t = totalsOf([].concat(...d.meals.map((m) => m.items)));
    return Math.round(t.kcal) + " kcal · P " + Math.round(t.p) + " · C " + Math.round(t.c) + " · G " + Math.round(t.f);
  }

  /* ---------------- Card nella sezione Cibo ---------------- */
  function currentDay(plan, done) {
    const byId = (id) => plan.days.find((d) => d.id === id);
    if (selectedDayId && byId(selectedDayId)) return byId(selectedDayId);
    if (done && done.dayId && byId(done.dayId)) return byId(done.dayId);
    const wd = WEEKDAYS[new Date().getDay()];
    return plan.days.find((d) => d.weekday === wd) || plan.days[0];
  }

  function cardHtml(data) {
    const plan = data.nutrition.dietPlan;
    if (!plan) {
      return (
        '<div class="card tint-sun" style="margin-top:18px;">' +
        '<div class="row" style="align-items:flex-start;gap:12px;"><div>' +
        '<div style="font-family:var(--font-display);font-weight:800;font-size:19px;line-height:1.2;">Hai una dieta del nutrizionista?</div>' +
        '<p class="small muted" style="margin-top:4px;font-weight:600;">Importala dal PDF: la ritrovi qui ogni giorno e segni i pasti nel diario con un tocco.</p></div>' +
        '<div style="font-size:40px;line-height:1;">🥗</div></div>' +
        '<button class="btn" id="diet-import" style="margin-top:12px;">' + ui().icon("file") + " Importa dieta da PDF</button></div>"
      );
    }
    const iso = coach().todayISO();
    const done = (data.nutrition.dietDone || {})[iso];
    const day = currentDay(plan, done);
    const doneMeals = done && done.dayId === day.id ? done.meals : [];
    const dayTot = totalsOf([].concat(...day.meals.map((m) => m.items)));

    let html = '<div class="section-title">La tua dieta <button class="link-btn" id="diet-manage">' + ui().icon("settings") + " Gestisci</button></div>";
    if (plan.days.length > 1) {
      html += '<div class="chip-row" style="margin-bottom:10px;">' + plan.days.map((d) =>
        '<button class="chip ' + (d.id === day.id ? "on" : "") + '" data-dietday="' + d.id + '">' + ui().escapeHtml(d.label) + "</button>").join("") + "</div>";
    }
    html += '<div class="card" style="padding:14px 16px;">' +
      '<div class="row"><div><div style="font-family:var(--font-display);font-weight:800;font-size:17px;">' + ui().escapeHtml(plan.name) + '</div><div class="small muted" style="font-weight:700;">' + ui().escapeHtml(day.label) + " · " + Math.round(dayTot.kcal) + " kcal</div></div>" +
      '<span class="badge ' + (doneMeals.length === day.meals.length ? "good" : "") + '">' + doneMeals.length + "/" + day.meals.length + " pasti</span></div>";
    day.meals.forEach((m, mi) => {
      const t = totalsOf(m.items);
      const isDone = doneMeals.includes(mi);
      html += '<div style="border-top:1.5px dashed var(--line);margin-top:12px;padding-top:10px;' + (isDone ? "opacity:.55;" : "") + '">' +
        '<div class="row" style="gap:8px;"><div><div style="font-weight:800;">' + ui().escapeHtml(m.label) + '</div><div class="small muted" style="font-weight:700;">' + Math.round(t.kcal) + " kcal · P " + Math.round(t.p) + " · C " + Math.round(t.c) + " · G " + Math.round(t.f) + "</div></div>" +
        (isDone
          ? '<span class="badge good">✓ nel diario</span>'
          : '<button class="btn small" data-dietmeal="' + mi + '" style="width:auto;flex-shrink:0;">' + ui().icon("check") + " Mangiato</button>") +
        "</div>" +
        '<div class="small" style="margin-top:6px;line-height:1.6;font-weight:600;">' + m.items.map((it) =>
          (it.emoji || "🍽️") + " " + ui().escapeHtml(it.name) + ' <span class="muted">' + it.grams + "g</span>" +
          (it.alternatives ? ' <span class="muted" style="font-weight:500;">(oppure ' + ui().escapeHtml(it.alternatives) + ")</span>" : "")
        ).join("<br>") + "</div></div>";
    });
    if (plan.notes) html += '<p class="small muted" style="margin-top:12px;font-weight:600;line-height:1.5;">💡 ' + ui().escapeHtml(plan.notes) + "</p>";
    html += "</div>";
    return html;
  }

  function wireCard(container) {
    const imp = container.querySelector("#diet-import");
    if (imp) imp.addEventListener("click", open);
    const man = container.querySelector("#diet-manage");
    if (man) man.addEventListener("click", openManage);
    container.querySelectorAll("[data-dietday]").forEach((b) => b.addEventListener("click", () => {
      selectedDayId = b.dataset.dietday;
      window.GA.app.refresh();
    }));
    container.querySelectorAll("[data-dietmeal]").forEach((b) => b.addEventListener("click", () => logMeal(+b.dataset.dietmeal, b)));
  }

  // Copia gli alimenti di un pasto della dieta nel diario di oggi
  function logMeal(mi, btn) {
    const data = db().getData();
    const plan = data.nutrition.dietPlan;
    const iso = coach().todayISO();
    const day = currentDay(plan, (data.nutrition.dietDone || {})[iso]);
    const m = day.meals[mi];
    if (!m) return;
    db().updateData((d) => {
      const log = window.GA.nutrition.todayLog(d);
      m.items.forEach((it) => {
        log[m.meal].push({ id: db().uid("item"), foodId: it.foodId, name: it.name, grams: it.grams, kcal: it.kcal, p: it.p, c: it.c, f: it.f, emoji: it.emoji, cat: it.cat || "altro", ts: Date.now() });
      });
      d.nutrition.dietDone = d.nutrition.dietDone || {};
      const done = d.nutrition.dietDone[iso];
      if (!done || done.dayId !== day.id) d.nutrition.dietDone[iso] = { dayId: day.id, meals: [mi] };
      else if (!done.meals.includes(mi)) done.meals.push(mi);
    });
    selectedDayId = day.id;
    ui().haptic(20);
    if (btn) { const r = btn.getBoundingClientRect(); ui().burst(r.left + r.width / 2, r.top); }
    ui().toast(m.label + " segnato nel diario");
    window.GA.app.refresh();
  }

  function openManage() {
    const plan = db().getData().nutrition.dietPlan;
    if (!plan) return;
    const html =
      '<div class="sheet-title">🥗 ' + ui().escapeHtml(plan.name) + "</div>" +
      '<p class="small muted" style="margin:-6px 0 16px;font-weight:600;">Importata il ' + new Date(plan.importedAt).toLocaleDateString("it-IT") + " · " + plan.days.length + (plan.days.length === 1 ? " giorno" : " giorni") + "</p>" +
      '<div class="stack" style="gap:10px;">' +
      '<button class="btn" id="dm-edit">' + ui().icon("edit") + " Modifica</button>" +
      '<button class="btn secondary" id="dm-reimport">' + ui().icon("file") + " Importa un nuovo PDF</button>" +
      '<button class="btn ghost" id="dm-remove" style="color:var(--bad);">' + ui().icon("trash") + " Rimuovi dieta</button>" +
      "</div>";
    const overlay = ui().openSheet(html);
    overlay.querySelector("#dm-edit").addEventListener("click", () => openEditor(plan, {}));
    overlay.querySelector("#dm-reimport").addEventListener("click", open);
    overlay.querySelector("#dm-remove").addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = "1"; b.lastChild.textContent = " Tocca di nuovo per confermare"; return; }
      db().updateData((d) => { d.nutrition.dietPlan = null; d.nutrition.dietDone = {}; });
      selectedDayId = null;
      ui().closeSheet();
      ui().toast("Dieta rimossa");
      window.GA.app.refresh();
    });
  }

  window.GA.diet = { open, openEditor, parseLines, cardHtml, wireCard, matchFood };
})();
