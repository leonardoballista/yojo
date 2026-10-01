/* ===========================================================
   calendar.js — pianificazione settimanale (giorni palestra +
   partite/allenamenti sportivi), con avviso se si programmano
   le gambe il giorno prima di una partita.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;

  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  function isoPlusDays(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function labelForDate(iso, n) {
    const d = new Date(iso + "T00:00:00");
    const rel = n === 0 ? "Oggi" : n === 1 ? "Domani" : DAY_NAMES[d.getDay()];
    return rel + " · " + d.getDate() + "/" + (d.getMonth() + 1);
  }

  function isLegDay(day) {
    if (!day) return false;
    const t = day.label.toLowerCase();
    if (t.includes("leg")) return true;
    return day.exercises.some((e) => /squat|leg|affondi|stacco/i.test(e.name));
  }

  function open() {
    const overlay = ui().openSheet(bodyHtml(), {});
    wire(overlay);
  }

  function bodyHtml() {
    const data = db().getData();
    let rows = "";
    for (let n = 0; n < 10; n++) {
      const iso = isoPlusDays(n);
      const entry = data.calendar.find((c) => c.date === iso);
      rows +=
        '<div class="list-item" data-date="' + iso + '">' +
        '<div class="left"><div class="emoji-badge">' + (entry ? typeEmoji(entry.type) : "·") + "</div>" +
        '<div><div class="name">' + labelForDate(iso, n) + '</div><div class="meta">' + (entry ? ui().escapeHtml(entry.label) : "Non pianificato") + "</div></div></div>" +
        '<button class="link-btn" data-edit="' + iso + '">Modifica</button>' +
        "</div>";
    }
    return (
      '<div class="sheet-title">Calendario settimanale</div>' +
      '<div class="small muted" style="margin-bottom:10px;">Pianifica giorni palestra e partite: ti avviso se programmi le gambe il giorno prima di una gara.</div>' +
      '<div class="list">' + rows + "</div>"
    );
  }

  function typeEmoji(type) {
    if (type === "gym") return "●";
    if (type === "match") return "▲";
    return "–";
  }

  function wire(overlay) {
    overlay.querySelectorAll("[data-edit]").forEach((b) => {
      b.addEventListener("click", () => openEditor(b.dataset.edit));
    });
  }

  function openEditor(iso) {
    const data = db().getData();
    const plan = data.plan;
    let dayOptions = "";
    if (plan) {
      plan.days.forEach((d) => {
        dayOptions += '<div class="choice" data-gymday="' + d.id + '">' + ui().escapeHtml(d.label) + "</div>";
      });
    }
    const html =
      '<div class="sheet-title">' + labelForDate(iso, Math.round((new Date(iso) - new Date(isoPlusDays(0))) / 86400000)) + "</div>" +
      '<div class="field"><label>Tipo di giorno</label><div class="choicegrid">' +
      '<div class="choice" data-type="rest">Riposo</div>' +
      '<div class="choice" data-type="gym">Palestra</div>' +
      '<div class="choice" data-type="match">Partita</div>' +
      "</div></div>" +
      (plan ? '<div class="field" id="gymday-field" style="display:none;"><label>Quale scheda</label><div class="stack">' + dayOptions + "</div></div>" : "") +
      '<div class="field" id="match-field" style="display:none;"><label>Sport / nota</label><input type="text" id="cal-label" placeholder="es. Partita di calcio" /></div>' +
      '<button class="btn" id="cal-remove" style="background:transparent;color:var(--bad);border-color:var(--bad);margin-top:6px;">Rimuovi pianificazione</button>';

    const overlay = ui().openSheet(html, { center: true });
    let chosenType = null, chosenGymDay = null;

    overlay.querySelectorAll("[data-type]").forEach((b) => {
      b.addEventListener("click", () => {
        overlay.querySelectorAll("[data-type]").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        chosenType = b.dataset.type;
        overlay.querySelector("#gymday-field") && (overlay.querySelector("#gymday-field").style.display = chosenType === "gym" ? "block" : "none");
        overlay.querySelector("#match-field").style.display = chosenType === "match" ? "block" : "none";
      });
    });
    overlay.querySelectorAll("[data-gymday]").forEach((b) => {
      b.addEventListener("click", () => {
        overlay.querySelectorAll("[data-gymday]").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        chosenGymDay = b.dataset.gymday;
        finalizeSave();
      });
    });

    function finalizeSave() {
      if (chosenType === "gym" && !chosenGymDay) return; // aspetta scelta scheda
      saveEntry(iso, chosenType, chosenGymDay);
    }

    // salva subito per rest/match al click sul tipo (senza bisogno di altro input se rest)
    overlay.querySelectorAll("[data-type]").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.type === "rest") saveEntry(iso, "rest", null);
      });
    });

    const labelInput = overlay.querySelector("#cal-label");
    if (labelInput) {
      labelInput.addEventListener("change", () => {
        if (chosenType === "match") saveEntry(iso, "match", null, labelInput.value);
      });
    }

    overlay.querySelector("#cal-remove").addEventListener("click", () => {
      db().updateData((data) => {
        data.calendar = data.calendar.filter((c) => c.date !== iso);
      });
      ui().closeSheet();
      open();
    });

    function saveEntry(date, type, gymDayId, customLabel) {
      const data = db().getData();
      let label = "Riposo";
      if (type === "gym") {
        const day = data.plan.days.find((d) => d.id === gymDayId);
        label = day ? day.label : "Palestra";
      } else if (type === "match") {
        label = customLabel || "Partita";
      }
      db().updateData((data) => {
        data.calendar = data.calendar.filter((c) => c.date !== date);
        data.calendar.push({ id: db().uid("cal"), date, type, label, dayId: gymDayId || null });
      });

      // Avviso: gambe il giorno prima di una partita
      if (type === "gym" && data.plan) {
        const day = data.plan.days.find((d) => d.id === gymDayId);
        const nextIso = new Date(new Date(date).getTime() + 86400000).toISOString().slice(0, 10);
        const nextEntry = data.calendar.find((c) => c.date === nextIso && c.type === "match");
        if (isLegDay(day) && nextEntry) {
          ui().toast("Attenzione: hai una partita il giorno dopo (" + nextEntry.label + "). Meglio evitare le gambe oggi.");
        }
      }
      ui().closeSheet();
      open();
    }
  }

  window.GA.calendarUI = { open, isLegDay, isoPlusDays, labelForDate };
})();
