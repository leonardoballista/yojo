/* ===========================================================
   theme.js — tema chiaro / scuro / automatico.
   Caricato nell'<head> prima dello stile, così la pagina nasce
   già col tema giusto (niente lampo bianco al buio).
   "auto" segue il tema del telefono e cambia al volo quando
   l'iPhone passa da chiaro a scuro. La scelta resta su questo
   dispositivo (vale per tutti gli account).
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const KEY = "yojo.theme";
  const BG = { light: "#FFF6EA", dark: "#14101F" };
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function get() {
    try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; }
  }
  function resolved() {
    const p = get();
    if (p === "light" || p === "dark") return p;
    return mq && mq.matches ? "dark" : "light";
  }
  function apply() {
    const t = resolved();
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", BG[t]);
  }
  function set(pref) {
    try { localStorage.setItem(KEY, pref); } catch (e) { /* modalità privata: vale solo per questa sessione */ }
    apply();
  }

  if (mq) {
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }
  apply();
  document.addEventListener("DOMContentLoaded", apply);

  window.GA.theme = { get, set, resolved };
})();
