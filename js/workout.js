/* ===========================================================
   workout.js — sezione Palestra: scheda del giorno interattiva
   serie per serie (peso × ripetizioni), con i valori della volta
   precedente sempre accanto, bozza salvata automaticamente,
   storico/1RM, scarico, creazione/modifica/import della scheda.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const calc = () => window.GA.calc;
  const coach = () => window.GA.coach;

  let currentDayIndex = 0;
  const EX_COLORS = ["#B8F047", "#FFC83D", "#38B6FF", "#FF4D8D", "#C77DFF", "#FF7A2F", "#2ED39A"];

  function render(container) {
    const data = db().getData();
    if (!data.plan) {
      container.innerHTML = renderNoPlan();
      wireNoPlan(container);
      return;
    }
    const draft = data.workoutDraft;
    const draftIdx = draft && draft.dayId ? data.plan.days.findIndex((d) => d.id === draft.dayId) : -1;
    currentDayIndex = draftIdx !== -1 ? draftIdx : nextDayIndex(data);
    container.innerHTML = renderPlanView(data);
    wirePlanView(container);
  }

  // Il giorno dopo l'ultimo allenamento completato: la rotazione (anche A/B) resta anche riaprendo l'app
  function nextDayIndex(data) {
    const days = data.plan.days;
    const indexOf = (s) => {
      const i = days.findIndex((d) => d.id === s.dayId);
      return i !== -1 ? i : days.findIndex((d) => d.label === s.dayLabel);
    };
    for (let k = data.sessionsLog.length - 1; k >= 0; k--) {
      const s = data.sessionsLog[k];
      if (!s.completed) continue;
      const i = indexOf(s);
      if (i !== -1) return (i + 1) % days.length;
    }
    return 0;
  }

  // Recupero prima dell'esercizio successivo (le schede vecchie non lo hanno)
  function restAfter(ex) {
    return ex.restExSec || Math.min(240, (ex.restSec || 90) + 30);
  }

  function fmtRest(s) {
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* ---------------- Nessuna scheda ---------------- */
  function renderNoPlan() {
    return (
      '<h1 class="page-title">La tua <span class="hl">scheda</span></h1>' +
      '<div class="subtitle">Importa la scheda che già usi o fattene preparare una da Enrico.</div>' +
      importOptionsHtml()
    );
  }

  function importOptionsHtml() {
    return (
      '<div class="import-options">' +
      '<button class="card import-opt" data-import="pdf"><div class="io-icon" style="background:var(--pink);color:#fff;">' + ui().icon("file") + '</div><div><div class="io-title">Importa da PDF</div><div class="io-sub">Carica la scheda del tuo coach: la trasformo in una scheda interattiva dove segni pesi e ripetizioni.</div></div></button>' +
      '<button class="card import-opt" data-import="generate"><div class="io-icon" style="background:var(--lime);">' + ui().icon("sparkle") + '</div><div><div class="io-title">Generala con Enrico</div><div class="io-sub">In base a obiettivo, giorni disponibili e attrezzatura.</div></div></button>' +
      '<button class="card import-opt" data-import="manual"><div class="io-icon" style="background:var(--sun);">' + ui().icon("edit") + '</div><div><div class="io-title">Scrivila a mano</div><div class="io-sub">Inserisci giorni ed esercizi uno per uno.</div></div></button>' +
      "</div>"
    );
  }

  function wireImportOptions(root) {
    root.querySelectorAll("[data-import]").forEach((b) => {
      b.addEventListener("click", () => {
        const k = b.dataset.import;
        if (k === "pdf") window.GA.pdfImport.open();
        else if (k === "generate") openGenerateWizard();
        else openBuilder(null);
      });
    });
  }

  function wireNoPlan(container) {
    wireImportOptions(container);
  }

  function openNewPlanSheet() {
    const html = '<div class="sheet-title">Nuova scheda</div><p class="small muted" style="margin:-6px 0 14px;">Lo storico dei carichi resta salvato: gli esercizi con lo stesso nome mantengono i progressi.</p>' + importOptionsHtml();
    const overlay = ui().openSheet(html);
    wireImportOptions(overlay);
  }

  function openGenerateWizard() {
    const data = db().getData();
    const suggestedGoal = calc().trainingGoalFromProfile(data.profile);
    const html =
      '<div class="sheet-title">' + ui().icon("sparkle") + " Genera scheda</div>" +
      '<div class="field"><label>Giorni a settimana</label><div class="choicegrid" id="gw-days" style="grid-template-columns:repeat(5,1fr);">' +
      [2, 3, 4, 5, 6].map((n) => '<div class="choice" data-days="' + n + '">' + n + "</div>").join("") +
      "</div></div>" +
      '<div class="field"><label>Attrezzatura</label><div class="stack" id="gw-equip" style="gap:8px;">' +
      '<div class="choice" data-equip="completa">🏋️ Palestra completa</div>' +
      '<div class="choice" data-equip="manubri">💪 Manubri e panca</div>' +
      '<div class="choice" data-equip="corpo_libero">🤸 Solo corpo libero</div>' +
      "</div></div>" +
      '<div class="field"><label>Focus</label><div class="choicegrid" id="gw-goal" style="grid-template-columns:repeat(3,1fr);">' +
      '<div class="choice" data-goal="forza">Forza</div>' +
      '<div class="choice" data-goal="ipertrofia">Ipertrofia</div>' +
      '<div class="choice" data-goal="resistenza">Resistenza</div>' +
      "</div></div>" +
      '<button class="btn" id="gw-submit">Genera la mia scheda</button>';
    const overlay = ui().openSheet(html);
    const sel = { days: 3, equip: "completa", goal: suggestedGoal };
    const pick = (attr, key, parse) => {
      overlay.querySelectorAll("[data-" + attr + "]").forEach((b) => {
        if (String(sel[key]) === b.dataset[attr]) b.classList.add("selected");
        b.addEventListener("click", () => {
          overlay.querySelectorAll("[data-" + attr + "]").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          sel[key] = parse ? parse(b.dataset[attr]) : b.dataset[attr];
        });
      });
    };
    pick("days", "days", (v) => parseInt(v, 10));
    pick("equip", "equip");
    pick("goal", "goal");
    overlay.querySelector("#gw-submit").addEventListener("click", () => {
      const gen = calc().generatePlan({ daysPerWeek: sel.days, equipment: sel.equip, trainingGoal: sel.goal }, db().uid);
      const d0 = db().getData();
      const plan = window.GA.ai.buildPlanPreservingIds(d0, gen.days.map((d) => ({ label: d.label, exercises: d.exercises.map(({ id, ...rest }) => rest) })), { source: "coach", trainingGoal: sel.goal });
      Object.assign(plan, { daysPerWeek: sel.days, equipment: sel.equip });
      savePlan(plan);
      addCoachChat("Ho generato la tua scheda " + plan.type + " (" + sel.days + " giorni a settimana, focus " + sel.goal + "). La trovi in Palestra: iniziamo! 💪");
      ui().toast("Scheda generata");
    });
  }

  function savePlan(plan) {
    db().updateData((d) => { d.plan = plan; d.workoutDraft = null; });
    ui().closeSheet();
    window.GA.app.refresh();
  }

  /* ---------------- Editor scheda (manuale, modifica, revisione PDF) ---------------- */
  // initial: array di giorni {label, notes, exercises:[{name,sets,reps,restSec,restExSec,notes,startWeight}]} oppure null
  // opts.meta: {name, notes} della scheda
  function openBuilder(initial, opts) {
    opts = opts || {};
    const meta = Object.assign({ name: "", notes: "" }, opts.meta || {});
    const newEx = () => ({ name: "", sets: 3, reps: "8-12", restSec: 90, restExSec: 120 });
    let days = initial && initial.length
      ? JSON.parse(JSON.stringify(initial))
      : [{ label: "Giorno A", exercises: [newEx()] }];
    renderBuilder();

    function renderBuilder(scrollTop) {
      let html = '<div class="sheet-title">' + ui().icon("edit") + " " + (opts.title || "Scrivi la scheda") + "</div>";
      if (opts.banner) html += '<div class="card tint-sun flat" style="margin-bottom:14px;padding:12px 14px;"><p class="small" style="font-weight:600;">' + opts.banner + "</p></div>";
      html += '<div class="field"><label>Nome della scheda</label><input type="text" id="ib-name" value="' + ui().escapeHtml(meta.name) + '" placeholder="es. Push Pull Legs" /></div>' +
        '<div class="field"><label>Note generali</label><textarea id="ib-notes" rows="' + Math.min(6, Math.max(2, meta.notes.split("\n").length + 1)) + '" placeholder="Alternanza, riscaldamento, progressione…">' + ui().escapeHtml(meta.notes) + "</textarea></div>";
      html += '<div class="stack" id="ib-days">';
      days.forEach((d, di) => {
        html += '<div class="card" style="padding:14px;"><div class="row"><input type="text" class="ib-daylabel" data-di="' + di + '" value="' + ui().escapeHtml(d.label) + '" style="font-weight:800;font-family:var(--font-display);font-size:17px;border:none;padding:2px 0;box-shadow:none;transform:none;" />' +
          (days.length > 1 ? '<button class="rm-btn" data-removeday="' + di + '">' + ui().icon("trash") + "</button>" : "") + "</div>" +
          '<input type="text" class="ib-daynotes" data-di="' + di + '" value="' + ui().escapeHtml(d.notes || "") + '" placeholder="Note del giorno (facoltative)" style="margin-top:6px;padding:8px 10px;font-size:13.5px;border-width:1.5px;" />';
        html += '<div class="stack" style="margin-top:8px;gap:10px;">';
        d.exercises.forEach((ex, ei) => {
          html += '<div style="border-top:1.5px dashed var(--line);padding-top:10px;">' +
            '<div class="row" style="gap:6px;"><input type="text" placeholder="Esercizio" class="ib-f" data-k="name" data-di="' + di + '" data-ei="' + ei + '" value="' + ui().escapeHtml(ex.name) + '" style="font-weight:700;" />' +
            '<button class="rm-btn" data-removeex="' + di + "_" + ei + '">' + ui().icon("close") + "</button></div>" +
            '<div class="row" style="gap:6px;margin-top:6px;">' +
            miniField("Serie", "sets", ex.sets, di, ei) + miniField("Reps", "reps", ex.reps, di, ei) + miniField("Kg", "startWeight", ex.startWeight || "", di, ei) +
            "</div>" +
            '<div class="row" style="gap:6px;margin-top:6px;">' +
            miniField("Rec. serie (s)" + (ex.restAuto ? " ✨" : ""), "restSec", ex.restSec, di, ei) + miniField("Rec. esercizio (s)" + (ex.restExAuto ? " ✨" : ""), "restExSec", ex.restExSec || restAfter(ex), di, ei) +
            "</div>" +
            '<input type="text" class="ib-f" data-k="notes" data-di="' + di + '" data-ei="' + ei + '" value="' + ui().escapeHtml(ex.notes || "") + '" placeholder="Note: come eseguirlo, alternative…" style="margin-top:6px;padding:8px 10px;font-size:13.5px;border-width:1.5px;" />' +
            "</div>";
        });
        html += "</div>";
        html += '<button class="link-btn" data-addex="' + di + '" style="margin-top:10px;">' + ui().icon("plus") + " Aggiungi esercizio</button></div>";
      });
      html += "</div>";
      if (days.some((d) => d.exercises.some((e) => e.restAuto || e.restExAuto))) {
        html += '<p class="small muted" style="margin-top:10px;font-weight:600;">✨ = recupero non indicato nella scheda: l\'ho stimato io in base al tipo di esercizio e alle ripetizioni.</p>';
      }
      html += '<button class="btn secondary" id="ib-addday" style="margin-top:14px;">' + ui().icon("plus") + " Aggiungi giorno</button>";
      html += '<button class="btn" id="ib-save" style="margin-top:12px;">' + ui().icon("check") + " Salva scheda</button>";

      const overlay = ui().openSheet(html);
      overlay.classList.add("open");
      const sheet = overlay.querySelector(".sheet");
      if (scrollTop) sheet.scrollTop = scrollTop;

      overlay.querySelector("#ib-name").addEventListener("input", (e) => { meta.name = e.target.value; });
      overlay.querySelector("#ib-notes").addEventListener("input", (e) => { meta.notes = e.target.value; });
      overlay.querySelectorAll(".ib-daylabel").forEach((inp) => inp.addEventListener("input", () => { days[+inp.dataset.di].label = inp.value; }));
      overlay.querySelectorAll(".ib-daynotes").forEach((inp) => inp.addEventListener("input", () => { days[+inp.dataset.di].notes = inp.value; }));
      overlay.querySelectorAll(".ib-f").forEach((inp) => inp.addEventListener("input", () => {
        const ex = days[+inp.dataset.di].exercises[+inp.dataset.ei];
        ex[inp.dataset.k] = inp.value;
        if (inp.dataset.k === "restSec") ex.restAuto = false;
        if (inp.dataset.k === "restExSec") ex.restExAuto = false;
      }));
      const rerender = () => renderBuilder(sheet.scrollTop);
      overlay.querySelectorAll("[data-addex]").forEach((b) => b.addEventListener("click", () => {
        days[+b.dataset.addex].exercises.push(newEx());
        rerender();
      }));
      overlay.querySelectorAll("[data-removeex]").forEach((b) => b.addEventListener("click", () => {
        const [di, ei] = b.dataset.removeex.split("_").map(Number);
        days[di].exercises.splice(ei, 1);
        rerender();
      }));
      overlay.querySelectorAll("[data-removeday]").forEach((b) => b.addEventListener("click", () => {
        days.splice(+b.dataset.removeday, 1);
        rerender();
      }));
      overlay.querySelector("#ib-addday").addEventListener("click", () => {
        days.push({ label: "Giorno " + String.fromCharCode(65 + days.length), exercises: [newEx()] });
        renderBuilder(sheet.scrollHeight);
      });
      overlay.querySelector("#ib-save").addEventListener("click", () => {
        const clamp = (v, def) => Math.max(15, Math.min(600, parseInt(v, 10) || def));
        const clean = days
          .map((d) => ({
            label: (d.label || "").trim() || "Giorno",
            notes: (d.notes || "").trim(),
            exercises: d.exercises.filter((e) => String(e.name).trim()).map((e) => {
              const restSec = clamp(e.restSec, 90);
              const o = {
                name: String(e.name).trim(),
                sets: Math.max(1, Math.min(12, parseInt(e.sets, 10) || 3)),
                reps: String(e.reps || "8-12").trim() || "8-12",
                restSec,
                restExSec: clamp(e.restExSec, restAfter({ restSec })),
              };
              if (e.restAuto) o.restAuto = true;
              if (e.restExAuto) o.restExAuto = true;
              if (String(e.notes || "").trim()) o.notes = String(e.notes).trim();
              const sw = parseFloat(String(e.startWeight).replace(",", "."));
              if (sw > 0) o.startWeight = sw;
              return o;
            }),
          }))
          .filter((d) => d.exercises.length);
        if (!clean.length) { ui().toast("Aggiungi almeno un esercizio"); return; }
        const data = db().getData();
        const plan = window.GA.ai.buildPlanPreservingIds(data, clean, { source: opts.source || "import", keepStart: !!opts.keepStart, name: meta.name.trim(), notes: meta.notes.trim() });
        savePlan(plan);
        ui().toast(opts.savedMsg || "Scheda salvata");
      });
    }
  }

  function miniField(label, key, val, di, ei) {
    return '<label style="flex:1;display:flex;flex-direction:column;gap:3px;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft);">' + label +
      '<input type="text" inputmode="' + (key === "reps" ? "text" : "decimal") + '" class="ib-f" data-k="' + key + '" data-di="' + di + '" data-ei="' + ei + '" value="' + ui().escapeHtml(val) + '" style="padding:8px 6px;text-align:center;font-weight:800;border-width:1.5px;" /></label>';
  }

  /* ---------------- Bozza della sessione (persistita) ---------------- */
  function lastReal(hist) {
    for (let i = hist.length - 1; i >= 0; i--) if (!hist[i].suggested) return hist[i];
    return null;
  }

  function prevSetsOf(entry) {
    if (!entry) return [];
    if (entry.sets && entry.sets.length) return entry.sets;
    return [{ w: entry.weight, r: entry.reps }];
  }

  function repsFloor(reps) {
    const m = String(reps).match(/\d+/);
    return m ? parseInt(m[0], 10) : "";
  }

  // Valori suggeriti (placeholder) per ogni serie: partono dalla volta prima
  // + progressione decisa dal feedback, o dal peso impostato dal coach.
  function suggestionsFor(ex, data) {
    const hist = data.history[ex.id] || [];
    const last = lastReal(hist);
    const prev = prevSetsOf(last);
    const n = Math.max(1, parseInt(ex.sets, 10) || prev.length || 3);
    const trainingGoal = data.plan.trainingGoal || calc().trainingGoalFromProfile(data.profile);
    let top = last ? Math.max(...prev.map((s) => +s.w || 0)) : 0;
    let target = null;
    if (ex.targetWeight) target = ex.targetWeight;
    else if (last) target = coach().nextSuggestion({ lastWeight: top, lastReps: last.reps, feedback: last.feedback, trainingGoal }).suggestedWeight;
    else if (ex.startWeight) target = ex.startWeight;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = prev[i] || prev[prev.length - 1];
      let w = target;
      if (p && target != null && top) w = Math.max(0, Math.round(((+p.w || 0) + (target - top)) * 4) / 4);
      out.push({ w: w == null ? "" : w, r: p ? p.r : repsFloor(ex.reps), prev: prev[i] || null });
    }
    return { sets: out, last };
  }

  function getDraft(data, day) {
    let d = data.workoutDraft;
    if (!d || d.dayId !== day.id) d = { dayId: day.id, startedAt: Date.now(), ex: {} };
    day.exercises.forEach((ex) => {
      if (!d.ex[ex.id]) {
        const n = Math.max(1, parseInt(ex.sets, 10) || 3);
        d.ex[ex.id] = { sets: Array.from({ length: n }, () => ({ w: "", r: "", done: false })), feedback: null };
      }
    });
    return d;
  }

  function saveDraft(mutator) {
    db().updateData((d) => {
      const day = d.plan.days[currentDayIndex];
      d.workoutDraft = getDraft(d, day);
      mutator(d.workoutDraft, d);
    });
  }

  function fmtKg(n) {
    if (n === "" || n == null) return "";
    return String(Math.round(n * 100) / 100).replace(".", ",");
  }
  function parseNum(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return isFinite(n) ? n : null;
  }

  /* ---------------- Vista scheda ---------------- */
  function renderPlanView(data) {
    const plan = data.plan;
    const day = plan.days[currentDayIndex];
    const draft = getDraft(data, day);
    const deload = coach().checkDeload(plan, data.settings);
    const week = coach().weeksSince(plan.startedAt) + 1;

    // la barra avanza serie per serie; l'etichetta conta gli esercizi ancora da finire
    let total = 0, done = 0, exLeft = 0;
    day.exercises.forEach((ex) => {
      const sets = draft.ex[ex.id].sets;
      sets.forEach((s) => { total++; if (s.done) done++; });
      if (!sets.length || sets.some((s) => !s.done)) exLeft++;
    });
    const leftLbl = exLeft === 0 ? "Tutti fatti 💪" : exLeft + (exLeft === 1 ? " esercizio mancante" : " esercizi mancanti");

    let html = '<div class="row" style="align-items:flex-end;"><h1 class="page-title">Palestra</h1>' +
      '<div class="row" style="gap:8px;margin-bottom:6px;"><button class="iconbtn" id="wo-edit" title="Modifica scheda">' + ui().icon("edit") + '</button><button class="iconbtn" id="wo-newplan" title="Nuova scheda">' + ui().icon("plus") + "</button></div></div>";
    html += '<div class="subtitle">Settimana ' + week + " · " + (plan.name ? ui().escapeHtml(plan.name) : "scheda " + ui().escapeHtml(plan.type)) + " · " + plan.days.length + " giorni</div>";
    if (plan.notes) {
      html += '<details class="card flat tint-sun plan-notes" style="margin-bottom:16px;padding:12px 14px;"><summary class="small" style="font-weight:800;cursor:pointer;">📋 Note della scheda</summary>' +
        '<div class="small" style="margin-top:8px;font-weight:600;line-height:1.5;white-space:pre-line;">' + ui().escapeHtml(plan.notes) + "</div></details>";
    }

    if (deload && deload.due) {
      html += '<div class="card tint-sun" style="margin-bottom:16px;"><span class="badge warn">😮‍💨 Scarico consigliato</span><p class="small" style="margin-top:8px;font-weight:600;">' + ui().escapeHtml(deload.message) + '</p><button class="btn secondary small" id="wo-deload-done" style="margin-top:10px;">Ho fatto lo scarico</button></div>';
    }

    html += '<div class="card plan-hero"><div class="ph-deco">🏋️</div><div class="eyebrow" style="color:inherit;opacity:.7;">Allenamento di oggi</div>' +
      '<div class="ph-title">' + ui().escapeHtml(day.label) + "</div>" +
      '<div class="row small" style="font-weight:800;"><span>' + day.exercises.length + (day.exercises.length === 1 ? " esercizio" : " esercizi") + "</span><span>" + leftLbl + "</span></div>" +
      '<div class="ph-progress"><i style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%"></i></div></div>';
    if (day.notes) html += '<div class="card flat" style="margin-top:12px;padding:10px 14px;"><p class="small" style="font-weight:600;line-height:1.5;white-space:pre-line;">📝 ' + ui().escapeHtml(day.notes) + "</p></div>";

    if (plan.days.length > 1) {
      html += '<div class="daytabs" id="wo-daytabs">' + plan.days.map((d, i) => {
        const parts = d.label.split(/\s[—–-]\s/);
        return '<button class="daytab ' + (i === currentDayIndex ? "active" : "") + '" data-di="' + i + '">' + ui().escapeHtml(parts[0]) + (parts[1] ? "<small>" + ui().escapeHtml(parts.slice(1).join(" – ")) + "</small>" : "<small>" + d.exercises.length + " esercizi</small>") + "</button>";
      }).join("") + "</div>";
    }

    html += '<div class="stack" id="wo-exercises" style="margin-top:14px;gap:16px;">';
    day.exercises.forEach((ex, i) => { html += renderExerciseCard(ex, i, data, draft, day.exercises[i + 1]); });
    html += "</div>";

    html += '<button class="btn lime" id="wo-complete" style="margin-top:20px;">' + ui().icon("check") + " Completa allenamento</button>";
    html += renderMaxLifts(data);
    return html;
  }

  function renderExerciseCard(ex, i, data, draft, nextEx) {
    const sug = suggestionsFor(ex, data);
    const dex = draft.ex[ex.id];
    const color = EX_COLORS[i % EX_COLORS.length];

    let lastHtml = "";
    if (sug.last) {
      const ps = prevSetsOf(sug.last);
      lastHtml = '<div class="ex-last">' + ui().icon("history").replace("<svg", '<svg width="14" height="14"') + " Ultima volta · " + fmtDate(sug.last.date) + " " +
        ps.map((s) => '<span class="pill">' + fmtKg(s.w) + "×" + s.r + "</span>").join("") +
        (sug.last.feedback ? ' <span class="badge">' + sug.last.feedback + "</span>" : "") + "</div>";
    } else {
      lastHtml = '<div class="ex-last">✨ Prima volta: scegli un carico con cui chiudi le serie con 2 ripetizioni in riserva.</div>';
    }

    let rows = '<div class="set-row head"><div>#</div><div>Prima</div><div>Kg</div><div>Reps</div><div></div></div>';
    dex.sets.forEach((s, si) => {
      const sg = sug.sets[si] || sug.sets[sug.sets.length - 1] || { w: "", r: "" };
      const prev = sg.prev;
      rows += '<div class="set-row ' + (s.done ? "done" : "") + '" data-si="' + si + '">' +
        '<div class="set-idx">' + (si + 1) + "</div>" +
        '<div class="set-prev">' + (prev ? fmtKg(prev.w) + " × " + prev.r : "—") + deltaHtml(s, prev) + "</div>" +
        '<input type="text" inputmode="decimal" data-f="w" value="' + fmtKg(s.w) + '" placeholder="' + fmtKg(sg.w) + '" />' +
        '<input type="text" inputmode="numeric" data-f="r" value="' + (s.r === "" ? "" : s.r) + '" placeholder="' + sg.r + '" />' +
        '<button class="set-check" data-check>' + ui().icon("check") + "</button></div>";
    });

    return (
      '<div class="card exercise-card" data-exid="' + ex.id + '">' +
      '<div class="ex-head"><div class="ex-num" style="background:' + color + '">' + (i + 1) + "</div>" +
      '<div class="ex-title"><div class="exname">' + ui().escapeHtml(ex.name) + '</div><div class="exmeta">' + ex.sets + " × " + ui().escapeHtml(ex.reps) + (ex.targetWeight ? " · 🎯 " + fmtKg(ex.targetWeight) + " kg" : "") + "</div>" +
      (ex.notes ? '<div class="exnote">📝 ' + ui().escapeHtml(ex.notes) + "</div>" : "") + "</div></div>" +
      lastHtml +
      '<div class="sets-table">' + rows + "</div>" +
      '<div class="chip-row rest-row">' +
      '<button class="chip" data-timer="' + ex.restSec + '" data-kind="set">⏱ Tra le serie <b>' + fmtRest(ex.restSec) + "</b>" + (ex.restAuto ? " ✨" : "") + "</button>" +
      (nextEx ? '<button class="chip" data-timer="' + restAfter(ex) + '" data-kind="ex" data-next="' + ui().escapeHtml(nextEx.name) + '">➡️ Prossimo esercizio <b>' + fmtRest(restAfter(ex)) + "</b>" + (ex.restExAuto ? " ✨" : "") + "</button>" : "") +
      "</div>" +
      '<div class="ex-foot"><div class="row" style="gap:12px;"><button class="link-btn" data-addset>' + ui().icon("plus") + ' Serie</button>' + (dex.sets.length > 1 ? '<button class="link-btn" data-rmset style="color:var(--ink-soft);">' + ui().icon("minus") + "</button>" : "") + "</div>" +
      '<div class="feedback-row">' + ["facile", "giusto", "difficile"].map((f) => '<button data-fb="' + f + '" class="' + (dex.feedback === f ? "selected" : "") + '">' + { facile: "😎", giusto: "👌", difficile: "🥵" }[f] + " " + f + "</button>").join("") + "</div></div>" +
      '<div class="row" style="margin-top:6px;"><button class="link-btn" data-history>Storico e progressi ' + ui().icon("chevron") + "</button></div>" +
      "</div>"
    );
  }

  function deltaHtml(s, prev) {
    if (!s.done || !prev) return "";
    const w = +s.w || 0, pw = +prev.w || 0, r = +s.r || 0, pr = +prev.r || 0;
    if (w > pw) return '<span class="delta up">▲ +' + fmtKg(w - pw) + " kg</span>";
    if (w < pw) return '<span class="delta down">▼ ' + fmtKg(w - pw) + " kg</span>";
    if (r > pr) return '<span class="delta up">▲ +' + (r - pr) + " rep</span>";
    if (r < pr) return '<span class="delta down">▼ ' + (r - pr) + " rep</span>";
    return '<span class="delta" style="color:var(--ink-soft)">= uguale</span>';
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    const diff = Math.round((new Date(coach().todayISO() + "T00:00:00") - d) / 86400000);
    if (diff === 0) return "oggi";
    if (diff === 1) return "ieri";
    if (diff < 7) return diff + " giorni fa";
    return d.getDate() + "/" + (d.getMonth() + 1);
  }

  function renderMaxLifts(data) {
    let cells = "";
    calc().MAIN_LIFTS.forEach((liftName) => {
      const ids = [];
      data.plan.days.forEach((d) => d.exercises.forEach((e) => { if (e.name.toLowerCase().startsWith(liftName.toLowerCase())) ids.push(e.id); }));
      let best = 0;
      ids.forEach((id) => (data.history[id] || []).forEach((h) => { if (!h.suggested) best = Math.max(best, calc().estimate1RM(h.weight, h.reps)); }));
      if (best) cells += '<div class="macro-cell"><div class="val">' + best + '<span class="small"> kg</span></div><div class="lbl">' + liftName + "</div></div>";
    });
    if (!cells) return "";
    return '<div class="card tint-violet" style="margin-top:20px;"><div class="eyebrow">🏆 Massimali stimati (1RM)</div><div class="macro-grid" style="grid-template-columns:repeat(2,1fr);row-gap:14px;">' + cells + "</div></div>";
  }

  function wirePlanView(container) {
    container.querySelector("#wo-newplan").addEventListener("click", openNewPlanSheet);
    container.querySelector("#wo-edit").addEventListener("click", () => {
      const plan = db().getData().plan;
      openBuilder(plan.days.map((d) => ({
        label: d.label, notes: d.notes || "",
        exercises: d.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec, restExSec: restAfter(e), restAuto: e.restAuto, restExAuto: e.restExAuto, notes: e.notes, startWeight: e.startWeight })),
      })), { title: "Modifica scheda", source: plan.source, keepStart: true, savedMsg: "Scheda aggiornata", meta: { name: plan.name || "", notes: plan.notes || "" } });
    });

    const deloadBtn = container.querySelector("#wo-deload-done");
    if (deloadBtn) deloadBtn.addEventListener("click", () => {
      db().updateData((d) => { d.plan.lastDeloadWeek = coach().weeksSince(d.plan.startedAt); });
      ui().toast("Ottimo, buon proseguimento!");
      window.GA.app.refresh();
    });

    container.querySelectorAll("#wo-daytabs [data-di]").forEach((b) => b.addEventListener("click", () => {
      currentDayIndex = parseInt(b.dataset.di, 10);
      const d = db().getData();
      const day = d.plan.days[currentDayIndex];
      // cambiando giorno la bozza del giorno precedente viene sostituita solo se vuota
      const cur = d.workoutDraft;
      const hasWork = cur && Object.values(cur.ex || {}).some((e) => e.sets.some((s) => s.done || s.w !== "" || s.r !== ""));
      if (!hasWork || confirm("Hai serie non salvate nell'allenamento in corso. Cambiare giorno e scartarle?")) {
        db().updateData((x) => { x.workoutDraft = getDraft(Object.assign({}, x, { workoutDraft: null }), day); });
      } else {
        currentDayIndex = d.plan.days.findIndex((x) => x.id === cur.dayId);
      }
      window.GA.app.refresh();
    }));

    container.querySelectorAll(".exercise-card").forEach((card) => {
      const exId = card.dataset.exid;
      card.querySelectorAll(".set-row[data-si]").forEach((row) => {
        const si = +row.dataset.si;
        row.querySelectorAll("input").forEach((inp) => {
          inp.addEventListener("input", () => {
            const f = inp.dataset.f;
            const v = inp.value.trim() === "" ? "" : parseNum(inp.value);
            saveDraft((dr) => { dr.ex[exId].sets[si][f] = v == null ? "" : (f === "r" && v !== "" ? Math.round(v) : v); });
          });
          inp.addEventListener("focus", () => inp.select());
        });
        row.querySelector("[data-check]").addEventListener("click", (e) => {
          const wIn = row.querySelector('[data-f="w"]'), rIn = row.querySelector('[data-f="r"]');
          const w = parseNum(wIn.value !== "" ? wIn.value : wIn.placeholder);
          const r = parseNum(rIn.value !== "" ? rIn.value : rIn.placeholder);
          let nowDone = false;
          saveDraft((dr) => {
            const s = dr.ex[exId].sets[si];
            if (s.done) { s.done = false; return; }
            if (w == null || r == null) return;
            s.w = w; s.r = Math.round(r); s.done = nowDone = true;
          });
          if (!nowDone && (w == null || r == null)) { ui().toast("Inserisci peso e ripetizioni"); return; }
          if (nowDone) {
            ui().haptic(15);
            const rect = e.currentTarget.getBoundingClientRect();
            ui().burst(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#B8F047", "#FFC83D", "#2ED39A"]);
          }
          rerenderKeepScroll();
        });
      });
      card.querySelector("[data-addset]").addEventListener("click", () => {
        saveDraft((dr) => { const s = dr.ex[exId].sets; s.push({ w: "", r: "", done: false }); });
        rerenderKeepScroll();
      });
      const rm = card.querySelector("[data-rmset]");
      if (rm) rm.addEventListener("click", () => {
        saveDraft((dr) => { const s = dr.ex[exId].sets; if (s.length > 1) s.pop(); });
        rerenderKeepScroll();
      });
      card.querySelectorAll("[data-fb]").forEach((b) => b.addEventListener("click", () => {
        saveDraft((dr) => { dr.ex[exId].feedback = dr.ex[exId].feedback === b.dataset.fb ? null : b.dataset.fb; });
        card.querySelectorAll("[data-fb]").forEach((x) => x.classList.toggle("selected", x === b && !x.classList.contains("selected")));
      }));
      card.querySelectorAll("[data-timer]").forEach((b) => b.addEventListener("click", () => {
        const isEx = b.dataset.kind === "ex";
        window.GA.timer.open(parseInt(b.dataset.timer, 10), {
          title: isEx ? "Recupero prima del prossimo esercizio" : "Recupero tra le serie",
          sub: isEx ? "Prossimo: " + b.dataset.next : "",
        });
      }));
      card.querySelector("[data-history]").addEventListener("click", () => openHistory(exId));
    });

    container.querySelector("#wo-complete").addEventListener("click", (e) => completeSession(e.currentTarget));
  }

  // ri-renderizza la vista senza animazioni d'ingresso e senza perdere la posizione
  function rerenderKeepScroll() {
    const y = window.scrollY;
    const container = document.getElementById("tab-content");
    container.classList.add("no-anim");
    render(container);
    window.scrollTo(0, y);
  }

  function completeSession(btn) {
    const data = db().getData();
    const day = data.plan.days[currentDayIndex];
    const draft = getDraft(data, day);
    const entries = [];
    const records = [];
    day.exercises.forEach((ex) => {
      const dex = draft.ex[ex.id];
      const sets = dex.sets.filter((s) => s.done && s.w !== "" && s.r !== "").map((s) => ({ w: +s.w, r: +s.r }));
      if (!sets.length) return;
      const top = sets.reduce((a, b) => (b.w > a.w || (b.w === a.w && b.r > a.r) ? b : a));
      const prevBest = Math.max(0, ...(data.history[ex.id] || []).filter((h) => !h.suggested).map((h) => calc().estimate1RM(h.weight, h.reps)));
      const best = Math.max(...sets.map((s) => calc().estimate1RM(s.w, s.r)));
      if (prevBest && best > prevBest) records.push(ex.name);
      entries.push({ exerciseId: ex.id, name: ex.name, sets, weight: top.w, reps: top.r, feedback: dex.feedback || "giusto" });
    });
    if (!entries.length) {
      ui().toast("Spunta ✓ le serie che hai fatto prima di completare");
      return;
    }
    const sessionId = db().uid("sess");
    const today = coach().todayISO();
    db().updateData((d) => {
      entries.forEach((e) => {
        if (!d.history[e.exerciseId]) d.history[e.exerciseId] = [];
        d.history[e.exerciseId].push({ date: today, weight: e.weight, reps: e.reps, sets: e.sets, feedback: e.feedback, sessionId });
        // il peso impostato dal coach vale per una sola sessione
        d.plan.days.forEach((dd) => dd.exercises.forEach((x) => { if (x.id === e.exerciseId) delete x.targetWeight; }));
      });
      d.sessionsLog.push({ id: sessionId, date: today, dayId: day.id, dayLabel: day.label, entries, completed: true });
      d.workoutDraft = null;
    });
    const trainingGoal = data.plan.trainingGoal || calc().trainingGoalFromProfile(data.profile);
    let msg = coach().sessionSummaryMessage(entries, trainingGoal);
    if (records.length) msg += " 🏆 Nuovo record stimato su: " + records.join(", ") + "!";
    addCoachChat(msg);
    const r = btn.getBoundingClientRect();
    ui().burst(r.left + r.width / 2, r.top, null);
    setTimeout(() => ui().burst(r.left + r.width * 0.25, r.top - 30, null), 150);
    setTimeout(() => ui().burst(r.left + r.width * 0.75, r.top - 30, null), 300);
    currentDayIndex = (currentDayIndex + 1) % data.plan.days.length;
    setTimeout(() => {
      window.scrollTo(0, 0);
      window.GA.app.refresh();
      ui().toast(records.length ? "🏆 Allenamento salvato con nuovi record!" : "💪 Allenamento salvato!");
    }, 450);
  }

  function openHistory(exId) {
    const data = db().getData();
    const hist = (data.history[exId] || []).filter((h) => !h.suggested).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    let exName = "";
    data.plan.days.forEach((d) => { const e = d.exercises.find((x) => x.id === exId); if (e) exName = e.name; });

    let best = 0;
    hist.forEach((h) => { (h.sets || [{ w: h.weight, r: h.reps }]).forEach((s) => { best = Math.max(best, calc().estimate1RM(s.w, s.r)); }); });

    const last12 = hist.slice(-12);
    const maxW = Math.max(1, ...last12.map((h) => h.weight));
    let trendHtml = '<div class="trend">';
    last12.forEach((h, i) => { trendHtml += '<i style="height:' + Math.max(12, Math.round((h.weight / maxW) * 100)) + "%;animation-delay:" + i * 40 + 'ms" title="' + h.weight + 'kg"></i>'; });
    trendHtml += "</div>";

    const first = hist[0], last = hist[hist.length - 1];
    const gain = first && last && hist.length > 1 ? Math.round((last.weight - first.weight) * 100) / 100 : 0;

    let rows = "";
    hist.slice().reverse().forEach((h) => {
      const sets = h.sets || [{ w: h.weight, r: h.reps }];
      rows += '<div class="list-item" style="align-items:flex-start;"><div><div class="name">' + fmtDate(h.date) + ' <span class="badge" style="margin-left:4px;">' + h.feedback + '</span></div><div class="ex-last" style="margin-top:6px;">' +
        sets.map((s) => '<span class="pill">' + fmtKg(s.w) + "×" + s.r + "</span>").join("") + "</div></div><div class=\"amount\">" + fmtKg(h.weight) + " kg</div></div>";
    });

    const html =
      '<div class="sheet-title">' + ui().escapeHtml(exName) + "</div>" +
      (hist.length
        ? '<div class="card tint-violet"><div class="row"><div><div class="eyebrow">Massimale stimato</div><div class="big-number">' + best + ' <span class="small">kg</span></div></div>' +
          (hist.length > 1 ? '<div style="text-align:right;"><div class="eyebrow">Progresso</div><div class="big-number" style="font-size:28px;color:' + (gain >= 0 ? "var(--good)" : "var(--bad)") + '">' + (gain >= 0 ? "+" : "") + fmtKg(gain) + ' <span class="small">kg</span></div></div>' : "") +
          "</div>" + (hist.length > 1 ? trendHtml : "") + "</div>"
        : "") +
      '<div class="list" style="margin-top:14px;">' + (rows || '<div class="empty"><span class="em">📈</span>Ancora nessuna sessione registrata per questo esercizio.</div>') + "</div>";

    ui().openSheet(html);
  }

  function addCoachChat(text) {
    db().updateData((d) => { d.chat.push({ id: db().uid("msg"), role: "coach", text, ts: Date.now() }); });
  }

  window.GA.workout = { render, openBuilder, restAfter, resetDraft: () => { db().updateData((d) => { d.workoutDraft = null; }); } };
})();
