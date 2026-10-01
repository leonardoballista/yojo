/* ===========================================================
   timer.js — timer di recupero tra le serie e tra gli esercizi
   (sheet riutilizzabile). Conta sull'orario di fine, così resta
   preciso anche se il telefono mette in pausa la pagina.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  let interval = null;
  let endAt = 0;      // timestamp di fine mentre il timer corre
  let remaining = 0;  // secondi rimasti mentre è in pausa
  let audio = null;

  // opts: { title, sub }
  function open(seconds, opts) {
    opts = opts || {};
    stop();
    remaining = seconds || 90;
    const overlay = ui().openSheet(bodyHtml(opts), { center: true });
    unlockAudio();
    start(overlay);
    wire(overlay);
  }

  function bodyHtml(opts) {
    return (
      '<div style="text-align:center;">' +
      '<div class="eyebrow">' + ui().escapeHtml(opts.title || "Recupero") + "</div>" +
      '<div class="big-number" id="timer-display" style="font-size:56px;margin:14px 0 6px;font-variant-numeric:tabular-nums;">' + fmt(remaining) + "</div>" +
      (opts.sub ? '<div class="small" style="font-weight:700;margin-bottom:12px;">' + ui().escapeHtml(opts.sub) + "</div>" : '<div style="height:8px;"></div>') +
      '<div class="row" style="justify-content:center;gap:10px;">' +
      '<button class="btn secondary small" data-t="-15">-15s</button>' +
      '<button class="btn ghost small" id="timer-toggle">Pausa</button>' +
      '<button class="btn secondary small" data-t="15">+15s</button>' +
      "</div>" +
      '<button class="btn ghost" id="timer-close" style="margin-top:16px;">Chiudi</button>' +
      "</div>"
    );
  }

  function fmt(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function left() {
    return interval ? Math.max(0, (endAt - Date.now()) / 1000) : remaining;
  }

  function tick(overlay) {
    const d = overlay.querySelector("#timer-display");
    if (d) d.textContent = fmt(left());
    if (interval && left() <= 0) finish();
  }

  function start(overlay) {
    endAt = Date.now() + remaining * 1000;
    interval = setInterval(() => tick(overlay), 250);
    tick(overlay);
  }

  function finish() {
    stop();
    remaining = 0;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    beep();
    ui().toast("Recupero finito: via! 💪");
  }

  function wire(overlay) {
    const toggle = overlay.querySelector("#timer-toggle");
    overlay.querySelectorAll("[data-t]").forEach((b) => {
      b.addEventListener("click", () => {
        const delta = parseInt(b.dataset.t, 10);
        if (interval) endAt = Math.max(Date.now(), endAt + delta * 1000);
        else {
          remaining = Math.max(0, remaining + delta);
          // a timer finito, +15s lo fa ripartire
          if (remaining > 0 && toggle.textContent === "Pausa") start(overlay);
        }
        tick(overlay);
      });
    });
    toggle.addEventListener("click", () => {
      if (interval) {
        remaining = left();
        stop();
        toggle.textContent = "Riprendi";
      } else if (remaining > 0) {
        toggle.textContent = "Pausa";
        start(overlay);
      }
    });
    overlay.querySelector("#timer-close").addEventListener("click", () => {
      stop();
      ui().closeSheet();
    });
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  // Su iPhone l'audio si può attivare solo dopo un tocco: lo prepariamo all'apertura
  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audio) audio = new Ctx();
      if (audio.state === "suspended") audio.resume();
    } catch (e) { audio = null; }
  }

  function beep() {
    if (!audio) return;
    try {
      [0, 0.25, 0.5].forEach((t) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.18);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + t);
        o.stop(audio.currentTime + t + 0.2);
      });
    } catch (e) { /* audio non disponibile */ }
  }

  window.GA.timer = { open };
})();
