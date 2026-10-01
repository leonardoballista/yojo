/* ===========================================================
   quicklog.js — aggiunta veloce nel diario, senza passare dal
   catalogo alimenti:
   - A mano: calorie (e se vuoi macro) di un piatto qualsiasi
   - Importa lista: testo scritto/incollato o PDF con cosa hai
     mangiato e i valori → tutto nel diario in un colpo
   - Foto (Enrico AI): Claude riconosce piatto o confezione
   In modalità base un parser locale capisce righe come
   "Carbonara 650 kcal P 25 C 70 G 28"; con Enrico basta
   scrivere come si parla. Qui vivono anche i piccoli inviti
   a provare Enrico (upsell) mostrati solo in modalità base.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const ai = () => window.GA.ai;
  const calc = () => window.GA.calc;
  const foods = () => window.GA.foods;
  const nut = () => window.GA.nutrition;

  const MEALS = [
    { id: "colazione", label: "Colazione", emoji: "☀️" },
    { id: "pranzo", label: "Pranzo", emoji: "🍝" },
    { id: "cena", label: "Cena", emoji: "🌙" },
    { id: "spuntini", label: "Spuntini", emoji: "🍎" },
  ];
  const r1 = (n) => Math.round((+n || 0) * 10) / 10;
  const numOr0 = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) && n > 0 ? n : 0; };

  /* ---------------- Card "Aggiungi velocemente" ---------------- */
  function actionsHtml() {
    const aiOn = ai().isConfigured();
    const tile = (id, emoji, title, sub, tint, badge) =>
      '<button class="qa-tile" data-quick="' + id + '" style="--tint:' + tint + '">' +
      (badge ? '<span class="qa-badge">' + badge + "</span>" : "") +
      '<span class="qa-emoji">' + emoji + '</span><span class="qa-title">' + title + '</span><span class="qa-sub">' + sub + "</span></button>";
    return (
      '<div class="section-title">Aggiungi velocemente</div>' +
      '<div class="quick-actions">' +
      tile("manual", "✏️", "A mano", "kcal e macro", "#FFF3CF") +
      tile("list", "📋", "Importa lista", "testo o PDF", "#E0F2FF") +
      tile("photo", "📷", "Foto", "piatto o etichetta", "#ECE6FF", aiOn ? "" : "✨ Enrico") +
      "</div>" +
      upsellHtml("Con Enrico ti basta scrivere «pizza margherita e birra media» o fare una foto al piatto.")
    );
  }

  function wireActions(container) {
    container.querySelectorAll("[data-quick]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.quick;
      if (k === "manual") openManual();
      else if (k === "list") openImportList();
      else openPhoto();
    }));
    wireUpsell(container);
  }

  /* ---------------- Inviti a Enrico (solo modalità base) ---------------- */
  function upsellHtml(text, style) {
    if (ai().isConfigured()) return "";
    return '<button class="upsell" data-upsell style="' + (style || "") + '"><span class="up-spark">✨</span><span>' + text + " <b>Scopri Enrico</b></span></button>";
  }
  function wireUpsell(root) {
    root.querySelectorAll("[data-upsell]").forEach((b) => b.addEventListener("click", () => openEnricoPitch()));
  }

  function openEnricoPitch(reason) {
    const row = (emoji, base, pro) =>
      '<div class="pitch-row"><div class="pitch-em">' + emoji + '</div><div><div class="pitch-base">' + base + '</div><div class="pitch-pro">' + pro + "</div></div></div>";
    const html =
      '<div class="sheet-title">✨ Enrico AI</div>' +
      (reason ? '<p class="small" style="margin:-4px 0 12px;font-weight:700;">' + reason + "</p>" : "") +
      '<p class="small muted" style="margin:0 0 14px;font-weight:600;line-height:1.5;">La versione base funziona, ma ti chiede di fare tutto a mano. Con Enrico, Yojo capisce cosa mangi al posto tuo.</p>' +
      '<div class="card flat" style="padding:4px 14px;">' +
      row("📷", "Base: cerchi e pesi ogni ingrediente", "Enrico: fai una foto al piatto o all'etichetta e fa tutto lui") +
      row("✍️", "Base: righe precise tipo «Pasta 80 g 290 kcal»", "Enrico: scrivi come parli, «due fette di pizza e una birra»") +
      row("📄", "Base: solo PDF con testo ben ordinato", "Enrico: legge anche scansioni, foto di fogli e tabelle") +
      row("🧑‍🍳", "Base: " + foods().DB.length + " alimenti in catalogo", "Enrico: calorie e macro di qualsiasi piatto o prodotto") +
      "</div>" +
      '<button class="btn" id="pitch-go" style="margin-top:16px;">' + ui().icon("sparkle") + " Attiva Enrico AI</button>" +
      '<p class="small muted" style="text-align:center;margin-top:10px;font-weight:600;">Serve una chiave Anthropic: la configuri in un minuto.</p>';
    const overlay = ui().openSheet(html);
    overlay.querySelector("#pitch-go").addEventListener("click", () => window.GA.app.openAiSettings());
  }

  /* ---------------- A mano: calorie e macro ---------------- */
  // opts: { edit: item, meal } per modificare una voce; { prefill: item } per ripeterla
  function openManual(opts) {
    opts = opts || {};
    const src = opts.edit || opts.prefill || {};
    let meal = opts.meal || nut().defaultMeal();
    const v = (x) => (x ? r1(x) : "");
    const inp = (id, label, val, ph) => '<div class="field" style="flex:1;margin-bottom:10px;"><label>' + label + '</label><input type="number" inputmode="decimal" id="' + id + '" value="' + val + '" placeholder="' + (ph || "") + '" /></div>';
    const html =
      '<div class="sheet-title">✏️ ' + (opts.edit ? "Modifica voce" : "Aggiungi a mano") + "</div>" +
      '<p class="small muted" style="margin:-6px 0 14px;font-weight:600;">Hai le calorie del piatto (menu, etichetta, app)? Inseriscile qui: le macro sono facoltative.</p>' +
      '<div class="field"><label>Cosa hai mangiato</label><input type="text" id="mn-name" placeholder="es. Carbonara al ristorante" value="' + ui().escapeHtml(src.name || "") + '" /></div>' +
      '<div class="row" style="gap:8px;align-items:flex-start;">' + inp("mn-kcal", "Calorie (kcal)", src.kcal || "", "es. 650") + inp("mn-grams", "Grammi (facoltativo)", src.grams || "", "—") + "</div>" +
      '<div class="row" style="gap:8px;align-items:flex-start;">' + inp("mn-p", "Proteine g", v(src.p)) + inp("mn-c", "Carbo g", v(src.c)) + inp("mn-f", "Grassi g", v(src.f)) + "</div>" +
      '<div class="small muted" id="mn-hint" style="font-weight:700;margin:-4px 0 12px;min-height:18px;"></div>' +
      '<div class="segmented" id="mn-meal">' + MEALS.map((m) => '<button data-meal="' + m.id + '" class="' + (m.id === meal ? "active" : "") + '">' + m.emoji + " " + m.label + "</button>").join("") + "</div>" +
      '<button class="btn" id="mn-save" style="margin-top:16px;">' + ui().icon(opts.edit ? "check" : "plus") + (opts.edit ? " Salva modifiche" : " Aggiungi al diario") + "</button>" +
      (opts.edit ? '<button class="btn ghost" id="mn-del" style="margin-top:10px;color:var(--bad);">' + ui().icon("trash") + " Elimina voce</button>" : "") +
      upsellHtml("Non sai i valori? Con Enrico basta una foto del piatto.", "margin-top:14px;");
    const overlay = ui().openSheet(html);
    const $ = (id) => overlay.querySelector(id);
    wireUpsell(overlay);
    if (!opts.edit) setTimeout(() => $("#mn-name").focus(), 350);

    const hint = () => {
      const p = numOr0($("#mn-p").value), c = numOr0($("#mn-c").value), f = numOr0($("#mn-f").value);
      const fromMacro = Math.round(p * 4 + c * 4 + f * 9);
      const kcal = numOr0($("#mn-kcal").value);
      const el = $("#mn-hint");
      if (!fromMacro) { el.innerHTML = ""; return; }
      if (!kcal) el.innerHTML = 'Dalle macro: <b>' + fromMacro + ' kcal</b> <button class="link-btn" id="mn-usemacro">usa questo valore</button>';
      else if (Math.abs(fromMacro - kcal) > Math.max(30, kcal * 0.12)) el.innerHTML = "⚠️ Le macro danno " + fromMacro + " kcal, diverse da " + kcal + ': controlla i valori <button class="link-btn" id="mn-usemacro">usa ' + fromMacro + "</button>";
      else el.innerHTML = "✓ Macro coerenti con le calorie";
      const use = $("#mn-usemacro");
      if (use) use.addEventListener("click", () => { $("#mn-kcal").value = fromMacro; hint(); });
    };
    ["#mn-kcal", "#mn-p", "#mn-c", "#mn-f"].forEach((id) => $(id).addEventListener("input", hint));
    hint();

    overlay.querySelectorAll("#mn-meal [data-meal]").forEach((b) => b.addEventListener("click", () => {
      meal = b.dataset.meal;
      overlay.querySelectorAll("#mn-meal [data-meal]").forEach((x) => x.classList.toggle("active", x === b));
    }));

    $("#mn-save").addEventListener("click", () => {
      const p = numOr0($("#mn-p").value), c = numOr0($("#mn-c").value), f = numOr0($("#mn-f").value);
      let kcal = numOr0($("#mn-kcal").value) || Math.round(p * 4 + c * 4 + f * 9);
      if (!kcal) { ui().toast("Inserisci almeno le calorie"); $("#mn-kcal").focus(); return; }
      const name = $("#mn-name").value.trim() || "Pasto " + MEALS.find((m) => m.id === meal).label.toLowerCase();
      const item = { name, grams: Math.round(numOr0($("#mn-grams").value)), kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f), emoji: src.emoji || "🍽️", cat: "altro", manual: true };
      addItems([Object.assign(item, { meal })], opts.edit ? opts.edit.id : null);
      ui().closeSheet();
      ui().toast(opts.edit ? "Voce aggiornata" : "Aggiunto: " + name + " · " + item.kcal + " kcal");
    });
    const del = $("#mn-del");
    if (del) del.addEventListener("click", () => {
      db().updateData((d) => { const day = nut().todayLog(d); MEALS.forEach((m) => { day[m.id] = (day[m.id] || []).filter((x) => x.id !== opts.edit.id); }); });
      ui().closeSheet();
      ui().toast("Voce eliminata");
      window.GA.app.refresh();
    });
  }

  // Aggiunge voci al diario di oggi (replaceId: voce da sostituire)
  function addItems(items, replaceId) {
    db().updateData((d) => {
      const day = nut().todayLog(d);
      if (replaceId) MEALS.forEach((m) => { day[m.id] = (day[m.id] || []).filter((x) => x.id !== replaceId); });
      items.forEach((it) => {
        const meal = MEALS.some((m) => m.id === it.meal) ? it.meal : nut().defaultMeal();
        day[meal].push({
          id: db().uid("item"), foodId: it.foodId, name: it.name, grams: it.grams || 0, kcal: Math.round(it.kcal), p: r1(it.p), c: r1(it.c), f: r1(it.f),
          emoji: it.emoji || "🍽️", cat: it.cat || "altro", manual: it.manual !== false && !it.foodId, recipeId: it.recipeId, ts: Date.now(),
        });
      });
    });
    if (window.GA.app.currentTab() !== "alimentazione") window.GA.app.setTab("alimentazione");
    else window.GA.app.refresh();
  }

  /* ---------------- Importa lista: testo o PDF ---------------- */
  function openImportList() {
    const aiOn = ai().isConfigured();
    let mode = "text";
    const example = aiOn
      ? "es.\nColazione: cappuccino e cornetto alla crema\nPranzo: poke salmone e avocado, porzione grande\nMerenda: barretta proteica\nCena: 2 fette di pizza margherita e una birra media"
      : "Una riga per alimento, es.\nCarbonara 650 kcal P 25 C 70 G 28\nCappuccino 120 kcal\nPizza margherita 850kcal 35p 105c 30g\nPasta 80 g";
    const html =
      '<div class="sheet-title">📋 Importa cosa hai mangiato</div>' +
      '<div class="segmented" id="il-mode" style="margin-bottom:14px;"><button data-mode="text" class="active">✍️ Scrivi o incolla</button><button data-mode="pdf">📄 PDF</button></div>' +
      '<div id="il-text"><textarea id="il-area" rows="7" placeholder="' + ui().escapeHtml(example) + '" style="width:100%;resize:vertical;"></textarea>' +
      '<button class="btn" id="il-go" style="margin-top:12px;">' + ui().icon(aiOn ? "sparkle" : "check") + (aiOn ? " Analizza con Enrico" : " Leggi la lista") + "</button></div>" +
      '<div id="il-pdf" style="display:none;"><label class="dropzone" id="il-drop"><div style="font-size:40px;margin-bottom:6px;">📄</div>' +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:18px;">Scegli il PDF</div><div class="small muted" style="margin-top:4px;">diario, export di un\'altra app, lista della spesa…</div>' +
      '<input type="file" id="il-file" accept="application/pdf,.pdf" hidden /></label></div>' +
      '<div class="key-status ' + (aiOn ? "ok" : "no") + '" style="margin-top:14px;">' + (aiOn
        ? "✨ Enrico AI attivo: scrivi come ti viene, stima lui porzioni e valori che mancano."
        : "⚡ Modalità base: capisco righe con i numeri scritti (kcal, P, C, G, grammi). Quello che non riconosco lo completi tu.") + "</div>" +
      upsellHtml("Con Enrico non servono i numeri: scrivi solo cosa hai mangiato.", "margin-top:10px;") +
      '<div id="il-progress" style="margin-top:12px;"></div>';
    const overlay = ui().openSheet(html);
    wireUpsell(overlay);
    const area = overlay.querySelector("#il-area");
    overlay.querySelectorAll("#il-mode [data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      overlay.querySelectorAll("#il-mode [data-mode]").forEach((x) => x.classList.toggle("active", x === b));
      overlay.querySelector("#il-text").style.display = mode === "text" ? "" : "none";
      overlay.querySelector("#il-pdf").style.display = mode === "pdf" ? "" : "none";
    }));
    const progress = (msg) => { overlay.querySelector("#il-progress").innerHTML = msg ? '<div class="key-status no"><span class="typing"><i></i><i></i><i></i></span> ' + msg + "</div>" : ""; };

    overlay.querySelector("#il-go").addEventListener("click", async (e) => {
      const text = area.value.trim();
      if (!text) { area.focus(); return; }
      const btn = e.currentTarget;
      btn.disabled = true;
      let items = null, note = "";
      if (aiOn) {
        progress("Enrico sta leggendo la lista…");
        try { const r = await ai().analyzeFoodLog({ text }); items = r.items; note = r.note; }
        catch (err) { ui().toast(ai().friendlyError(err) + " Provo in locale…", 3500); }
      }
      if (!items || !items.length) items = parseText(text);
      progress("");
      btn.disabled = false;
      if (!items.length) { ui().toast("Non ho trovato alimenti: scrivi una riga per alimento"); return; }
      openReview(items, { note });
    });

    const handlePdf = async (file) => {
      if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { ui().toast("Seleziona un file PDF"); return; }
      if (file.size > window.GA.pdfImport.MAX_BYTES) { ui().toast("Il PDF è troppo grande (max 25 MB)"); return; }
      const buf = await file.arrayBuffer();
      let items = null, note = "";
      if (aiOn) {
        progress("Enrico sta leggendo il PDF…");
        try { const r = await ai().analyzeFoodLog({ pdf: window.GA.pdfImport.toBase64(buf) }); items = r.items; note = r.note; }
        catch (err) { ui().toast(ai().friendlyError(err) + " Provo in locale…", 3500); }
      }
      if (!items || !items.length) {
        progress("Leggo il testo del PDF…");
        try { items = parseText((await window.GA.pdfImport.extractLines(buf.slice(0))).join("\n")); }
        catch (err) { progress(""); ui().toast("Non riesco a leggere il PDF: " + (err.message || err), 4000); return; }
      }
      progress("");
      if (!items.length) {
        overlay.querySelector("#il-progress").innerHTML = '<div class="card tint-pink flat"><p class="small" style="font-weight:600;">Non ho trovato alimenti con valori nel PDF.' + (aiOn ? "" : " Se è scansionato o senza numeri, Enrico AI riesce a leggerlo.") + "</p></div>";
        return;
      }
      openReview(items, { note });
    };
    const input = overlay.querySelector("#il-file");
    const drop = overlay.querySelector("#il-drop");
    input.addEventListener("change", () => input.files[0] && handlePdf(input.files[0]));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handlePdf(f); });
  }

  /* ---------------- Foto del piatto o della confezione (Enrico) ---------------- */
  function openPhoto() {
    if (!ai().isConfigured()) {
      openEnricoPitch("📷 Il riconoscimento da foto è una funzione di Enrico AI.");
      return;
    }
    const html =
      '<div class="sheet-title">📷 Cosa hai mangiato?</div>' +
      '<p class="small muted" style="margin:-6px 0 14px;font-weight:600;">Fotografa il piatto oppure la confezione (meglio se si vede la tabella nutrizionale): Enrico riconosce tutto e stima porzioni e valori.</p>' +
      '<div class="row" style="gap:10px;">' +
      '<label class="btn" style="flex:1;">' + ui().icon("camera") + ' Scatta<input type="file" id="ph-cam" accept="image/*" capture="environment" hidden /></label>' +
      '<label class="btn secondary" style="flex:1;">' + ui().icon("file") + ' Galleria<input type="file" id="ph-gal" accept="image/*" hidden /></label></div>' +
      '<div class="field" style="margin-top:14px;"><label>Nota per Enrico (facoltativa)</label><input type="text" id="ph-note" placeholder="es. ne ho mangiato metà, condito con poco olio" /></div>' +
      '<div id="ph-out"></div>';
    const overlay = ui().openSheet(html);
    const out = overlay.querySelector("#ph-out");
    const go = async (file) => {
      if (!file) return;
      let img;
      try { img = await resizeImage(file, 1568); }
      catch (e) { ui().toast("Non riesco ad aprire questa immagine"); return; }
      out.innerHTML = '<div class="card ai-result" style="margin-top:4px;"><img src="' + img.dataUrl + '" alt="" class="ph-preview" />' +
        '<div class="shimmer" style="margin-top:12px;width:70%;"></div><div class="shimmer" style="margin-top:8px;width:45%;"></div>' +
        '<p class="small muted" style="margin-top:10px;font-weight:600;">Enrico sta guardando la foto…</p></div>';
      try {
        const r = await ai().analyzeFoodLog({ image: img.base64, mediaType: "image/jpeg", text: overlay.querySelector("#ph-note").value.trim() });
        if (!r.items.length) throw new Error("Non ho riconosciuto cibo in questa foto: prova con un'altra inquadratura.");
        openReview(r.items, { note: r.note, photo: img.dataUrl });
      } catch (err) {
        out.innerHTML = '<div class="card tint-pink flat ai-result"><p class="small" style="font-weight:600;">' + ui().escapeHtml(ai().friendlyError(err)) + "</p></div>";
      }
    };
    overlay.querySelector("#ph-cam").addEventListener("change", (e) => go(e.target.files[0]));
    overlay.querySelector("#ph-gal").addEventListener("change", (e) => go(e.target.files[0]));
  }

  // Riduce la foto (lato lungo max `max` px) e la converte in JPEG base64
  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * k);
        canvas.height = Math.round(img.naturalHeight * k);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ dataUrl, base64: dataUrl.split(",")[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("immagine non valida")); };
      img.src = url;
    });
  }

  /* ---------------- Revisione prima di aggiungere ---------------- */
  function openReview(items, opts) {
    opts = opts || {};
    items = items.map((it) => Object.assign({}, it, { meal: it.meal || nut().defaultMeal() }));
    const html =
      '<div class="sheet-title">' + ui().icon("check") + " Controlla e aggiungi</div>" +
      (opts.photo ? '<img src="' + opts.photo + '" alt="" class="ph-preview" style="margin-bottom:12px;" />' : "") +
      (opts.note ? '<div class="card tint-lime flat" style="padding:10px 14px;margin-bottom:12px;"><p class="small" style="font-weight:600;">💡 ' + ui().escapeHtml(opts.note) + "</p></div>" : "") +
      '<div id="rv-list"></div>' +
      '<div class="rv-total" id="rv-total"></div>' +
      '<button class="btn" id="rv-add" style="margin-top:12px;"></button>';
    const overlay = ui().openSheet(html);
    const list = overlay.querySelector("#rv-list");

    function total() {
      const t = items.reduce((a, it) => ({ kcal: a.kcal + (+it.kcal || 0), p: a.p + (+it.p || 0), c: a.c + (+it.c || 0), f: a.f + (+it.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
      overlay.querySelector("#rv-total").innerHTML = "Totale <b>" + Math.round(t.kcal) + " kcal</b> · P " + Math.round(t.p) + " · C " + Math.round(t.c) + " · G " + Math.round(t.f);
      const missing = items.filter((it) => !(+it.kcal > 0)).length;
      const btn = overlay.querySelector("#rv-add");
      btn.innerHTML = ui().icon("plus") + " Aggiungi al diario (" + items.length + ")";
      btn.disabled = !items.length;
      btn.dataset.missing = missing;
    }

    function draw() {
      const field = (i, k, label) => '<label class="rv-num"><span>' + label + '</span><input type="number" inputmode="decimal" data-rv="' + i + '" data-k="' + k + '" value="' + (items[i][k] === "" || items[i][k] == null ? "" : +items[i][k] ? r1(items[i][k]) : "") + '" /></label>';
      list.innerHTML = items.map((it, i) =>
        '<div class="rv-item' + (+it.kcal > 0 ? "" : " missing") + '">' +
        '<div class="row" style="gap:8px;"><span style="font-size:22px;">' + (it.emoji || "🍽️") + '</span><input type="text" data-rv="' + i + '" data-k="name" value="' + ui().escapeHtml(it.name) + '" style="flex:1;min-width:0;font-weight:700;" />' +
        '<button class="rm-btn" data-rvdel="' + i + '" aria-label="Rimuovi">' + ui().icon("close") + "</button></div>" +
        '<div class="rv-nums">' + field(i, "kcal", "kcal") + field(i, "p", "P") + field(i, "c", "C") + field(i, "f", "G") + "</div>" +
        '<div class="row" style="gap:8px;margin-top:6px;"><select data-rv="' + i + '" data-k="meal" style="flex:1;">' + MEALS.map((m) => '<option value="' + m.id + '" ' + (m.id === it.meal ? "selected" : "") + ">" + m.emoji + " " + m.label + "</option>").join("") + "</select>" +
        '<span class="small muted" style="font-weight:700;white-space:nowrap;">' + (it.grams ? it.grams + " g" : "porzione") + (it.source === "etichetta" ? " · 🏷️ etichetta" : it.source === "ricetta" ? " · 📖 ricetta" : it.source === "stima" ? " · stima" : it.unknown ? " · ⚠️ da completare" : "") + "</span></div>" +
        "</div>"
      ).join("") || '<div class="empty">Nessun alimento</div>';
      list.querySelectorAll("[data-rv]").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
        const it = items[+el.dataset.rv];
        const k = el.dataset.k;
        it[k] = k === "name" || k === "meal" ? el.value : numOr0(el.value);
        if (k === "kcal") el.closest(".rv-item").classList.toggle("missing", !(it.kcal > 0));
        total();
      }));
      list.querySelectorAll("[data-rvdel]").forEach((b) => b.addEventListener("click", () => { items.splice(+b.dataset.rvdel, 1); draw(); }));
      total();
    }
    draw();

    overlay.querySelector("#rv-add").addEventListener("click", (e) => {
      const ok = items.filter((it) => it.name.trim());
      const missing = ok.filter((it) => !(+it.kcal > 0));
      if (missing.length && !e.currentTarget.dataset.confirm) {
        e.currentTarget.dataset.confirm = "1";
        ui().toast(missing.length + (missing.length === 1 ? " alimento è" : " alimenti sono") + " senza calorie: completale o tocca di nuovo per aggiungere comunque");
        return;
      }
      addItems(ok.map((it) => Object.assign({}, it, { kcal: +it.kcal || 0, name: it.name.trim(), manual: !it.foodId })));
      ui().closeSheet();
      ui().toast("🎉 " + ok.length + (ok.length === 1 ? " alimento aggiunto" : " alimenti aggiunti") + " al diario");
    });
  }

  /* ---------------- Parser locale (modalità base) ---------------- */
  const NUM = "(\\d+(?:[.,]\\d+)?)";
  const MEAL_HEAD = /^\s*(colazione|pranzo|cena|spuntin[oi]|merenda|snack|pre[\s-]?workout|post[\s-]?workout)\b\s*[:\-–]?\s*/i;
  const KCAL_RES = [new RegExp(NUM + "\\s*(?:kcal|cal\\b|calorie)", "i"), new RegExp("(?:kcal|calorie)\\s*[:=]?\\s*" + NUM, "i")];
  // pre: "P 25", "proteine: 25"; post: "25p", "25 g di proteine".
  // Dopo un numero le lettere singole valgono solo attaccate al numero ("35p"), così
  // "Pasta 80 g P 10" non diventa 80 g di proteine; e "20g" da solo sono grammi, non grassi.
  const MACROS = {
    p: { pre: "proteine|prot|pro|p", long: "proteine|prot", letter: "p" },
    c: { pre: "carboidrati|carbo|carb|cho|c", long: "carboidrati|carbo|carb|cho", letter: "c" },
    f: { pre: "grassi|lipidi|fat|g|f", long: "grassi|lipidi|fat", letter: "f" },
  };
  const toNum = (s) => parseFloat(s.replace(",", "."));

  function mealOf(word) {
    const n = foods().normalize(word);
    if (/colazione/.test(n)) return "colazione";
    if (/pranzo/.test(n)) return "pranzo";
    if (/cena/.test(n)) return "cena";
    return "spuntini";
  }

  function takeMacro(s, words) {
    const pre = new RegExp("(^|[\\s,;(|/:-])(?:" + words.pre + ")\\s*[:=.]?\\s*" + NUM + "(?:\\s*(?:g|gr)(?!\\s*\\d))?(?![a-zà-ù\\d])", "i");
    const post = new RegExp(NUM + "\\s*(?:(?:g|gr)?\\s*(?:di\\s+)?(?:" + words.long + ")|(?:" + words.letter + "))(?![a-zà-ù])", "i");
    let m = s.match(post);
    if (m) return { v: toNum(m[1]), rest: s.slice(0, m.index) + " " + s.slice(m.index + m[0].length) };
    m = s.match(pre);
    if (m) return { v: toNum(m[2]), rest: s.slice(0, m.index) + m[1] + " " + s.slice(m.index + m[0].length) };
    return null;
  }

  function parseLine(line, meal) {
    let s = " " + line.replace(/\t/g, " ").replace(/\s+/g, " ") + " ";
    let kcal = null, grams = 0;
    for (const re of KCAL_RES) {
      const m = s.match(re);
      if (m) { kcal = toNum(m[1]); s = s.slice(0, m.index) + " " + s.slice(m.index + m[0].length); break; }
    }
    const mac = {};
    Object.keys(MACROS).forEach((k) => {
      const r = takeMacro(s, MACROS[k]);
      if (r) { mac[k] = r.v; s = r.rest; }
    });
    // "…35p 105c 30g": dopo proteine e carbo, un "30g" in fondo alla riga sono i grassi
    if (mac.p != null && mac.c != null && mac.f == null) {
      const all = [...s.matchAll(new RegExp(NUM + "\\s*g(?![a-zà-ù])", "gi"))];
      const last = all[all.length - 1];
      if (last && /\d\s*g\s*$/i.test(line.trim()) && (all.length > 1 || !s.slice(last.index + last[0].length).trim())) {
        mac.f = toNum(last[1]);
        s = s.slice(0, last.index) + " " + s.slice(last.index + last[0].length);
      }
    }
    const gm = s.match(new RegExp(NUM + "\\s*(g|gr|grammi|ml)(?![a-zà-ù])", "i"));
    if (gm) { grams = toNum(gm[1]); s = s.slice(0, gm.index) + " " + s.slice(gm.index + gm[0].length); }

    // tabella senza etichette: "Pasta | 80 | 290 | 10 | 58 | 1,5"
    if (kcal == null && !Object.keys(mac).length) {
      const nums = (s.match(/\d+(?:[.,]\d+)?/g) || []).map(toNum);
      if (nums.length >= 4) {
        const t = nums.slice(-4);
        if (Math.abs(t[1] * 4 + t[2] * 4 + t[3] * 9 - t[0]) <= Math.max(40, t[0] * 0.25)) {
          kcal = t[0]; mac.p = t[1]; mac.c = t[2]; mac.f = t[3];
          if (nums.length >= 5 && !grams) grams = nums[nums.length - 5];
          s = s.replace(/\d+(?:[.,]\d+)?/g, " ");
        }
      }
    }
    let name = s.replace(/\|/g, " ").replace(/\d+(?:[.,]\d+)?/g, " ").replace(/\b(kcal|cal|g|gr)\b/gi, " ").replace(/^[\s\-–•·*:,;.()]+|[\s\-–•·*:,;.(]+$/g, "").replace(/\s{2,}/g, " ").trim();
    if (!/[a-zà-ù]{2}/i.test(name)) return null;
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const hasMac = mac.p != null || mac.c != null || mac.f != null;
    if (kcal == null && hasMac) kcal = Math.round((mac.p || 0) * 4 + (mac.c || 0) * 4 + (mac.f || 0) * 9);
    if (kcal != null) return { name, meal, grams: Math.round(grams), kcal: Math.round(kcal), p: r1(mac.p), c: r1(mac.c), f: r1(mac.f), emoji: "🍽️" };

    // nessun valore scritto: prima un piatto del libro delle ricette, poi il catalogo
    const dish = window.GA.recipes.matchDish(name);
    if (dish) {
      const it = window.GA.recipes.dishItem(dish, 1);
      if (grams && it.grams) {
        const k = grams / it.grams;
        Object.assign(it, { grams: Math.round(grams), kcal: Math.round(it.kcal * k), p: r1(it.p * k), c: r1(it.c * k), f: r1(it.f * k) });
      }
      return Object.assign(it, { meal, source: "ricetta" });
    }
    const food = window.GA.diet.matchFood(name);
    if (food) {
      const g = grams || food.portion || 100;
      const m = calc().perGrams(food, g);
      return { name, meal, grams: Math.round(g), kcal: m.kcal, p: m.p, c: m.c, f: m.f, emoji: food.emoji || foods().category(food.cat).emoji, cat: food.cat, foodId: food.id, source: "catalogo" };
    }
    return { name, meal, grams: Math.round(grams), kcal: 0, p: 0, c: 0, f: 0, emoji: "❓", unknown: true };
  }

  function parseText(text) {
    let meal = "";
    const out = [];
    text.split(/\r?\n|;/).forEach((raw) => {
      let line = raw.trim();
      if (!line || line.length > 200) return;
      const mh = line.match(MEAL_HEAD);
      if (mh) {
        meal = mealOf(mh[1]);
        line = line.slice(mh[0].length).trim();
        if (!line) return;
      }
      // "pranzo: pasta 80 g, pollo 150 g" → più alimenti sulla stessa riga se non ci sono valori
      const parts = !KCAL_RES.some((re) => re.test(line)) && /,/.test(line) ? line.split(/\s*,\s*/) : [line];
      parts.forEach((p) => { const it = parseLine(p, meal); if (it) out.push(it); });
    });
    return out;
  }

  window.GA.quickLog = { actionsHtml, wireActions, openManual, openImportList, openPhoto, openEnricoPitch, upsellHtml, wireUpsell, parseText };
})();
