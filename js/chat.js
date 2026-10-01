/* ===========================================================
   chat.js — chat con Enrico. Con Enrico AI attivo le risposte
   arrivano in streaming da Claude, che può anche modificare i
   dati dell'app; senza chiave resta il motore a regole locale.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const coach = () => window.GA.coach;
  const calc = () => window.GA.calc;
  const ai = () => window.GA.ai;

  let sending = false;
  let pendingText = null; // messaggio da inviare appena la chat viene aperta

  const FACE =
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path d="M11 49c1.5-5.5 6.5-8.5 13-8.5s11.5 3 13 8.5" fill="#6D4AFF" stroke="#1B1433" stroke-width="2"/>' +
    '<circle cx="24" cy="28" r="12.5" fill="#FFD7B5" stroke="#1B1433" stroke-width="2"/>' +
    '<path d="M11.4 26.5c0-8.4 5.7-13.6 12.6-13.6s12.6 5.2 12.6 13.6c-3-3.3-7.4-4.8-12.6-4.8s-9.6 1.5-12.6 4.8z" fill="#1B1433"/>' +
    '<path d="M12.2 22.6c3.4-2.2 7.3-3.2 11.8-3.2s8.4 1 11.8 3.2" stroke="#B8F047" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="19.6" cy="28.6" r="1.6" fill="#1B1433"/><circle cx="28.4" cy="28.6" r="1.6" fill="#1B1433"/>' +
    '<circle cx="16.6" cy="32.4" r="1.9" fill="#FF8FA3" opacity=".75"/><circle cx="31.4" cy="32.4" r="1.9" fill="#FF8FA3" opacity=".75"/>' +
    '<path d="M20 33.2c2.4 2.3 5.6 2.3 8 0" stroke="#1B1433" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    "</svg>";

  function avatar(small) {
    return '<div class="enrico-avatar ' + (small ? "sm" : "") + '">' + FACE + "</div>";
  }

  const SUGGESTIONS_AI = ["Com'è andato l'ultimo allenamento?", "Cosa mangio stasera?", "Ho mangiato una piadina al crudo", "Aumenta la panca di 2,5 kg", "Rivedi la mia scheda"];
  const SUGGESTIONS_BASE = ["Dammi una ricetta", "Quante proteine mi mancano?", "Imposta obiettivo cut", "Quando fare lo scarico?"];

  function render(container) {
    const data = db().getData();
    const aiOn = ai().isConfigured();
    const model = ai().MODELS.find((m) => m.id === ai().settings().model);

    let html =
      '<div class="chat-head">' + avatar() +
      '<div class="who"><b>Enrico</b><span class="status-dot ' + (aiOn ? "" : "base") + '">' + (aiOn ? "online · " + (model ? model.label : "Claude") : "modalità base") + "</span></div>" +
      (data.chat.length ? '<button class="iconbtn" id="chat-clear" title="Nuova conversazione">' + ui().icon("trash") + "</button>" : "") +
      "</div>";

    if (!aiOn) {
      html += '<div class="card ai-card" style="margin-bottom:16px;"><span class="ai-badge">' + ui().icon("sparkle") + " ENRICO AI</span>" +
        '<p class="small" style="margin-top:8px;font-weight:600;">Ora rispondo con regole semplici. Collegami a Claude e divento un vero coach: capisco qualsiasi domanda, analizzo i tuoi progressi, modifico scheda e diario per te.</p>' +
        '<button class="btn small" id="chat-enable-ai" style="margin-top:10px;">Attiva Enrico AI</button></div>';
    }

    html += '<div class="chat-scroll" id="chat-scroll">';
    if (!data.chat.length) {
      const name = ((db().getCurrentUser() || {}).name || "").split(" ")[0];
      html += bubble({ role: "coach", text: "Ciao" + (name ? " " + name : "") + "! 👋 Sono **Enrico**, il tuo coach.\n\nChiedimi qualsiasi cosa su allenamento e alimentazione: posso anche aggiornare la scheda, i pesi, il diario e i tuoi obiettivi." }, true);
    }
    data.chat.forEach((m, i) => { html += bubble(m, i >= data.chat.length - 2); });
    html += "</div>";

    html += '<div class="chat-input-bar"><div style="flex:1;min-width:0;">' +
      '<div class="chip-row chat-suggest" id="chat-suggest">' + (aiOn ? SUGGESTIONS_AI : SUGGESTIONS_BASE).map((s) => '<button class="chip" data-sug="' + ui().escapeHtml(s) + '">' + ui().escapeHtml(s) + "</button>").join("") + "</div>" +
      '<textarea id="chat-input" rows="1" placeholder="Scrivi a Enrico…"></textarea></div>' +
      '<button class="iconbtn send" id="chat-send" aria-label="Invia">' + ui().icon("send") + "</button></div>";

    container.innerHTML = html;
    container.classList.add("no-anim");
    scrollToEnd(true);

    const input = container.querySelector("#chat-input");
    container.querySelector("#chat-send").addEventListener("click", () => send(container, input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(container, input.value); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(120, input.scrollHeight) + "px";
    });
    container.querySelectorAll("[data-sug]").forEach((b) => b.addEventListener("click", () => send(container, b.dataset.sug)));
    const en = container.querySelector("#chat-enable-ai");
    if (en) en.addEventListener("click", () => window.GA.app.openAiSettings());
    const clr = container.querySelector("#chat-clear");
    if (clr) clr.addEventListener("click", () => {
      if (!confirm("Cancellare la conversazione? I dati di allenamento e alimentazione restano.")) return;
      db().updateData((d) => { d.chat = []; });
      window.GA.app.refresh();
    });

    if (pendingText) {
      const t = pendingText;
      pendingText = null;
      setTimeout(() => send(container, t), 150);
    }
  }

  function bubble(m, animate) {
    const isUser = m.role === "user";
    const body = isUser ? ui().escapeHtml(m.text) : ui().md(m.text);
    return (
      '<div class="bubble-row ' + (isUser ? "user" : "coach") + '" style="' + (animate ? "" : "animation:none") + '">' +
      (isUser ? "" : avatar(true)) +
      '<div class="bubble ' + (m.error ? "error" : "") + '">' + body + actionChips(m.actions) + "</div>" +
      "</div>"
    );
  }

  function actionChips(actions) {
    if (!actions || !actions.length) return "";
    return '<div class="action-chips">' + actions.map((a) => '<span class="action-chip">' + ui().icon("check") + ui().escapeHtml(a) + "</span>").join("") + "</div>";
  }

  function scrollToEnd(instant) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: instant || ui().reduceMotion() ? "auto" : "smooth" });
  }

  function appendBubble(container, m) {
    const scroll = container.querySelector("#chat-scroll");
    const node = ui().el(bubble(m, true));
    scroll.appendChild(node);
    scrollToEnd();
    return node;
  }

  async function send(container, raw) {
    const text = (raw || "").trim();
    if (!text || sending) return;
    sending = true;
    const input = container.querySelector("#chat-input");
    input.value = "";
    input.style.height = "auto";
    const sug = container.querySelector("#chat-suggest");
    if (sug) sug.style.display = "none";

    db().updateData((d) => { d.chat.push({ id: db().uid("msg"), role: "user", text, ts: Date.now() }); });
    appendBubble(container, { role: "user", text });

    if (!ai().isConfigured()) {
      const node = appendBubble(container, { role: "coach", text: "" });
      node.querySelector(".bubble").innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      setTimeout(() => {
        const res = coach().handleMessage(text, db().getData());
        applyActions(res.actions);
        db().updateData((d) => { d.chat.push({ id: db().uid("msg"), role: "coach", text: res.reply, ts: Date.now() }); });
        node.querySelector(".bubble").innerHTML = ui().md(res.reply);
        scrollToEnd();
        sending = false;
      }, 550);
      return;
    }

    const node = appendBubble(container, { role: "coach", text: "" });
    const b = node.querySelector(".bubble");
    b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    const liveActions = [];
    let lastPaint = 0;
    try {
      const res = await ai().chat(text, {
        onUpdate: (t) => {
          const now = performance.now();
          if (now - lastPaint < 40) return; // limita i repaint durante lo streaming
          lastPaint = now;
          b.innerHTML = '<div class="cursor-blink">' + ui().md(t) + "</div>" + actionChips(liveActions);
          scrollToEnd(true);
        },
        onAction: (label) => {
          liveActions.push(label);
          ui().haptic(15);
        },
      });
      const finalText = res.text || (res.actions.length ? "Fatto!" : "…");
      db().updateData((d) => { d.chat.push({ id: db().uid("msg"), role: "coach", text: finalText, actions: res.actions, ts: Date.now() }); });
      b.innerHTML = ui().md(finalText) + actionChips(res.actions);
      if (res.actions.length) {
        const r = b.getBoundingClientRect();
        ui().burst(r.left + 30, r.bottom - 10, ["#B8F047", "#6D4AFF", "#FFC83D"]);
      }
    } catch (err) {
      b.classList.add("error");
      b.innerHTML = "<p>" + ui().escapeHtml(ai().friendlyError(err)) + '</p><button class="btn small secondary" data-retry style="margin-top:8px;">Riprova</button>';
      b.querySelector("[data-retry]").addEventListener("click", () => {
        db().updateData((d) => { if (d.chat.length && d.chat[d.chat.length - 1].role === "user") d.chat.pop(); });
        sending = false;
        window.GA.app.refresh();
        setTimeout(() => send(document.getElementById("tab-content"), text), 100);
      });
    }
    scrollToEnd();
    sending = false;
  }

  // Azioni del motore a regole (modalità base)
  function applyActions(actions) {
    actions.forEach((a) => {
      if (a.type === "set_goal") {
        db().updateData((d) => { d.profile.goal = a.goal; d.targets = calc().computeTargets(d.profile); });
      } else if (a.type === "set_kcal") {
        ai().runTool("set_daily_targets", { kcal: a.kcal });
      } else if (a.type === "generate_plan") {
        const gen = calc().generatePlan(a, db().uid);
        const plan = ai().buildPlanPreservingIds(db().getData(), gen.days.map((d) => ({ label: d.label, exercises: d.exercises.map(({ id, ...rest }) => rest) })), { source: "coach", trainingGoal: a.trainingGoal });
        db().updateData((d) => { d.plan = plan; d.workoutDraft = null; });
      } else if (a.type === "set_exercise_weight") {
        ai().runTool("set_next_weight", { exercise_name: a.exerciseName, weight_kg: a.weight });
      } else if (a.type === "propose_recipe") {
        db().updateData((d) => { d.nutrition.savedRecipes.push({ id: db().uid("rec"), title: a.recipe.title, text: a.recipe.text, ts: Date.now() }); });
      }
    });
  }

  function queue(text) {
    pendingText = text;
  }

  window.GA.chat = { render, avatar, queue };
})();
