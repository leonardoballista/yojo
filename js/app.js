/* ===========================================================
   app.js — bootstrap di Yojo: routing tra onboarding /
   app principale, topbar, drawer menu, bottom nav, impostazioni,
   Enrico AI, peso corporeo e ricette salvate.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const calc = () => window.GA.calc;
  const coach = () => window.GA.coach;
  const ai = () => window.GA.ai;

  let currentTab = "palestra";
  let deferredInstallPrompt = null;

  function boot() {
    db().ensureUser();
    const data = db().getData();
    if (!data.profile || !data.profile.onboarded) {
      window.GA.onboarding.render();
      return;
    }
    renderMain();
  }

  function renderMain() {
    const root = document.getElementById("app");
    root.innerHTML =
      '<div class="topbar">' +
      '<div class="brand"><span class="brand-mark">' + ui().logo() + "</span>Yojo</div>" +
      menuButton() +
      "</div>" +
      '<div class="view" id="tab-content"></div>' +
      '<nav class="bottomnav">' +
      navBtn("palestra", "palestra", "Palestra") +
      navBtn("alimentazione", "alimentazione", "Cibo") +
      navBtn("sonno", "sonno", "Sonno") +
      "</nav>";

    document.getElementById("btn-menu").addEventListener("click", openMenu);
    root.querySelectorAll(".navbtn").forEach((b) => {
      b.addEventListener("click", () => {
        if (currentTab === b.dataset.tab) return;
        setTab(b.dataset.tab);
      });
    });

    renderTab();
    setTimeout(() => window.GA.onboarding.maybeStartTour(), 450);
  }

  // Il pulsante del menu mostra la foto profilo, se c'è
  function menuButton() {
    const user = db().getCurrentUser();
    const photo = user && user.photo;
    return '<button class="iconbtn menu-btn' + (photo ? " has-photo" : "") + '" id="btn-menu" aria-label="Menu">' + (photo ? ui().avatar(user) : ui().icon("menu")) + "</button>";
  }

  function navBtn(tab, iconName, label) {
    return (
      '<button class="navbtn ' + (currentTab === tab ? "active" : "") + '" data-tab="' + tab + '">' +
      ui().icon(iconName) + "<span>" + label + "</span></button>"
    );
  }

  function setTab(tab) {
    currentTab = tab;
    window.scrollTo(0, 0);
    renderMain();
  }

  function refresh() {
    const y = window.scrollY;
    renderMain();
    const tc = document.getElementById("tab-content");
    tc.classList.add("no-anim");
    window.scrollTo(0, y);
  }

  function renderTab() {
    const container = document.getElementById("tab-content");
    if (currentTab === "palestra") window.GA.workout.render(container);
    else if (currentTab === "alimentazione") window.GA.nutrition.render(container);
    else window.GA.sleep.render(container);
  }

  /* ---------------- Drawer menu ---------------- */
  function openMenu() {
    const user = db().getCurrentUser();
    const aiOn = ai().isConfigured();
    const hasRecipes = db().getData().nutrition.savedRecipes.length > 0;
    const html =
      '<div class="user-block" data-drawer="account" style="cursor:pointer;"><div class="user-photo-wrap"><div class="user-photo">' + ui().avatar(user) + '</div><span class="up-edit" aria-label="Modifica foto">' + ui().icon("edit") + '</span></div><div style="min-width:0;"><div class="user-name">' + ui().escapeHtml(user.name) + '</div><div class="user-email">Dati salvati su questo telefono</div></div></div>' +
      drawerItem("account", "user", "Il mio account", "var(--tangerine)") +
      drawerItem("ai", "sparkle", "Enrico AI" + (aiOn ? ' <span class="badge good" style="margin-left:6px;">attivo</span>' : ' <span class="badge warn" style="margin-left:6px;">da attivare</span>'), "var(--lime)") +
      drawerItem("fabbisogno", "fire", "Fabbisogno giornaliero", "var(--pink)") +
      drawerItem("peso", "scale", "Peso corporeo", "var(--sky)") +
      drawerItem("calendario", "calendar", "Calendario settimanale", "var(--sun)") +
      (hasRecipes ? drawerItem("ricette", "file", "Ricette salvate", "var(--pink)") : "") +
      drawerItem("impostazioni", "settings", "Profilo e obiettivo", "#D9CFFF") +
      drawerItem("aspetto", "theme", "Aspetto: " + THEME_LABELS[window.GA.theme.get()].toLowerCase(), "#fff") +
      (deferredInstallPrompt ? drawerItem("installa", "plus", "Installa app", "#fff") : "") +
      drawerItem("backup", "file", "Backup dei dati", "var(--sky)") +
      drawerItem("reset", "logout", "Reset account", "#fff");

    ui().openDrawer(html);
    document.querySelectorAll("[data-drawer]").forEach((b) => {
      b.addEventListener("click", () => {
        const action = b.dataset.drawer;
        ui().closeDrawer();
        if (action === "account") openAccountSheet();
        else if (action === "ai") openAiSettings();
        else if (action === "fabbisogno") openTargetsSheet();
        else if (action === "peso") openWeightSheet();
        else if (action === "calendario") window.GA.calendarUI.open();
        else if (action === "ricette") openRecipesSheet();
        else if (action === "impostazioni") openSettingsSheet();
        else if (action === "aspetto") openThemeSheet();
        else if (action === "installa") triggerInstall();
        else if (action === "backup") openBackupSheet();
        else if (action === "reset") openResetSheet();
      });
    });
  }

  function drawerItem(action, iconName, label, bg) {
    return '<div class="drawer-item" data-drawer="' + action + '"><span class="di-icon" style="background:' + bg + '">' + ui().icon(iconName) + "</span><span>" + label + "</span></div>";
  }

  /* ---------------- Backup dei dati ---------------- */
  function openBackupSheet() {
    const html =
      '<div class="sheet-title">' + ui().icon("file") + " Backup dei dati</div>" +
      '<p class="small" style="margin:-4px 0 14px;font-weight:600;line-height:1.5;">I tuoi dati vivono solo su questo telefono. Salva ogni tanto un backup (su File, Drive o in chat con te stesso): ti serve per recuperarli se cambi telefono o se il browser li cancella.</p>' +
      '<button class="btn" id="bk-export">' + ui().icon("check") + " Salva backup</button>" +
      '<label class="btn ghost" style="margin-top:10px;">Ripristina da un file<input type="file" id="bk-file" accept="application/json,.json" hidden /></label>' +
      '<p class="small muted" style="margin-top:14px;font-weight:600;line-height:1.5;">Il ripristino sostituisce i dati attuali. La chiave di Enrico AI non viene salvata nel backup.</p>';
    const overlay = ui().openSheet(html);

    overlay.querySelector("#bk-export").addEventListener("click", async () => {
      const name = "yojo-backup-" + coach().todayISO() + ".json";
      const blob = new Blob([JSON.stringify(db().exportBackup())], { type: "application/json" });
      // Sul telefono il pannello di condivisione permette di salvarlo in File/Drive
      try {
        const file = new File([blob], name, { type: "application/json" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Backup Yojo" });
          ui().toast("Backup pronto");
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      ui().toast("Backup scaricato");
    });

    overlay.querySelector("#bk-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        db().importBackup(JSON.parse(await file.text()));
      } catch (err) {
        ui().toast(err instanceof SyntaxError ? "Questo file non è un backup di Yojo." : err.message || "Ripristino non riuscito");
        return;
      }
      ui().closeSheet();
      ui().toast("Dati ripristinati");
      boot();
    });
  }

  /* ---------------- Reset account ---------------- */
  function openResetSheet() {
    const html =
      '<div class="sheet-title">⚠️ Reset account</div>' +
      '<p class="small" style="margin:-4px 0 14px;font-weight:600;line-height:1.5;">Cancella <b>tutti</b> i dati da questo telefono: schede, allenamenti, diario alimentare, peso, chat con Enrico e chiave API. Non si può annullare.</p>' +
      '<button class="btn secondary" id="rs-backup">Prima salva un backup</button>' +
      '<button class="btn danger" id="rs-go" style="margin-top:10px;">Cancella tutto e ricomincia</button>';
    const overlay = ui().openSheet(html);
    overlay.querySelector("#rs-backup").addEventListener("click", openBackupSheet);
    overlay.querySelector("#rs-go").addEventListener("click", () => {
      db().resetAll();
      ui().closeSheet();
      currentTab = "palestra";
      boot();
    });
  }

  /* ---------------- Aspetto: tema chiaro / scuro / automatico ---------------- */
  const THEME_LABELS = { auto: "Automatico", light: "Chiaro", dark: "Scuro" };

  function openThemeSheet() {
    const opt = (id, sub, preview) =>
      '<button class="theme-opt" data-theme-opt="' + id + '">' + preview +
      '<span class="to-txt"><b>' + THEME_LABELS[id] + "</b><span>" + sub + '</span></span><span class="to-check">' + ui().icon("check") + "</span></button>";
    const mini = (bg, surface, ink) => '<span class="to-prev" style="background:' + bg + '"><i style="background:' + surface + ";border-color:" + ink + '"></i><i style="background:' + ink + '"></i></span>';
    const html =
      '<div class="sheet-title">🌗 Aspetto</div>' +
      '<div class="stack" style="gap:10px;">' +
      opt("auto", "Segue il tema del tuo telefono e cambia da solo", '<span class="to-prev split">' + mini("#FFF6EA", "#fff", "#1B1433") + mini("#14101F", "#1F1930", "#F2EEFB") + "</span>") +
      opt("light", "Sempre chiaro", mini("#FFF6EA", "#fff", "#1B1433")) +
      opt("dark", "Sempre scuro, riposante di sera", mini("#14101F", "#1F1930", "#F2EEFB")) +
      "</div>" +
      '<p class="small muted" style="margin-top:14px;font-weight:600;line-height:1.5;">La scelta vale per questo dispositivo.</p>';
    const overlay = ui().openSheet(html);
    const mark = () => overlay.querySelectorAll("[data-theme-opt]").forEach((b) => b.classList.toggle("on", b.dataset.themeOpt === window.GA.theme.get()));
    mark();
    overlay.querySelectorAll("[data-theme-opt]").forEach((b) => b.addEventListener("click", () => {
      window.GA.theme.set(b.dataset.themeOpt);
      ui().haptic(8);
      mark();
    }));
  }

  /* ---------------- Il mio account (nome e foto) ---------------- */
  function openAccountSheet() {
    const user = db().getCurrentUser();
    let photo = user.photo || "";
    const html =
      '<div class="sheet-title">' + ui().icon("user") + " Il mio account</div>" +
      '<label class="profile-photo" id="ac-photo"><span id="ac-photo-inner"></span><span class="pp-edit">' + ui().icon("camera") + "</span>" +
      '<input type="file" id="ac-file" accept="image/*" hidden /></label>' +
      '<div style="text-align:center;margin-bottom:16px;"><button class="link-btn" id="ac-rmphoto" style="color:var(--bad);"></button></div>' +
      '<div class="field"><label>Nome</label><input type="text" id="ac-name" value="' + ui().escapeHtml(user.name) + '" /></div>' +
      '<button class="btn" id="ac-save">' + ui().icon("check") + " Salva</button>";
    const overlay = ui().openSheet(html);
    const nameIn = overlay.querySelector("#ac-name");
    const rm = overlay.querySelector("#ac-rmphoto");

    function drawPhoto() {
      overlay.querySelector("#ac-photo-inner").innerHTML = ui().avatar({ name: nameIn.value || user.name, photo });
      rm.textContent = photo ? "Rimuovi foto" : "";
      rm.style.display = photo ? "" : "none";
    }
    drawPhoto();
    nameIn.addEventListener("input", () => { if (!photo) drawPhoto(); });
    rm.addEventListener("click", () => { photo = ""; drawPhoto(); });

    overlay.querySelector("#ac-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        photo = await squarePhoto(file, 320);
        drawPhoto();
      } catch (err) {
        ui().toast("Non riesco ad aprire questa immagine");
      }
    });

    overlay.querySelector("#ac-save").addEventListener("click", () => {
      const name = nameIn.value.trim();
      if (!name) { ui().toast("Inserisci un nome"); return; }
      try {
        db().updateCurrentUser({ name, photo });
      } catch (err) {
        ui().toast("Memoria del telefono piena: prova con un'altra foto");
        return;
      }
      ui().closeSheet();
      ui().toast("Account aggiornato");
      refresh();
    });
  }

  // Ritaglia al centro un quadrato e lo riduce, così la foto pesa pochi KB
  function squarePhoto(file, size) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        canvas.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("immagine non valida")); };
      img.src = url;
    });
  }

  function triggerInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
  }

  /* ---------------- Enrico AI ---------------- */
  function openAiSettings() {
    const s = ai().settings();
    const html =
      '<div class="sheet-title">' + ui().icon("sparkle") + " Enrico AI</div>" +
      '<p class="small" style="margin:-4px 0 14px;font-weight:600;line-height:1.5;">Enrico usa <b>Claude</b> di Anthropic per leggere le schede e le diete in PDF (anche scansionate) e calcolare calorie e macro di qualsiasi alimento.</p>' +
      '<div class="card tint-sun flat" style="padding:12px 14px;margin-bottom:16px;"><p class="small" style="font-weight:600;line-height:1.5;">1. Crea una chiave su <b>console.anthropic.com</b> → API Keys<br>2. Incollala qui sotto<br><span class="muted">La chiave resta salvata solo su questo dispositivo e viene inviata solo ai server di Anthropic. L\'uso è a consumo sul tuo account Anthropic.</span></p></div>' +
      '<div class="field"><label>Chiave API</label><div class="row" style="gap:8px;"><input type="password" id="ai-key" placeholder="sk-ant-…" value="' + ui().escapeHtml(s.apiKey) + '" autocomplete="off" spellcheck="false" />' +
      '<button class="iconbtn" id="ai-show" aria-label="Mostra">' + ui().icon("key") + "</button></div></div>" +
      '<div class="field"><label>Modello</label><div class="stack" style="gap:8px;" id="ai-models">' +
      ai().MODELS.map((m) => '<div class="choice ' + (m.id === s.model ? "selected" : "") + '" data-model="' + m.id + '" style="text-align:left;"><b>' + m.label + '</b><div class="small muted" style="font-weight:600;">' + m.hint + "</div></div>").join("") +
      "</div></div>" +
      '<div id="ai-status"></div>' +
      '<button class="btn" id="ai-save" style="margin-top:6px;">' + ui().icon("check") + " Salva e prova</button>" +
      (s.apiKey ? '<button class="btn ghost" id="ai-remove" style="margin-top:10px;">Rimuovi chiave</button>' : "");

    const overlay = ui().openSheet(html);
    let model = s.model;
    const keyIn = overlay.querySelector("#ai-key");
    overlay.querySelector("#ai-show").addEventListener("click", () => { keyIn.type = keyIn.type === "password" ? "text" : "password"; });
    overlay.querySelectorAll("[data-model]").forEach((b) => b.addEventListener("click", () => {
      overlay.querySelectorAll("[data-model]").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      model = b.dataset.model;
    }));
    const status = overlay.querySelector("#ai-status");
    overlay.querySelector("#ai-save").addEventListener("click", async (e) => {
      const key = keyIn.value.trim();
      if (!key) { ui().toast("Incolla la chiave API"); return; }
      ai().saveSettings({ apiKey: key, model });
      const btn = e.currentTarget;
      btn.disabled = true;
      status.innerHTML = '<div class="key-status no" style="margin-bottom:10px;"><span class="typing"><i></i><i></i><i></i></span> Provo la connessione…</div>';
      try {
        await ai().testKey();
        status.innerHTML = '<div class="key-status ok" style="margin-bottom:10px;">✅ Enrico AI è attivo!</div>';
        const r = btn.getBoundingClientRect();
        ui().burst(r.left + r.width / 2, r.top);
        setTimeout(() => { ui().closeSheet(); refresh(); }, 900);
      } catch (err) {
        status.innerHTML = '<div class="key-status no" style="margin-bottom:10px;background:var(--t-red);">⚠️ ' + ui().escapeHtml(ai().friendlyError(err)) + "</div>";
        btn.disabled = false;
      }
    });
    const rm = overlay.querySelector("#ai-remove");
    if (rm) rm.addEventListener("click", () => {
      ai().saveSettings({ apiKey: "" });
      ui().closeSheet();
      ui().toast("Chiave rimossa: Enrico torna in modalità base");
      refresh();
    });
  }

  /* ---------------- Peso corporeo ---------------- */
  function openWeightSheet() {
    const data = db().getData();
    const log = data.weightLog.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = log[log.length - 1];
    const first = log[0];
    const last12 = log.slice(-12);
    const minW = Math.min(...last12.map((w) => w.weight)) - 1;
    const maxW = Math.max(...last12.map((w) => w.weight));
    let trend = '<div class="trend">';
    last12.forEach((w, i) => {
      const pct = Math.max(10, Math.round(((w.weight - minW) / Math.max(0.5, maxW - minW)) * 100));
      trend += '<i style="height:' + pct + "%;animation-delay:" + i * 40 + 'ms" title="' + w.weight + 'kg"></i>';
    });
    trend += "</div>";
    const diff = first && last ? Math.round((last.weight - first.weight) * 10) / 10 : 0;

    let rows = "";
    log.slice().reverse().slice(0, 20).forEach((w) => {
      rows += '<div class="list-item"><div class="name">' + w.date + '</div><div class="amount">' + w.weight + " kg</div></div>";
    });

    const html =
      '<div class="sheet-title">⚖️ Peso corporeo</div>' +
      '<div class="card tint-violet"><div class="row"><div><div class="eyebrow">Ultimo peso</div><div class="big-number">' + (last ? last.weight : "–") + ' <span class="small">kg</span></div></div>' +
      (log.length > 1 ? '<div style="text-align:right;"><div class="eyebrow">Da inizio</div><div class="big-number" style="font-size:26px;">' + (diff > 0 ? "+" : "") + diff + ' <span class="small">kg</span></div></div>' : "") + "</div>" +
      (last12.length > 1 ? trend : "") + "</div>" +
      '<div class="field" style="margin-top:18px;"><label>Registra il peso di oggi</label>' +
      '<div class="stepper" style="justify-content:center;"><button data-w="-0.1">' + ui().icon("minus") + '</button><div class="value" id="wt-val">' + (last ? last.weight : 70) + '</div><button data-w="0.1">' + ui().icon("plus") + "</button></div></div>" +
      '<button class="btn" id="wt-save">Salva</button>' +
      '<div class="list" style="margin-top:18px;">' + (rows || '<div class="empty">Nessuna misurazione ancora.</div>') + "</div>";

    const overlay = ui().openSheet(html);
    let val = last ? last.weight : 70;
    overlay.querySelectorAll("[data-w]").forEach((b) => {
      b.addEventListener("click", () => {
        val = Math.round((val + parseFloat(b.dataset.w)) * 10) / 10;
        overlay.querySelector("#wt-val").textContent = val;
      });
    });
    overlay.querySelector("#wt-save").addEventListener("click", () => {
      db().updateData((d) => {
        const today = coach().todayISO();
        d.weightLog = d.weightLog.filter((w) => w.date !== today);
        d.weightLog.push({ id: db().uid("w"), date: today, weight: val });
        d.profile.weight = val;
      });
      ui().toast("Peso salvato");
      openWeightSheet();
    });
  }

  /* ---------------- Ricette salvate ---------------- */
  function openRecipesSheet() {
    const data = db().getData();
    const recipes = data.nutrition.savedRecipes.slice().reverse();
    let rows = "";
    recipes.forEach((r) => {
      rows +=
        '<div class="card" style="margin-bottom:12px;"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px;">' + ui().escapeHtml(r.title) + "</div>" +
        '<div class="small" style="line-height:1.5;">' + ui().md(r.text) + "</div>" +
        '<button class="link-btn" data-delrecipe="' + r.id + '" style="color:var(--bad);margin-top:8px;">Elimina</button></div>';
    });
    const html = '<div class="sheet-title">🍳 Ricette salvate</div>' + (rows || '<div class="empty"><span class="em">🍳</span>Nessuna ricetta salvata ancora. Chiedine una a Enrico.</div>');
    const overlay = ui().openSheet(html);
    overlay.querySelectorAll("[data-delrecipe]").forEach((b) => {
      b.addEventListener("click", () => {
        db().updateData((d) => { d.nutrition.savedRecipes = d.nutrition.savedRecipes.filter((r) => r.id !== b.dataset.delrecipe); });
        openRecipesSheet();
      });
    });
  }

  /* ---------------- Impostazioni ---------------- */
  function openSettingsSheet() {
    const data = db().getData();
    const p = data.profile;
    const html =
      '<div class="sheet-title">' + ui().icon("settings") + " Profilo e obiettivo</div>" +
      '<div class="row" style="gap:8px;">' +
      '<div class="field" style="flex:1;"><label>Peso (kg)</label><input type="number" id="st-weight" value="' + p.weight + '" /></div>' +
      '<div class="field" style="flex:1;"><label>Altezza (cm)</label><input type="number" id="st-height" value="' + p.height + '" /></div>' +
      "</div>" +
      '<div class="row" style="gap:8px;">' +
      '<div class="field" style="flex:1;"><label>Età</label><input type="number" id="st-age" value="' + p.age + '" /></div>' +
      '<div class="field" style="flex:1;"><label>Sesso</label><select id="st-sex"><option value="m" ' + (p.sex === "m" ? "selected" : "") + '>Uomo</option><option value="f" ' + (p.sex === "f" ? "selected" : "") + ">Donna</option></select></div>" +
      "</div>" +
      '<div class="field"><label>Livello di attività</label><select id="st-activity">' +
      Object.keys(calc().ACTIVITY_LABELS).map((k) => '<option value="' + k + '" ' + (p.activity === k ? "selected" : "") + ">" + calc().ACTIVITY_LABELS[k] + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label>Obiettivo</label><div class="choicegrid" id="st-goal" style="grid-template-columns:repeat(3,1fr);">' +
      ["mantenimento", "bulk", "cut"].map((g) => '<div class="choice ' + (p.goal === g ? "selected" : "") + '" data-g="' + g + '">' + g[0].toUpperCase() + g.slice(1) + "</div>").join("") +
      "</div></div>" +
      '<div class="field"><label>Sport praticati</label><div class="choicegrid" id="st-sports" style="grid-template-columns:repeat(3,1fr);">' +
      ["calcio", "pallavolo", "basket"].map((s) => '<div class="choice ' + (p.sports.includes(s) ? "selected" : "") + '" data-s="' + s + '">' + s[0].toUpperCase() + s.slice(1) + "</div>").join("") +
      "</div></div>" +
      '<div class="field"><label>Promemoria scarico (settimane)</label><input type="number" id="st-deload" value="' + data.settings.deloadReminderWeeks + '" /></div>' +
      (data.targets.custom
        ? '<label class="card flat tint-sun" style="display:flex;gap:10px;align-items:center;padding:12px 14px;margin-bottom:14px;"><input type="checkbox" id="st-keep" checked style="width:20px;height:20px;" /><span class="small" style="font-weight:700;">Mantieni il mio fabbisogno personalizzato (' + data.targets.kcal + " kcal)</span></label>"
        : "") +
      '<button class="btn" id="st-save">' + (data.targets.custom ? "Salva" : "Ricalcola e salva") + "</button>" +
      '<button class="btn ghost" id="st-targets" style="margin-top:10px;">' + ui().icon("edit") + " Personalizza calorie e macro</button>";

    const overlay = ui().openSheet(html);
    let goal = p.goal;
    const sports = p.sports.slice();
    overlay.querySelectorAll("#st-goal [data-g]").forEach((b) => {
      b.addEventListener("click", () => { overlay.querySelectorAll("#st-goal [data-g]").forEach((x) => x.classList.remove("selected")); b.classList.add("selected"); goal = b.dataset.g; });
    });
    overlay.querySelectorAll("#st-sports [data-s]").forEach((b) => {
      b.addEventListener("click", () => {
        b.classList.toggle("selected");
        const i = sports.indexOf(b.dataset.s);
        if (i === -1) sports.push(b.dataset.s); else sports.splice(i, 1);
      });
    });
    overlay.querySelector("#st-save").addEventListener("click", () => {
      const profile = {
        weight: parseFloat(overlay.querySelector("#st-weight").value) || p.weight,
        height: parseFloat(overlay.querySelector("#st-height").value) || p.height,
        age: parseInt(overlay.querySelector("#st-age").value, 10) || p.age,
        sex: overlay.querySelector("#st-sex").value,
        activity: overlay.querySelector("#st-activity").value,
        goal, sports, onboarded: true,
      };
      const keep = overlay.querySelector("#st-keep");
      const keepCustom = !!(keep && keep.checked);
      const targets = keepCustom ? data.targets : calc().computeTargets(profile);
      const deloadWeeks = parseInt(overlay.querySelector("#st-deload").value, 10) || 7;
      db().updateData((d) => {
        d.profile = profile;
        d.targets = targets;
        d.settings.deloadReminderWeeks = deloadWeeks;
      });
      ui().closeSheet();
      ui().toast(keepCustom ? "Profilo salvato" : "Fabbisogno ricalcolato");
      refresh();
    });
    overlay.querySelector("#st-targets").addEventListener("click", openTargetsSheet);
  }

  /* ---------------- Fabbisogno personalizzato ---------------- */
  function openTargetsSheet() {
    const data = db().getData();
    const t = data.targets;
    const auto = calc().computeTargets(data.profile);
    const w = data.profile.weight || 70;
    let v = { kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat };
    const num = (id, label, unit) =>
      '<div class="tg-row"><div class="tg-lbl"><span class="dot ' + id + '"></span>' + label + '</div>' +
      '<div class="stepper"><button data-tstep="' + id + '" data-d="-5">' + ui().icon("minus") + '</button><input type="number" inputmode="numeric" class="tg-in" data-t="' + id + '" /><button data-tstep="' + id + '" data-d="5">' + ui().icon("plus") + "</button></div>" +
      '<div class="tg-sub" data-tsub="' + id + '"></div></div>';
    const html =
      '<div class="sheet-title">🎯 Il tuo fabbisogno</div>' +
      '<p class="small muted" style="margin:-6px 0 14px;font-weight:600;line-height:1.5;">Yojo lo calcola dal tuo profilo, ma se hai indicazioni dal nutrizionista o preferisci altri numeri, mettili qui: comandano i tuoi.</p>' +
      '<div class="card" style="padding:14px 16px;">' +
      '<div class="tg-row"><div class="tg-lbl">🔥 Calorie</div><div class="stepper"><button data-tstep="kcal" data-d="-50">' + ui().icon("minus") + '</button><input type="number" inputmode="numeric" class="tg-in" data-t="kcal" /><button data-tstep="kcal" data-d="50">' + ui().icon("plus") + '</button></div><div class="tg-sub">kcal al giorno</div></div>' +
      num("protein", "Proteine") + num("carbs", "Carboidrati") + num("fat", "Grassi") +
      "</div>" +
      '<div class="tg-check" id="tg-check"></div>' +
      '<div class="chip-row" style="margin-top:4px;"><button class="chip" id="tg-fitcarbs">⚖️ Adatta i carbo alle kcal</button><button class="chip" id="tg-fitkcal">🔢 Kcal dalle macro</button></div>' +
      '<button class="btn" id="tg-save" style="margin-top:16px;">' + ui().icon("check") + " Salva il mio fabbisogno</button>" +
      '<button class="btn ghost" id="tg-auto" style="margin-top:10px;">↺ Torna al calcolo automatico (' + auto.kcal + " kcal)</button>";
    const overlay = ui().openSheet(html);

    function draw(skip) {
      overlay.querySelectorAll("[data-t]").forEach((i) => { if (i !== skip) i.value = v[i.dataset.t]; });
      const pct = (g, k) => (v.kcal ? Math.round((g * k * 100) / v.kcal) : 0);
      overlay.querySelector('[data-tsub="protein"]').textContent = "g · " + pct(v.protein, 4) + "% · " + (Math.round((v.protein / w) * 10) / 10) + " g/kg";
      overlay.querySelector('[data-tsub="carbs"]').textContent = "g · " + pct(v.carbs, 4) + "%";
      overlay.querySelector('[data-tsub="fat"]').textContent = "g · " + pct(v.fat, 9) + "% · " + (Math.round((v.fat / w) * 10) / 10) + " g/kg";
      const fromMacro = v.protein * 4 + v.carbs * 4 + v.fat * 9;
      const diff = fromMacro - v.kcal;
      overlay.querySelector("#tg-check").innerHTML = Math.abs(diff) <= Math.max(25, v.kcal * 0.03)
        ? "✓ Le macro corrispondono alle calorie (" + fromMacro + " kcal)"
        : "⚠️ Le macro fanno " + fromMacro + " kcal: " + (diff > 0 ? diff + " in più" : -diff + " in meno") + " delle calorie scelte";
    }
    draw();

    overlay.querySelectorAll("[data-t]").forEach((i) => i.addEventListener("input", () => {
      const n = parseInt(i.value, 10);
      if (!(n >= 0)) return;
      v[i.dataset.t] = n;
      draw(i);
    }));
    overlay.querySelectorAll("[data-tstep]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.tstep;
      v[k] = Math.max(0, v[k] + parseInt(b.dataset.d, 10));
      ui().haptic(6);
      draw();
    }));
    overlay.querySelector("#tg-fitcarbs").addEventListener("click", () => { v.carbs = Math.max(0, Math.round((v.kcal - v.protein * 4 - v.fat * 9) / 4)); draw(); });
    overlay.querySelector("#tg-fitkcal").addEventListener("click", () => { v.kcal = v.protein * 4 + v.carbs * 4 + v.fat * 9; draw(); });
    overlay.querySelector("#tg-auto").addEventListener("click", () => {
      db().updateData((d) => { d.targets = auto; });
      ui().closeSheet();
      ui().toast("Fabbisogno automatico ripristinato");
      refresh();
    });
    overlay.querySelector("#tg-save").addEventListener("click", () => {
      if (v.kcal < 800 || v.kcal > 8000) { ui().toast("Le calorie devono essere tra 800 e 8000"); return; }
      db().updateData((d) => { d.targets = Object.assign({}, d.targets, v, { custom: true, computedAt: Date.now() }); });
      ui().closeSheet();
      ui().toast("🎯 Fabbisogno salvato: " + v.kcal + " kcal");
      refresh();
    });
  }

  /* ---------------- PWA: service worker + install prompt ---------------- */
  function initPWA() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });
  }

  window.GA.app = { boot, refresh, setTab, openAiSettings, openTargetsSheet, currentTab: () => currentTab };
  document.addEventListener("DOMContentLoaded", () => {
    initPWA();
    db().requestPersistence();
    boot();
  });
})();
