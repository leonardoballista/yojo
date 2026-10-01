/* ===========================================================
   nutrition.js — sezione Cibo: anello calorie animato, dieta
   importata (dietimport.js), libro delle ricette (recipes.js), ricerca
   istantanea nel catalogo, recenti, categorie illustrate,
   aggiunta rapida con slider, pasti del giorno e alimenti nuovi
   calcolati da Enrico AI (calorie e macro automatiche).
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const calc = () => window.GA.calc;
  const coach = () => window.GA.coach;
  const foods = () => window.GA.foods;
  const ai = () => window.GA.ai;

  const MEALS = [
    { id: "colazione", label: "Colazione", emoji: "☀️", color: "#FFC83D" },
    { id: "pranzo", label: "Pranzo", emoji: "🍝", color: "#FF9F43" },
    { id: "cena", label: "Cena", emoji: "🌙", color: "#C77DFF" },
    { id: "spuntini", label: "Spuntini", emoji: "🍎", color: "#FF4D8D" },
  ];
  const RING_R = 60;
  const RING_C = 2 * Math.PI * RING_R;

  let shown = null; // ultimi valori mostrati, per animare le differenze
  let lastAddedId = null;
  let searchQuery = "";

  function todayLog(data) {
    const iso = coach().todayISO();
    if (!data.nutrition.mealLog[iso]) data.nutrition.mealLog[iso] = { colazione: [], pranzo: [], cena: [], spuntini: [] };
    return data.nutrition.mealLog[iso];
  }

  function totals(day) {
    let kcal = 0, p = 0, c = 0, f = 0;
    Object.values(day).forEach((items) => (items || []).forEach((it) => { kcal += it.kcal; p += it.p; c += it.c; f += it.f; }));
    return { kcal, p, c, f };
  }

  function allFoods(data) {
    return foods().DB.concat(data.nutrition.customFoods.map((f) => Object.assign({ custom: true }, f)));
  }

  /* ---------------- Render ---------------- */
  function render(container) {
    const data = db().getData();
    const day = todayLog(data);
    const t = totals(day);
    const targets = data.targets;

    const d = new Date();
    const dateLbl = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

    let html = '<h1 class="page-title">Cosa <span class="hl">mangi</span> oggi</h1><div class="subtitle" style="text-transform:capitalize;">' + dateLbl + "</div>";
    html += heroCard(t, targets);
    html += window.GA.quickLog.actionsHtml();
    html += window.GA.diet.cardHtml(data);
    html += '<div class="searchbar">' + ui().icon("search") + '<input type="search" id="nu-search" placeholder="Cerca tra ' + allFoods(data).length + ' alimenti…" autocomplete="off" value="' + ui().escapeHtml(searchQuery) + '" /></div>';
    html += '<div class="search-results" id="nu-results"></div>';
    html += recentsHtml(data);
    html += window.GA.recipes.cardHtml(data);
    html += '<div class="section-title">Categorie</div>' + categoryGrid();
    html += aiCard();
    html += '<div class="section-title">I pasti di oggi <span class="small muted" style="font-family:var(--font-body);font-weight:700;">' + Math.round(t.kcal) + " kcal</span></div>";
    html += MEALS.map((m) => mealCard(m, day[m.id] || [])).join("");

    container.innerHTML = html;
    wire(container, data);
    window.GA.quickLog.wireActions(container);
    window.GA.diet.wireCard(container);
    window.GA.recipes.wireCard(container);
    animateHero(container, t, targets);
    if (searchQuery) renderResults(container, data);
    lastAddedId = null;
  }

  function heroCard(t, targets) {
    const macro = (cls, label, val, target, color) => {
      return '<div class="hm-row"><div class="hm-top"><span><span class="dot ' + cls + '"></span>' + label + '</span><span><b data-count="' + cls + '">' + Math.round(val) + "</b> / " + target + 'g</span></div><div class="hm-track"><div class="hm-fill" data-fill="' + cls + '" style="background:' + color + ';width:0"></div></div></div>';
    };
    const remaining = Math.round(targets.kcal - t.kcal);
    return (
      '<div class="card hero-kcal" id="nu-hero">' +
      '<div class="ring-wrap" id="nu-ring"><svg class="ring" viewBox="0 0 148 148"><circle class="ring-bg" cx="74" cy="74" r="' + RING_R + '"/><circle class="ring-fg" id="nu-ring-fg" cx="74" cy="74" r="' + RING_R + '" stroke-dasharray="' + RING_C + '" stroke-dashoffset="' + RING_C + '"/></svg>' +
      '<div class="ring-center"><div class="num" id="nu-remaining">' + Math.abs(remaining) + '</div><div class="lbl">' + (remaining >= 0 ? "kcal rimanenti" : "kcal in più") + "</div></div></div>" +
      '<div class="hero-macros">' +
      macro("protein", "Proteine", t.p, targets.protein, "var(--pink)") +
      macro("carbs", "Carbo", t.c, targets.carbs, "var(--sun)") +
      macro("fat", "Grassi", t.f, targets.fat, "var(--sky)") +
      "</div>" +
      '<div class="hero-foot"><span class="hero-pill">🔥 ' + Math.round(t.kcal) + ' mangiate</span><button class="hero-pill edit" id="nu-targets" aria-label="Modifica fabbisogno">🎯 ' + targets.kcal + " obiettivo" + (targets.custom ? " · tuo" : "") + " " + ui().icon("edit") + "</button></div>" +
      "</div>"
    );
  }

  function animateHero(container, t, targets) {
    const pct = (v, tg) => (tg ? Math.min(1, v / tg) : 0);
    const prev = shown || { kcal: 0, p: 0, c: 0, f: 0 };
    const fg = container.querySelector("#nu-ring-fg");
    const over = t.kcal > targets.kcal;
    fg.style.transition = "none";
    fg.style.strokeDashoffset = RING_C * (1 - pct(prev.kcal, targets.kcal));
    fg.getBoundingClientRect();
    fg.style.transition = "";
    fg.classList.toggle("over", over);
    requestAnimationFrame(() => { fg.style.strokeDashoffset = RING_C * (1 - pct(t.kcal, targets.kcal)); });

    ui().countUp(container.querySelector("#nu-remaining"), Math.abs(Math.round(targets.kcal - prev.kcal)), Math.abs(Math.round(targets.kcal - t.kcal)));
    [["protein", "p", targets.protein], ["carbs", "c", targets.carbs], ["fat", "f", targets.fat]].forEach(([cls, k, tg]) => {
      const fill = container.querySelector('[data-fill="' + cls + '"]');
      fill.style.transition = "none";
      fill.style.width = pct(prev[k], tg) * 100 + "%";
      fill.getBoundingClientRect();
      fill.style.transition = "";
      requestAnimationFrame(() => { fill.style.width = pct(t[k], tg) * 100 + "%"; });
      ui().countUp(container.querySelector('[data-count="' + cls + '"]'), Math.round(prev[k]), Math.round(t[k]));
    });
    shown = { kcal: t.kcal, p: t.p, c: t.c, f: t.f };
  }

  function recentsHtml(data) {
    const seen = new Set();
    const recent = [];
    for (let i = 0; i < 14 && recent.length < 10; i++) {
      const day = data.nutrition.mealLog[coach().todayISO(-i)];
      if (!day) continue;
      const items = [].concat(...MEALS.map((m) => day[m.id] || [])).sort((a, b) => (b.ts || 0) - (a.ts || 0));
      items.forEach((it) => {
        const key = it.name.toLowerCase();
        if (seen.has(key) || recent.length >= 10) return;
        seen.add(key);
        recent.push(it);
      });
    }
    if (!recent.length) return "";
    return '<div class="section-title">Recenti</div><div class="chip-row">' +
      recent.map((it) => '<button class="chip" data-recent="' + ui().escapeHtml(it.id) + '" data-rdate="' + findItemDate(data, it.id) + '"><span class="em">' + (it.emoji || "🍽️") + "</span>" + ui().escapeHtml(it.name) + "</button>").join("") +
      "</div>";
  }

  function findItemDate(data, id) {
    for (const [iso, day] of Object.entries(data.nutrition.mealLog)) {
      for (const m of MEALS) if ((day[m.id] || []).some((x) => x.id === id)) return iso;
    }
    return "";
  }

  // voce inserita a mano (kcal/macro di un piatto, senza grammi certi): si modifica coi valori, non coi grammi
  function isManual(it) {
    return !!it.manual || !it.grams;
  }

  // ricostruisce un alimento (valori per 100 g) a partire da una voce del diario
  function foodFromItem(data, it) {
    const known = it.foodId && allFoods(data).find((f) => f.id === it.foodId);
    if (known) return known;
    const k = 100 / (it.grams || 100);
    return { id: "tmp", name: it.name, emoji: it.emoji, cat: it.cat || "altro", kcal: Math.round(it.kcal * k), p: it.p * k, c: it.c * k, f: it.f * k, portion: it.grams };
  }

  function categoryGrid() {
    return '<div class="cat-scroll">' + foods().CATEGORIES.map((c) =>
      '<button class="cat-chip" data-cat="' + c.id + '" style="--tint:' + c.color + '">' + ui().catIcon(c.id, 34) + "<span>" + c.short + "</span></button>"
    ).join("") + "</div>";
  }

  function aiCard() {
    const aiOn = ai().isConfigured();
    return (
      '<div class="card ai-card" style="margin-top:18px;">' +
      '<div class="row" style="align-items:flex-start;"><div>' + (aiOn ? '<span class="ai-badge">' + ui().icon("sparkle") + " ENRICO AI</span>" : "") +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:19px;margin-top:8px;line-height:1.2;">Non trovi un alimento?</div>' +
      '<p class="small muted" style="margin-top:4px;font-weight:600;">' + (aiOn
        ? "Scrivilo e Enrico ti calcola calorie e macro, poi lo salva tra i tuoi alimenti."
        : "Crealo con i valori dell'etichetta (per 100 g): lo ritrovi sempre tra i tuoi alimenti.") + "</p></div>" +
      '<div style="font-size:40px;line-height:1;">🧑‍🍳</div></div>' +
      '<button class="btn" id="nu-ai-add" style="margin-top:12px;">' + ui().icon("plus") + " Aggiungi alimento nuovo</button>" +
      window.GA.quickLog.upsellHtml("Enrico conosce i valori di qualsiasi alimento, anche di marca.", "margin-top:10px;") + "</div>"
    );
  }

  function mealCard(m, items) {
    const kcal = items.reduce((a, it) => a + it.kcal, 0);
    let body = "";
    if (!items.length) body = '<div class="meal-empty">Niente ancora — tocca + per aggiungere.</div>';
    items.forEach((it) => {
      const cat = foods().category(it.cat || "altro");
      body += '<div class="food-row ' + (it.id === lastAddedId ? "enter" : "") + '" data-item="' + it.id + '">' +
        '<div class="food-tile" style="--tint:' + cat.color + '">' + (it.emoji || "🍽️") + "</div>" +
        '<div class="fr-main"><div class="fr-name">' + ui().escapeHtml(it.name) + '</div><div class="fr-meta"><span>' + (it.grams ? it.grams + "g" : "✏️ a mano") + "</span>" + miniMacros(it.p, it.c, it.f) + "</div></div>" +
        '<div class="fr-kcal">' + it.kcal + " <small>kcal</small></div>" +
        '<button class="rm-btn" data-removeitem="' + it.id + '" data-meal="' + m.id + '" aria-label="Rimuovi">' + ui().icon("close") + "</button></div>";
    });
    return (
      '<div class="card meal">' +
      '<div class="meal-head"><div class="meal-emoji" style="background:' + m.color + '">' + m.emoji + '</div><div style="flex:1;"><div class="meal-title">' + m.label + '</div><div class="meal-sub">' + (items.length ? items.length + (items.length === 1 ? " alimento · " : " alimenti · ") + Math.round(kcal) + " kcal" : "vuoto") + "</div></div>" +
      '<button class="add-dot" data-addmeal="' + m.id + '" aria-label="Aggiungi a ' + m.label + '">' + ui().icon("plus") + "</button></div>" +
      '<div class="meal-body">' + body + "</div></div>"
    );
  }

  function miniMacros(p, c, f) {
    return '<span class="mini-macros"><span class="mm-p">P <b>' + Math.round(p) + '</b></span><span class="mm-c">C <b>' + Math.round(c) + '</b></span><span class="mm-f">G <b>' + Math.round(f) + "</b></span></span>";
  }

  /* ---------------- Interazioni ---------------- */
  function wire(container, data) {
    const search = container.querySelector("#nu-search");
    search.addEventListener("input", () => { searchQuery = search.value; renderResults(container, db().getData()); });

    container.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => openCategorySheet(b.dataset.cat)));
    container.querySelectorAll("[data-addmeal]").forEach((b) => b.addEventListener("click", () => openPicker(b.dataset.addmeal)));
    container.querySelector("#nu-ai-add").addEventListener("click", () => openAiFoodSheet(""));

    container.querySelectorAll("[data-recent]").forEach((b) => b.addEventListener("click", () => {
      const d = db().getData();
      const day = d.nutrition.mealLog[b.dataset.rdate] || {};
      let it = null;
      MEALS.forEach((m) => (day[m.id] || []).forEach((x) => { if (x.id === b.dataset.recent) it = x; }));
      if (!it) return;
      const rec = it.recipeId && window.GA.recipes.getRecipe(it.recipeId);
      if (rec) window.GA.recipes.openLog(rec);
      else if (isManual(it)) window.GA.quickLog.openManual({ prefill: it });
      else openQuickAdd(foodFromItem(d, it), { grams: it.grams, fromEl: b });
    }));
    container.querySelector("#nu-targets").addEventListener("click", () => window.GA.app.openTargetsSheet());

    container.querySelectorAll("[data-removeitem]").forEach((b) => b.addEventListener("click", () => {
      const row = b.closest(".food-row");
      row.classList.add("removing");
      ui().haptic(10);
      setTimeout(() => {
        db().updateData((d) => {
          const day = todayLog(d);
          day[b.dataset.meal] = day[b.dataset.meal].filter((it) => it.id !== b.dataset.removeitem);
        });
        window.GA.app.refresh();
      }, 280);
    }));

    container.querySelectorAll(".food-row[data-item]").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-removeitem]")) return;
        const d = db().getData();
        const day = todayLog(d);
        let it = null, meal = null;
        MEALS.forEach((m) => (day[m.id] || []).forEach((x) => { if (x.id === row.dataset.item) { it = x; meal = m.id; } }));
        if (!it) return;
        if (isManual(it)) window.GA.quickLog.openManual({ edit: it, meal });
        else openQuickAdd(foodFromItem(d, it), { grams: it.grams, meal, editItemId: it.id, fromEl: row });
      });
    });
  }

  function renderResults(container, data) {
    const box = container.querySelector("#nu-results");
    const q = searchQuery.trim();
    if (!q) { box.innerHTML = ""; return; }
    const res = foods().search(q, allFoods(data)).slice(0, 8);
    let html = '<div class="card">' + window.GA.recipes.searchRowsHtml(q, 3);
    res.forEach((f) => { html += foodRowHtml(f); });
    html += notFoundRow("nu-ai-q", q, res.length);
    html += "</div>";
    box.innerHTML = html;
    window.GA.recipes.wireRows(box);
    box.querySelectorAll("[data-food]").forEach((row) => row.addEventListener("click", () => {
      openQuickAdd(allFoods(db().getData()).find((f) => f.id === row.dataset.food), { fromEl: row.querySelector(".food-tile") });
    }));
    box.querySelector("#nu-ai-q").addEventListener("click", () => notFoundAction(q));
    window.GA.quickLog.wireUpsell(box);
  }

  // Riga "non è nel catalogo": con Enrico calcola i valori, in base li inserisci a mano
  function notFoundRow(id, q, hasResults) {
    if (ai().isConfigured()) {
      return '<div class="food-row clickable" id="' + id + '"><div class="food-tile" style="--tint:#6D4AFF">✨</div><div class="fr-main"><div class="fr-name">' + (hasResults ? "Non è questo? " : "") + "Chiedi a Enrico: «" + ui().escapeHtml(q) + '»</div><div class="fr-meta">Calorie e macro calcolate al volo</div></div><div class="add-dot">' + ui().icon("sparkle") + "</div></div>";
    }
    return '<div class="food-row clickable" id="' + id + '"><div class="food-tile" style="--tint:#FFF3CF">✏️</div><div class="fr-main"><div class="fr-name">' + (hasResults ? "Non è questo? " : "") + "Aggiungi «" + ui().escapeHtml(q) + '» a mano</div><div class="fr-meta">Inserisci tu calorie e macro</div></div><div class="add-dot">' + ui().icon("plus") + "</div></div>" +
      '<div style="padding:6px 0 10px;">' + window.GA.quickLog.upsellHtml("Enrico avrebbe già i valori di «" + ui().escapeHtml(q) + "».") + "</div>";
  }
  function notFoundAction(q, meal) {
    if (ai().isConfigured()) openAiFoodSheet(q, meal);
    else window.GA.quickLog.openManual({ prefill: { name: q.charAt(0).toUpperCase() + q.slice(1) }, meal });
  }

  function foodRowHtml(f) {
    return '<div class="food-row clickable" data-food="' + f.id + '">' + ui().foodTile(f) +
      '<div class="fr-main"><div class="fr-name">' + ui().escapeHtml(f.name) + (f.custom ? " ⭐" : "") + '</div><div class="fr-meta"><span>' + f.kcal + " kcal/100g</span>" + miniMacros(f.p, f.c, f.f) + "</div></div>" +
      '<div class="add-dot">' + ui().icon("plus") + "</div></div>";
  }

  /* ---------------- Sheet: scegli alimento (per un pasto) ---------------- */
  function openPicker(meal) {
    const m = MEALS.find((x) => x.id === meal);
    const html =
      '<div class="sheet-title"><span class="meal-emoji" style="background:' + m.color + ';width:38px;height:38px;font-size:19px;">' + m.emoji + "</span>Aggiungi a " + m.label.toLowerCase() + "</div>" +
      '<div class="searchbar" style="margin-top:0;">' + ui().icon("search") + '<input type="search" id="pk-q" placeholder="Cerca un alimento…" autocomplete="off" /></div>' +
      '<div id="pk-list" style="margin-top:12px;"></div>';
    const overlay = ui().openSheet(html);
    const q = overlay.querySelector("#pk-q");
    const list = overlay.querySelector("#pk-list");
    function draw() {
      const data = db().getData();
      const term = q.value.trim();
      let inner = "";
      if (!term) {
        inner = '<div class="cat-scroll">' + foods().CATEGORIES.map((c) => '<button class="cat-chip" data-pcat="' + c.id + '" style="--tint:' + c.color + '">' + ui().catIcon(c.id, 30) + "<span>" + c.short + "</span></button>").join("") + "</div>";
      } else {
        const res = foods().search(term, allFoods(data)).slice(0, 20);
        inner = '<div class="card" style="padding:4px 14px;">' + window.GA.recipes.searchRowsHtml(term, 3) + res.map(foodRowHtml).join("") + notFoundRow("pk-ai", term, res.length) + "</div>";
      }
      list.innerHTML = inner;
      window.GA.recipes.wireRows(list, meal);
      list.querySelectorAll("[data-pcat]").forEach((b) => b.addEventListener("click", () => openCategorySheet(b.dataset.pcat, meal)));
      list.querySelectorAll("[data-food]").forEach((row) => row.addEventListener("click", () => {
        openQuickAdd(allFoods(db().getData()).find((f) => f.id === row.dataset.food), { meal, fromEl: row.querySelector(".food-tile") });
      }));
      const aiRow = list.querySelector("#pk-ai");
      if (aiRow) aiRow.addEventListener("click", () => notFoundAction(term, meal));
      window.GA.quickLog.wireUpsell(list);
    }
    q.addEventListener("input", draw);
    draw();
  }

  /* ---------------- Sheet: categoria ---------------- */
  function openCategorySheet(catId, meal) {
    const cat = foods().category(catId);
    const data = db().getData();
    const list = allFoods(data).filter((f) => (foods().CATEGORIES.some((c) => c.id === f.cat) ? f.cat : "altro") === catId);
    const html =
      '<div class="sheet-title">' + ui().catIcon(catId, 38) + ui().escapeHtml(cat.label) + ' <span class="badge" style="margin-left:auto;">' + list.length + "</span></div>" +
      '<div class="searchbar" style="margin-top:0;">' + ui().icon("search") + '<input type="search" id="cs-q" placeholder="Filtra ' + ui().escapeHtml(cat.short.toLowerCase()) + '…" autocomplete="off" /></div>' +
      '<div class="card" style="padding:4px 14px;margin-top:12px;" id="cs-list"></div>';
    const overlay = ui().openSheet(html);
    const q = overlay.querySelector("#cs-q");
    const box = overlay.querySelector("#cs-list");
    function draw() {
      const term = q.value.trim();
      const items = term ? foods().search(term, list) : list;
      box.innerHTML = items.length ? items.map(foodRowHtml).join("") : '<div class="empty">Nessun risultato</div>';
      box.querySelectorAll("[data-food]").forEach((row, i) => {
        row.style.animation = "slideIn .4s var(--ease-spring) both";
        row.style.animationDelay = Math.min(i, 12) * 25 + "ms";
        row.addEventListener("click", () => openQuickAdd(list.find((f) => f.id === row.dataset.food), { meal, fromEl: row.querySelector(".food-tile") }));
      });
    }
    q.addEventListener("input", draw);
    draw();
  }

  /* ---------------- Sheet: aggiunta rapida ---------------- */
  function openQuickAdd(food, opts) {
    if (!food) return;
    opts = opts || {};
    let grams = opts.grams || food.portion || 100;
    let meal = opts.meal || defaultMeal();
    const cat = foods().category(food.cat);
    const maxG = Math.max(500, Math.ceil((food.portion || 100) * 4 / 50) * 50);

    const presets = [...new Set([food.portion || 100, 50, 100, 150, 200].filter((g) => g <= maxG))];
    const html =
      '<div class="qa-head">' + ui().foodTile(food, "lg") +
      '<div><div class="qa-cat">' + ui().escapeHtml(cat.label) + (food.custom ? " · ⭐ tuo" : "") + '</div><div class="qa-name">' + ui().escapeHtml(food.name) + "</div></div></div>" +
      '<div class="qa-grams"><div class="stepper"><button data-g="-10">' + ui().icon("minus") + '</button><div class="value"><span id="qa-g">' + grams + '</span><small> g</small></div><button data-g="10">' + ui().icon("plus") + "</button></div></div>" +
      '<input type="range" class="slider" id="qa-range" min="5" max="' + maxG + '" step="5" value="' + grams + '" />' +
      '<div class="chip-row" style="justify-content:center;">' + presets.map((g, i) => '<button class="chip" data-preset="' + g + '">' + (i === 0 ? "1 porzione · " : "") + g + "g</button>").join("") + "</div>" +
      '<div class="qa-macros">' +
      '<div class="qa-m kcal"><div class="v" id="qa-kcal">0</div><div class="l">kcal</div></div>' +
      '<div class="qa-m p"><div class="v" id="qa-p">0</div><div class="l">Prot</div></div>' +
      '<div class="qa-m c"><div class="v" id="qa-c">0</div><div class="l">Carbo</div></div>' +
      '<div class="qa-m f"><div class="v" id="qa-f">0</div><div class="l">Grassi</div></div></div>' +
      '<div class="segmented" id="qa-meal">' + MEALS.map((m) => '<button data-meal="' + m.id + '" class="' + (m.id === meal ? "active" : "") + '">' + m.emoji + " " + m.label + "</button>").join("") + "</div>" +
      '<button class="btn" id="qa-add" style="margin-top:16px;">' + ui().icon(opts.editItemId ? "check" : "plus") + ' <span id="qa-add-lbl"></span></button>' +
      (food.custom ? '<button class="link-btn" id="qa-delfood" style="color:var(--bad);margin:12px auto 0;display:flex;">Elimina dai miei alimenti</button>' : "");

    const overlay = ui().openSheet(html);
    const range = overlay.querySelector("#qa-range");
    let prevM = { kcal: 0, p: 0, c: 0, f: 0 };

    function update(fromSlider) {
      const m = calc().perGrams(food, grams);
      overlay.querySelector("#qa-g").textContent = grams;
      if (!fromSlider) range.value = grams;
      range.style.setProperty("--pct", ((grams - 5) / (maxG - 5)) * 100 + "%");
      ui().countUp(overlay.querySelector("#qa-kcal"), prevM.kcal, m.kcal, { duration: 300 });
      ui().countUp(overlay.querySelector("#qa-p"), prevM.p, m.p, { duration: 300, decimals: m.p < 10 ? 1 : 0 });
      ui().countUp(overlay.querySelector("#qa-c"), prevM.c, m.c, { duration: 300, decimals: m.c < 10 ? 1 : 0 });
      ui().countUp(overlay.querySelector("#qa-f"), prevM.f, m.f, { duration: 300, decimals: m.f < 10 ? 1 : 0 });
      prevM = m;
      overlay.querySelectorAll("[data-preset]").forEach((b) => b.classList.toggle("on", +b.dataset.preset === grams));
      const ml = MEALS.find((x) => x.id === meal).label.toLowerCase();
      overlay.querySelector("#qa-add-lbl").textContent = opts.editItemId ? "Aggiorna (" + ml + ")" : "Aggiungi a " + ml;
    }
    update();

    overlay.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => { grams = Math.max(5, Math.min(maxG, grams + parseInt(b.dataset.g, 10))); ui().haptic(6); update(); }));
    range.addEventListener("input", () => { grams = parseInt(range.value, 10); update(true); });
    overlay.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { grams = +b.dataset.preset; update(); }));
    overlay.querySelectorAll("#qa-meal [data-meal]").forEach((b) => b.addEventListener("click", () => {
      meal = b.dataset.meal;
      overlay.querySelectorAll("#qa-meal [data-meal]").forEach((x) => x.classList.toggle("active", x === b));
      update();
    }));

    overlay.querySelector("#qa-add").addEventListener("click", () => {
      const m = calc().perGrams(food, grams);
      const tileRect = overlay.querySelector(".food-tile.lg").getBoundingClientRect();
      const newId = db().uid("item");
      db().updateData((d) => {
        const day = todayLog(d);
        if (opts.editItemId) MEALS.forEach((x) => { day[x.id] = day[x.id].filter((it) => it.id !== opts.editItemId); });
        day[meal].push({ id: newId, foodId: food.id !== "tmp" ? food.id : undefined, name: food.name, grams, kcal: m.kcal, p: m.p, c: m.c, f: m.f, emoji: food.emoji || cat.emoji, cat: food.cat, ts: Date.now() });
      });
      lastAddedId = newId;
      ui().haptic(20);
      ui().closeSheet();
      searchQuery = "";
      if (window.GA.app.currentTab() !== "alimentazione") window.GA.app.setTab("alimentazione");
      else window.GA.app.refresh();
      const ring = document.getElementById("nu-ring");
      ui().flyEmoji(food.emoji || cat.emoji, tileRect, ring, () => {
        if (!ring) return;
        ring.classList.remove("bump");
        void ring.offsetWidth;
        ring.classList.add("bump");
        const r = ring.getBoundingClientRect();
        ui().burst(r.left + r.width / 2, r.top + r.height / 2);
      });
      ui().toast((opts.editItemId ? "Aggiornato: " : "Aggiunto a " + MEALS.find((x) => x.id === meal).label.toLowerCase() + ": ") + food.name);
    });

    const del = overlay.querySelector("#qa-delfood");
    if (del) del.addEventListener("click", () => {
      db().updateData((d) => { d.nutrition.customFoods = d.nutrition.customFoods.filter((f) => f.id !== food.id); });
      ui().closeSheet();
      ui().toast("Alimento eliminato");
      window.GA.app.refresh();
    });
  }

  function defaultMeal() {
    const h = new Date().getHours();
    if (h < 11) return "colazione";
    if (h < 16) return "pranzo";
    if (h >= 19 && h < 23) return "cena";
    return "spuntini";
  }

  /* ---------------- Sheet: alimento nuovo (Enrico AI) ---------------- */
  function openAiFoodSheet(initialQuery, meal) {
    const aiOn = ai().isConfigured();
    const html =
      '<div class="sheet-title"><span style="font-size:28px;">🧑‍🍳</span> Alimento nuovo</div>' +
      '<p class="small muted" style="margin:-6px 0 14px;font-weight:600;">' + (aiOn
        ? "Scrivi cosa vuoi aggiungere (anche marca o preparazione): Enrico ti dice calorie e macro."
        : "Inserisci i valori per 100 g. Con Enrico AI attivo (menu → Enrico AI) li calcola lui per te.") + "</p>" +
      '<div class="row" style="gap:8px;"><input type="text" id="af-q" placeholder="es. Pan bauletto integrale, kebab di pollo…" value="' + ui().escapeHtml(initialQuery || "") + '" />' +
      (aiOn ? '<button class="iconbtn" id="af-go" style="background:var(--violet);color:#fff;width:48px;height:48px;">' + ui().icon("sparkle") + "</button>" : "") + "</div>" +
      '<div id="af-out">' + (aiOn ? "" : formHtml({ name: initialQuery || "", cat: "altro", kcal: "", p: "", c: "", f: "", portion: 100 })) + "</div>";
    const overlay = ui().openSheet(html);
    const q = overlay.querySelector("#af-q");
    const out = overlay.querySelector("#af-out");

    if (!aiOn) { wireForm(overlay, meal, () => q.value); return; }

    async function go() {
      const term = q.value.trim();
      if (!term) { q.focus(); return; }
      out.innerHTML = '<div class="card ai-result"><div class="row" style="gap:12px;"><div class="food-tile" style="--tint:#6D4AFF"><span class="typing"><i></i></span></div><div style="flex:1;"><div class="shimmer" style="width:70%;"></div><div class="shimmer" style="width:45%;margin-top:8px;"></div></div></div><div class="shimmer" style="margin-top:14px;"></div><p class="small muted" style="margin-top:10px;font-weight:600;">Enrico sta calcolando i valori…</p></div>';
      try {
        const food = await ai().lookupFood(term);
        const badge = { alta: "good", media: "", bassa: "warn" }[food.confidence] || "";
        out.innerHTML =
          '<div class="card ai-result">' +
          '<div class="row" style="gap:12px;justify-content:flex-start;">' + ui().foodTile(food) + '<div><div style="font-family:var(--font-display);font-weight:800;font-size:18px;">' + ui().escapeHtml(food.name) + '</div><div class="small muted" style="font-weight:700;">per 100 g · ' + ui().escapeHtml(food.basis) + ' <span class="badge ' + badge + '">affidabilità ' + food.confidence + "</span></div></div></div>" +
          (food.note ? '<p class="small" style="margin-top:10px;font-weight:600;">💡 ' + ui().escapeHtml(food.note) + "</p>" : "") +
          "</div>" + formHtml(food);
        wireForm(overlay, meal, () => food.name);
      } catch (err) {
        out.innerHTML = '<div class="card tint-pink flat ai-result"><p class="small" style="font-weight:600;">' + ui().escapeHtml(ai().friendlyError(err)) + "</p></div>" + formHtml({ name: term, cat: "altro", kcal: "", p: "", c: "", f: "", portion: 100 });
        wireForm(overlay, meal, () => q.value);
      }
    }
    overlay.querySelector("#af-go").addEventListener("click", go);
    q.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    if (initialQuery) go();
    else setTimeout(() => q.focus(), 350);
  }

  function formHtml(f) {
    const inp = (id, label, v) => '<div class="field" style="flex:1;margin-bottom:10px;"><label>' + label + '</label><input type="number" inputmode="decimal" id="' + id + '" value="' + (v === "" ? "" : v) + '" /></div>';
    return (
      '<div style="margin-top:14px;">' +
      '<div class="field"><label>Nome</label><input type="text" id="cf-name" value="' + ui().escapeHtml(f.name || "") + '" /></div>' +
      '<div class="field"><label>Categoria</label><select id="cf-cat">' + foods().CATEGORIES.map((c) => '<option value="' + c.id + '" ' + (c.id === f.cat ? "selected" : "") + ">" + c.emoji + " " + c.label + "</option>").join("") + "</select></div>" +
      '<div class="row" style="gap:8px;align-items:flex-start;">' + inp("cf-kcal", "Kcal /100g", f.kcal) + inp("cf-p", "Proteine", f.p) + "</div>" +
      '<div class="row" style="gap:8px;align-items:flex-start;">' + inp("cf-c", "Carboidrati", f.c) + inp("cf-f", "Grassi", f.f) + inp("cf-portion", "Porzione g", f.portion) + "</div>" +
      '<input type="hidden" id="cf-emoji" value="' + ui().escapeHtml(f.emoji || "") + '" />' +
      '<button class="btn" id="cf-save-add">' + ui().icon("plus") + " Salva e aggiungi a un pasto</button>" +
      '<button class="btn secondary" id="cf-save" style="margin-top:10px;">Salva solo nei miei alimenti</button>' +
      "</div>"
    );
  }

  function wireForm(overlay, meal, nameFallback) {
    const read = () => {
      const name = (overlay.querySelector("#cf-name").value || nameFallback() || "").trim();
      if (!name) { ui().toast("Inserisci un nome"); return null; }
      const cat = overlay.querySelector("#cf-cat").value;
      return {
        id: db().uid("cf"), cat, name,
        kcal: parseFloat(overlay.querySelector("#cf-kcal").value) || 0,
        p: parseFloat(overlay.querySelector("#cf-p").value) || 0,
        c: parseFloat(overlay.querySelector("#cf-c").value) || 0,
        f: parseFloat(overlay.querySelector("#cf-f").value) || 0,
        portion: parseInt(overlay.querySelector("#cf-portion").value, 10) || 100,
        emoji: overlay.querySelector("#cf-emoji").value || foods().category(cat).emoji,
      };
    };
    const save = (thenAdd) => {
      const food = read();
      if (!food) return;
      db().updateData((d) => { d.nutrition.customFoods.push(food); });
      ui().toast("⭐ " + food.name + " salvato tra i tuoi alimenti");
      if (thenAdd) openQuickAdd(Object.assign({ custom: true }, food), { meal });
      else { ui().closeSheet(); window.GA.app.refresh(); }
    };
    overlay.querySelector("#cf-save-add").addEventListener("click", () => save(true));
    overlay.querySelector("#cf-save").addEventListener("click", () => save(false));
  }

  window.GA.nutrition = { render, todayLog, totals, openAiFoodSheet, defaultMeal };
})();
