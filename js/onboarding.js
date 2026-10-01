/* ===========================================================
   onboarding.js — setup iniziale guidato (dati fisici, obiettivo,
   sport) + calcolo BMI/TDEE/macro, e tour del coach AI al primo
   utilizzo.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const calc = () => window.GA.calc;
  const db = () => window.GA.db;

  let step = 0;
  let form = { name: "", weight: "", height: "", age: "", sex: "", activity: "", goal: "", sports: [] };

  const STEPS = 4;

  function render() {
    const root = document.getElementById("app");
    root.innerHTML = '<div class="auth-wrap" id="ob-wrap"></div>';
    renderStep();
  }

  function dots() {
    let h = '<div class="progress-dots">';
    for (let i = 0; i < STEPS; i++) h += '<span class="' + (i <= step ? "done" : "") + '"></span>';
    return h + "</div>";
  }

  function renderStep() {
    const wrap = document.getElementById("ob-wrap");
    let body = "";
    if (step === 0) body = stepPhysical();
    else if (step === 1) body = stepActivityGoal();
    else if (step === 2) body = stepSports();
    else body = stepSummary();

    wrap.innerHTML = dots() + body;
    wireStep();
  }

  function stepPhysical() {
    return (
      '<h1 class="page-title">Parliamo di te</h1>' +
      '<div class="subtitle">Servono pochi dati per calcolare il tuo fabbisogno. Restano salvati solo su questo telefono.</div>' +
      '<div class="field"><label>Nome</label><input type="text" id="ob-name" value="' + ui().escapeHtml(form.name) + '" placeholder="Come ti chiami" autocomplete="given-name" /></div>' +
      '<div class="field"><label>Peso (kg)</label><input type="number" inputmode="decimal" id="ob-weight" value="' + form.weight + '" placeholder="es. 74" /></div>' +
      '<div class="field"><label>Altezza (cm)</label><input type="number" inputmode="numeric" id="ob-height" value="' + form.height + '" placeholder="es. 178" /></div>' +
      '<div class="field"><label>Età</label><input type="number" inputmode="numeric" id="ob-age" value="' + form.age + '" placeholder="es. 27" /></div>' +
      '<div class="field"><label>Sesso</label><div class="choicegrid">' +
      choiceBtn("sex", "m", "Uomo") + choiceBtn("sex", "f", "Donna") +
      "</div></div>" +
      '<button class="btn" id="ob-next">Continua</button>'
    );
  }

  function stepActivityGoal() {
    const levels = Object.keys(calc().ACTIVITY_LABELS);
    let activityHtml = '<div class="stack">';
    levels.forEach((lv) => {
      activityHtml +=
        '<div class="choice ' + (form.activity === lv ? "selected" : "") + '" data-field="activity" data-value="' + lv + '" style="text-align:left;">' +
        calc().ACTIVITY_LABELS[lv] + "</div>";
    });
    activityHtml += "</div>";

    return (
      '<h1 class="page-title">Attività e obiettivo</h1>' +
      '<div class="subtitle">Quanto ti muovi di solito, e dove vuoi arrivare.</div>' +
      '<div class="field"><label>Livello di attività</label>' + activityHtml + "</div>" +
      '<div class="field"><label>Obiettivo</label><div class="choicegrid">' +
      choiceBtn("goal", "mantenimento", "Mantenimento") +
      choiceBtn("goal", "bulk", "Bulk") +
      choiceBtn("goal", "cut", "Cut") +
      "</div></div>" +
      '<button class="btn" id="ob-next">Continua</button>' +
      '<button class="btn ghost" id="ob-back" style="margin-top:10px;">Indietro</button>'
    );
  }

  function stepSports() {
    const options = [
      { id: "calcio", label: "Calcio" },
      { id: "pallavolo", label: "Pallavolo" },
      { id: "basket", label: "Basket" },
    ];
    let html = '<div class="choicegrid">';
    options.forEach((o) => {
      const sel = form.sports.includes(o.id);
      html += '<div class="choice ' + (sel ? "selected" : "") + '" data-field="sport" data-value="' + o.id + '">' + o.label + "</div>";
    });
    html += "</div>";
    return (
      '<h1 class="page-title">Sport praticati</h1>' +
      '<div class="subtitle">Così evitiamo di programmare le gambe il giorno prima di una partita. Puoi selezionare più opzioni, o nessuna.</div>' +
      html +
      '<button class="btn" id="ob-next" style="margin-top:20px;">Continua</button>' +
      '<button class="btn ghost" id="ob-back" style="margin-top:10px;">Indietro</button>'
    );
  }

  function stepSummary() {
    const profile = {
      weight: parseFloat(form.weight),
      height: parseFloat(form.height),
      age: parseInt(form.age, 10),
      sex: form.sex,
      activity: form.activity,
    };
    const bmiVal = calc().bmi(profile.weight, profile.height);
    const targets = calc().computeTargets(Object.assign({}, profile, { goal: form.goal }));

    return (
      '<h1 class="page-title">Il tuo punto di partenza</h1>' +
      '<div class="subtitle">Puoi ricalcolarlo in qualsiasi momento dalle impostazioni.</div>' +
      '<div class="card" style="margin-bottom:12px;"><div class="eyebrow">BMI</div><div class="big-number">' + ui().fmt1(bmiVal) + "</div><div class=\"small muted\">" + calc().bmiLabel(bmiVal) + "</div></div>" +
      '<div class="card"><div class="eyebrow">Fabbisogno stimato</div><div class="big-number">' + targets.kcal + ' <span style="font-size:16px;font-weight:600;color:var(--ink-soft);">kcal/giorno</span></div>' +
      '<div class="macro-grid">' +
      macroCell("protein", "Proteine", targets.protein) +
      macroCell("carbs", "Carboidrati", targets.carbs) +
      macroCell("fat", "Grassi", targets.fat) +
      "</div></div>" +
      '<button class="btn" id="ob-finish" style="margin-top:18px;">Inizia</button>' +
      '<button class="btn ghost" id="ob-back" style="margin-top:10px;">Indietro</button>'
    );
  }

  function macroCell(cls, label, val) {
    return '<div class="macro-cell"><div class="val"><span class="dot ' + cls + '"></span>' + val + "g</div><div class=\"lbl\">" + label + "</div></div>";
  }

  function choiceBtn(field, value, label) {
    const sel = form[field] === value;
    return '<div class="choice ' + (sel ? "selected" : "") + '" data-field="' + field + '" data-value="' + value + '">' + label + "</div>";
  }

  // Le scelte a bottoni (sesso/attività/obiettivo/sport) fanno un re-render
  // dello step: sincronizziamo prima i campi di testo visibili così non si
  // perde quanto già digitato (es. peso/altezza/età).
  function syncVisibleInputs() {
    const n = document.getElementById("ob-name");
    if (n) form.name = n.value;
    const w = document.getElementById("ob-weight");
    const h = document.getElementById("ob-height");
    const a = document.getElementById("ob-age");
    if (w) form.weight = w.value;
    if (h) form.height = h.value;
    if (a) form.age = a.value;
  }

  function wireStep() {
    const wrap = document.getElementById("ob-wrap");
    wrap.querySelectorAll("[data-field]").forEach((elm) => {
      elm.addEventListener("click", () => {
        syncVisibleInputs();
        const field = elm.dataset.field;
        const value = elm.dataset.value;
        if (field === "sport") {
          const i = form.sports.indexOf(value);
          if (i === -1) form.sports.push(value);
          else form.sports.splice(i, 1);
        } else {
          form[field] = value;
        }
        renderStep();
      });
    });
    const next = document.getElementById("ob-next");
    if (next) next.addEventListener("click", () => goNext());
    const back = document.getElementById("ob-back");
    if (back) back.addEventListener("click", () => { step--; renderStep(); });
    const finish = document.getElementById("ob-finish");
    if (finish) finish.addEventListener("click", finishOnboarding);
  }

  function goNext() {
    if (step === 0) {
      form.name = document.getElementById("ob-name").value.trim();
      form.weight = document.getElementById("ob-weight").value;
      form.height = document.getElementById("ob-height").value;
      form.age = document.getElementById("ob-age").value;
      if (!form.name || !form.weight || !form.height || !form.age || !form.sex) {
        ui().toast("Compila tutti i campi per continuare");
        return;
      }
    }
    if (step === 1 && (!form.activity || !form.goal)) {
      ui().toast("Seleziona attività e obiettivo");
      return;
    }
    step++;
    renderStep();
  }

  function finishOnboarding() {
    const profile = {
      weight: parseFloat(form.weight),
      height: parseFloat(form.height),
      age: parseInt(form.age, 10),
      sex: form.sex,
      activity: form.activity,
      goal: form.goal,
      sports: form.sports,
      onboarded: true,
    };
    const targets = calc().computeTargets(profile);

    db().updateCurrentUser({ name: form.name });
    db().updateData((data) => {
      data.profile = profile;
      data.targets = targets;
      data.weightLog.push({ id: db().uid("w"), date: window.GA.coach.todayISO(), weight: profile.weight });
    });

    step = 0;
    form = { name: "", weight: "", height: "", age: "", sex: "", activity: "", goal: "", sports: [] };
    window.GA.app.boot();
  }

  /* ---------------- Tour guidato del coach (primo utilizzo) ---------------- */
  const TOUR_STEPS = [
    {
      selector: '[data-tab="palestra"]',
      title: "Palestra",
      text: "Benvenuto in Yojo! Qui trovi la scheda del giorno: segna peso e ripetizioni di ogni serie e vedi sempre cosa hai fatto la volta prima. Puoi anche importare la tua scheda da PDF.",
    },
    {
      selector: '[data-tab="alimentazione"]',
      title: "Cibo",
      text: "L'anello mostra quante calorie ti restano. Cerca tra centinaia di alimenti, aggiungine di nuovi o importa la dieta del tuo nutrizionista da PDF.",
    },
    {
      selector: '[data-tab="sonno"]',
      title: "Sonno",
      text: "Qui presto potrai monitorare il tuo sonno: orari, qualità del riposo e come influisce sui tuoi allenamenti.",
    },
    {
      selector: '.topbar .iconbtn.menu-btn',
      title: "Menu",
      text: "Da qui personalizzi il tuo account con una foto, attivi Enrico AI, registri il peso, pianifichi la settimana e modifichi il profilo. Buon allenamento!",
    },
  ];

  function maybeStartTour() {
    const data = db().getData();
    if (data.tour && data.tour.done) return;
    let i = 0;
    showTourStep(i);

    function showTourStep(idx) {
      document.querySelectorAll(".coach-tip, .tip-backdrop").forEach((n) => n.remove());
      if (idx >= TOUR_STEPS.length) {
        db().updateData((d) => { d.tour.done = true; });
        return;
      }
      const cfg = TOUR_STEPS[idx];
      const target = document.querySelector(cfg.selector);
      const backdrop = ui().el('<div class="tip-backdrop"></div>');
      backdrop.addEventListener("click", () => { idx++; showTourStep(idx); });
      document.body.appendChild(backdrop);

      const tip = ui().el(
        '<div class="coach-tip"><div class="tip-title">' + window.GA.ui.icon("coach") + " " + cfg.title + "</div><div>" + cfg.text + '</div><div class="tip-actions"><div class="tip-dots">' +
        TOUR_STEPS.map((_, k) => '<span class="' + (k === idx ? "active" : "") + '"></span>').join("") +
        '</div><button data-act="next">' + (idx === TOUR_STEPS.length - 1 ? "Fine" : "Avanti") + "</button></div></div>"
      );
      document.body.appendChild(tip);

      const rect = target ? target.getBoundingClientRect() : { top: 100, left: 20, bottom: 100, width: 40 };
      const tipRect = tip.getBoundingClientRect();
      let top = rect.top - tipRect.height - 14;
      if (top < 60) top = rect.bottom + 14;
      let left = Math.min(Math.max(12, rect.left - 60), window.innerWidth - tipRect.width - 12);
      tip.style.top = top + "px";
      tip.style.left = left + "px";

      tip.querySelector('[data-act="next"]').addEventListener("click", () => {
        idx++;
        showTourStep(idx);
      });
    }
  }

  window.GA.onboarding = { render, maybeStartTour };
})();
