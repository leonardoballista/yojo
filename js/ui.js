/* ===========================================================
   ui.js — helper di interfaccia condivisi: icone, icone
   illustrate dei cibi, toast, sheet/modal animati, drawer,
   animazioni (count-up, burst, volo emoji), markdown leggero.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    menu: '<svg ' + S + '><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="15" y2="12"/><line x1="4" y1="17" x2="18" y2="17"/></svg>',
    close: '<svg ' + S + '><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>',
    palestra: '<svg ' + S + '><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
    alimentazione: '<svg ' + S + '><path d="M12 21c-4.5 0-8-3.6-8-8.2C4 8.6 7 6 10 6c1 0 1.5.4 2 .4s1-.4 2-.4c3 0 6 2.6 6 6.8 0 4.6-3.5 8.2-8 8.2z"/><path d="M12 6c0-1.8 1-3 2.6-3.4"/></svg>',
    theme: '<svg ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 000 17z" fill="currentColor"/></svg>',
    user: '<svg ' + S + '><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>',
    camera: '<svg ' + S + '><path d="M4 8.5A2.5 2.5 0 016.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0120 8.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    sonno: '<svg ' + S + '><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/><path d="M16 4h3l-3 3.5h3"/></svg>',
    chat: '<svg ' + S + '><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 014 14.5z"/><path d="M8.5 9.5h7M8.5 12.5h4"/></svg>',
    chevron: '<svg ' + S + '><polyline points="9 6 15 12 9 18"/></svg>',
    back: '<svg ' + S + '><polyline points="15 6 9 12 15 18"/></svg>',
    check: '<svg ' + S + ' stroke-width="2.6"><polyline points="5 13 10 18 19 7"/></svg>',
    plus: '<svg ' + S + ' stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    minus: '<svg ' + S + ' stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg ' + S + '><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m1 0-1 13a1 1 0 01-1 1H10a1 1 0 01-1-1L8 7"/></svg>',
    settings: '<svg ' + S + '><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.7 7.7 0 000-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 00-1.7-1L15 3h-4l-.4 2a7.6 7.6 0 00-1.7 1l-2.3-.9-2 3.4L6.6 11a7.7 7.7 0 000 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1l.4 2h4l.4-2c.6-.2 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5z"/></svg>',
    scale: '<svg ' + S + '><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 017 0M12 9.5l1.5 2.5"/></svg>',
    calendar: '<svg ' + S + '><rect x="3.5" y="5" width="17" height="15" rx="3"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
    timer: '<svg ' + S + '><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M10 2.5h4"/></svg>',
    logout: '<svg ' + S + '><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    coach: '<svg ' + S + '><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/></svg>',
    send: '<svg ' + S + '><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    search: '<svg ' + S + '><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/></svg>',
    sparkle: '<svg ' + S + '><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
    file: '<svg ' + S + '><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    edit: '<svg ' + S + '><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    history: '<svg ' + S + '><path d="M3.5 12a8.5 8.5 0 102.5-6"/><path d="M3 4v4h4M12 8v4l3 2"/></svg>',
    up: '<svg ' + S + ' stroke-width="2.6"><polyline points="6 14 12 8 18 14"/></svg>',
    down: '<svg ' + S + ' stroke-width="2.6"><polyline points="6 10 12 16 18 10"/></svg>',
    key: '<svg ' + S + '><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/></svg>',
    fire: '<svg ' + S + '><path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.2 2.2-5 3.5-7 .4 1.6 1.3 2.6 2.5 3 0-3 1.2-5.6 3.8-7.4-.2 3 1.4 4.7 2.8 6.3 1.2 1.4 1.4 2.6 1.4 4.1 0 4-3.1 7.6-7 7.6z"/></svg>',
  };

  function icon(name) {
    return ICONS[name] || "";
  }

  // Logo di Yojo: sagoma piena di fiore di loto bianca (lo sfondo rosa è quello di .brand-mark)
  function logo() {
    const petal = "M0 0 C -52 -46 -58 -128 0 -196 C 58 -128 52 -46 0 0 Z";
    const p = (t) => '<path d="' + petal + '" transform="' + t + '"/>';
    return '<svg viewBox="0 0 512 512" aria-hidden="true"><g transform="translate(256 362) scale(1.12)" fill="#fff">' +
      p("rotate(-66) scale(.74)") + p("rotate(66) scale(.74)") + p("rotate(-34) scale(.9)") + p("rotate(34) scale(.9)") + p("") +
      "</g></svg>";
  }

  // Foto profilo dell'utente, o l'iniziale del nome se non c'è
  function avatar(user) {
    if (user && user.photo) return '<img class="avatar-img" src="' + user.photo + '" alt="" />';
    return escapeHtml(((user && user.name) || "?").trim().charAt(0).toUpperCase());
  }

  /* ---------- Icone illustrate delle categorie di cibo ---------- */
  // Disegni piatti con contorno inchiostro: la tinta arriva dalla categoria.
  const INK = "#1B1433";
  const CAT_ART = {
    carni: (c) => '<ellipse cx="19" cy="12.5" rx="8.6" ry="7" transform="rotate(-42 19 12.5)" fill="' + c + '"/><path d="M13 18.8 8 23.8" stroke-width="3.2"/><circle cx="6.2" cy="23.2" r="2.3" fill="#fff"/><circle cx="8.8" cy="25.8" r="2.3" fill="#fff"/><path d="M16.5 9.5c1.3-1.4 3.4-2 5-1.4" stroke="#fff" stroke-width="1.8"/>',
    pesce: (c) => '<path d="M4 16c3.5-6 10-8 15-6 2 .8 3.6 2.1 4.8 3.6L28 10v12l-4.2-3.6C22.6 20 21 21.2 19 22c-5 2-11.5 0-15-6z" fill="' + c + '"/><circle cx="10" cy="14.5" r="1.4" fill="' + INK + '" stroke="none"/><path d="M15 12.5c1 2 1 5 0 7" />',
    latticini: (c) => '<path d="M4 23 28 12.5V25.5H4z" fill="' + c + '"/><path d="M4 23 28 12.5 21 8.5z" fill="#FFE9A8"/><circle cx="12" cy="22.5" r="1.6" fill="#fff"/><circle cx="20.5" cy="20.5" r="2" fill="#fff"/><circle cx="24.5" cy="23.4" r="1.1" fill="#fff"/>',
    carboidrati: (c) => '<path d="M8 13c0-3 3.5-5 8-5s8 2 8 5" fill="#fff"/><path d="M11.5 10.5h.01M15 9.5h.01M18.5 10.5h.01M21 12h.01M13 12.2h.01" stroke-width="2.4"/><path d="M4 14h24c0 6.6-5.4 12-12 12S4 20.6 4 14z" fill="' + c + '"/><path d="M9 18.5c1 2 2.6 3.4 4.5 4" stroke="#fff"/>',
    legumi: (c) => '<path d="M6.5 10.5c2-4 8-4.5 9 0 .6 2.6-2 3.4-1.4 6 .8 3.2-2.4 6-6 4.2-4-2-4.3-6.8-1.6-10.2z" fill="' + c + '"/><path d="M17.5 13c2.6-3.6 8.6-3 9 1.6.3 2.6-2.4 3-2.2 5.6.3 3.4-3.2 5.6-6.6 3.4-3.6-2.4-3-7.3-.2-10.6z" fill="' + c + '"/><path d="M9 11.5c.8-1 2-1.4 3-1.2M20.2 15c.8-1 2-1.3 3-1" stroke="#fff"/>',
    verdura: (c) => '<path d="M14 18l-1.5 9h7L18 18" fill="#9BE7C4"/><circle cx="10" cy="13" r="5" fill="' + c + '"/><circle cx="22" cy="13" r="5" fill="' + c + '"/><circle cx="16" cy="9.5" r="5.8" fill="' + c + '"/><circle cx="16" cy="16" r="4" fill="' + c + '"/><path d="M13.5 8c.6-1 1.6-1.6 2.8-1.7" stroke="#fff"/>',
    frutta: (c) => '<path d="M16 9.5c-2-1.8-7-2-9 1.8-2.2 4.2-.4 11 3.4 14 1.6 1.2 3.4 1.2 5.6.4 2.2.8 4 .8 5.6-.4 3.8-3 5.6-9.8 3.4-14-2-3.8-7-3.6-9-1.8z" fill="' + c + '"/><path d="M16 9.5c0-2.4.8-4.4 2.4-5.8"/><path d="M17.5 6.5c1.8-2.4 5-2.8 6.6-1.8-.8 2.4-3.8 3.4-6.6 1.8z" fill="#2ED39A"/><path d="M9.5 13.5c.4-1.4 1.4-2.4 2.8-2.8" stroke="#fff"/>',
    fruttasecca: (c) => '<path d="M11 4.5c3.6 0 6 2.8 5.4 6.4-.3 1.8-.6 3 .4 4.4 1 1.4 3.6 1.6 5 3.8 2.2 3.4.2 8.4-4.4 8.4-3.2 0-5-2.2-5.4-4.6-.3-1.6-.8-2.6-2.4-3.4C7.1 18.3 5 16.2 5 12.3 5 7.7 7.5 4.5 11 4.5z" fill="' + c + '"/><path d="M9 9h.01M12 11.5h.01M9.5 14h.01M17.5 21h.01M20 23.5h.01M16 24h.01" stroke-width="2.4"/>',
    condimenti: (c) => '<path d="M13 3.5h6v3h-6z" fill="#fff"/><path d="M13.5 6.5h5v3.2c3 1.6 5 4.2 5 8V26a2 2 0 01-2 2h-11a2 2 0 01-2-2v-8.3c0-3.8 2-6.4 5-8z" fill="' + c + '"/><path d="M12 17.5h8v5h-8z" fill="#fff"/><path d="M16 18.6c-1.2 1.2-1.2 2.6 0 2.8 1.2-.2 1.2-1.6 0-2.8z" fill="' + c + '"/>',
    snack: (c) => '<circle cx="16" cy="16" r="11.5" fill="' + c + '"/><circle cx="11.5" cy="12" r="1.6" fill="' + INK + '" stroke="none"/><circle cx="19" cy="10.5" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="20.5" cy="18.5" r="1.8" fill="' + INK + '" stroke="none"/><circle cx="13" cy="20" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="16" cy="15.5" r="1" fill="' + INK + '" stroke="none"/><path d="M8.5 13c.6-2.2 2.3-4 4.6-4.6" stroke="#fff"/>',
    bevande: (c) => '<path d="M18 3.5 16.6 11" /><path d="M18 3.5h4" /><path d="M7.5 11h17l-1.8 14.4A2.2 2.2 0 0120.5 27.5h-9a2.2 2.2 0 01-2.2-2.1z" fill="' + c + '"/><path d="M8.2 16.5h15.6" stroke="#fff"/><path d="M11 20.5l.4 3.5" stroke="#fff"/>',
    altro: (c) => '<path d="M16 28 4.5 8.5C11.6 4 20.4 4 27.5 8.5z" fill="' + c + '"/><path d="M4.5 8.5C11.6 4 20.4 4 27.5 8.5L26 11c-6.6-4-13.4-4-20 0z" fill="#FFC83D"/><circle cx="14" cy="13.5" r="2" fill="#FF6B5B"/><circle cx="19" cy="18" r="1.8" fill="#FF6B5B"/><circle cx="15.5" cy="21.5" r="1.3" fill="#FF6B5B"/>',
  };

  function catIcon(catId, size) {
    const cat = window.GA.foods.category(catId);
    const art = CAT_ART[cat.id] || CAT_ART.altro;
    const s = size || 32;
    return '<svg class="cat-art" width="' + s + '" height="' + s + '" viewBox="0 0 32 32" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + art(cat.color) + "</svg>";
  }

  // tile colorata con emoji dell'alimento su tinta della categoria
  function foodTile(food, extraClass) {
    const cat = window.GA.foods.category(food.cat);
    return '<div class="food-tile ' + (extraClass || "") + '" style="--tint:' + cat.color + '">' + (food.emoji || cat.emoji) + "</div>";
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function toast(msg, ms) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = el('<div class="toast">' + escapeHtml(msg) + "</div>");
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 250);
    }, ms || 2400);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Markdown minimo per le risposte del coach: grassetto, corsivo, elenchi, titoletti.
  function md(text) {
    const lines = escapeHtml(text).split("\n");
    let out = "";
    let list = null;
    const inline = (s) =>
      s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
    lines.forEach((ln) => {
      const bullet = ln.match(/^\s*[-•*]\s+(.*)$/);
      const num = ln.match(/^\s*(\d+)[.)]\s+(.*)$/);
      const head = ln.match(/^#{1,4}\s+(.*)$/);
      if (bullet || num) {
        const tag = bullet ? "ul" : "ol";
        if (list !== tag) { if (list) out += "</" + list + ">"; out += "<" + tag + ">"; list = tag; }
        out += "<li>" + inline(bullet ? bullet[1] : num[2]) + "</li>";
        return;
      }
      if (list) { out += "</" + list + ">"; list = null; }
      if (head) out += '<div class="md-h">' + inline(head[1]) + "</div>";
      else if (ln.trim() === "") out += '<div class="md-gap"></div>';
      else out += "<p>" + inline(ln) + "</p>";
    });
    if (list) out += "</" + list + ">";
    return out;
  }

  /* ---------- Sheet / modal con animazione di entrata e uscita ---------- */
  function openSheet(innerHtml, opts) {
    opts = opts || {};
    const existing = document.getElementById("ga-overlay");
    if (existing) existing.remove();
    const overlay = el('<div class="overlay ' + (opts.center ? "center" : "") + '" id="ga-overlay"></div>');
    const sheet = el('<div class="sheet">' + (opts.center ? "" : '<div class="sheet-handle"></div>') + innerHtml + "</div>");
    overlay.appendChild(sheet);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSheet();
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    return overlay;
  }
  function closeSheet() {
    const o = document.getElementById("ga-overlay");
    if (!o) return;
    o.id = "";
    o.classList.remove("open");
    o.classList.add("closing");
    setTimeout(() => o.remove(), 240);
  }

  function openDrawer(innerHtml) {
    closeDrawer(true);
    const overlay = el('<div class="drawer-overlay" id="ga-drawer-overlay"></div>');
    const drawer = el('<div class="drawer" id="ga-drawer">' + innerHtml + "</div>");
    overlay.addEventListener("click", () => closeDrawer());
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    requestAnimationFrame(() => { overlay.classList.add("open"); drawer.classList.add("open"); });
  }
  function closeDrawer(instant) {
    const o = document.getElementById("ga-drawer-overlay");
    const d = document.getElementById("ga-drawer");
    [o, d].forEach((n) => {
      if (!n) return;
      n.id = "";
      if (instant) { n.remove(); return; }
      n.classList.remove("open");
      setTimeout(() => n.remove(), 260);
    });
  }

  function fmt1(n) {
    return Math.round(n * 10) / 10;
  }

  /* ---------- Animazioni ---------- */
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // anima il testo di un elemento da `from` a `to`
  function countUp(node, from, to, opts) {
    opts = opts || {};
    const dur = opts.duration || 700;
    const dec = opts.decimals || 0;
    if (!node) return;
    if (reduceMotion() || from === to) { node.textContent = to.toFixed(dec); return; }
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      node.textContent = (from + (to - from) * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // piccola esplosione di coriandoli in un punto dello schermo
  function burst(x, y, colors) {
    if (reduceMotion()) return;
    colors = colors || ["#6D4AFF", "#FF7A2F", "#B8F047", "#FF4D8D", "#38B6FF", "#FFC83D"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 60;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist - 20 + "px");
      p.style.setProperty("--r", Math.random() * 360 + "deg");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  // fa "volare" un'emoji da un punto a un elemento bersaglio
  function flyEmoji(emoji, fromRect, targetEl, done) {
    if (reduceMotion() || !targetEl) { done && done(); return; }
    const tr = targetEl.getBoundingClientRect();
    const f = el('<div class="fly-emoji">' + emoji + "</div>");
    const sx = fromRect.left + fromRect.width / 2, sy = fromRect.top + fromRect.height / 2;
    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    f.style.left = sx + "px";
    f.style.top = sy + "px";
    document.body.appendChild(f);
    const anim = f.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)", offset: 0 },
        { transform: "translate(calc(-50% + " + (tx - sx) / 2 + "px), calc(-50% + " + (Math.min(ty, sy) - sy - 90) + "px)) scale(1.5)", offset: 0.45 },
        { transform: "translate(calc(-50% + " + (tx - sx) + "px), calc(-50% + " + (ty - sy) + "px)) scale(.4)", offset: 1 },
      ],
      { duration: 700, easing: "cubic-bezier(.5,0,.3,1)" }
    );
    anim.onfinish = () => { f.remove(); done && done(); };
  }

  function haptic(ms) {
    if (navigator.vibrate) try { navigator.vibrate(ms || 12); } catch (e) {}
  }

  window.GA.ui = { icon, logo, avatar, catIcon, foodTile, el, toast, escapeHtml, md, openSheet, closeSheet, openDrawer, closeDrawer, fmt1, countUp, burst, flyEmoji, haptic, reduceMotion };
})();
