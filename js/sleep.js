/* ===========================================================
   sleep.js — sezione Sonno. Per ora è un segnaposto: la
   costruiremo nelle prossime versioni (i dati andranno in
   data.sleep.log, già predisposto in db.js).
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const COMING = [
    { emoji: "🛏️", title: "Diario del sonno", sub: "Orario in cui vai a letto e ti svegli, ore dormite." },
    { emoji: "⭐", title: "Qualità del riposo", sub: "Come ti senti al risveglio, risvegli notturni." },
    { emoji: "📈", title: "Andamento settimanale", sub: "Grafico delle notti e media delle ore." },
    { emoji: "🏋️", title: "Sonno e allenamento", sub: "Come il riposo influisce su carichi e recupero." },
    { emoji: "🧘", title: "Routine serale", sub: "Suggerimenti su orari, caffeina e cena per dormire meglio." },
  ];

  function render(container) {
    container.innerHTML =
      '<h1 class="page-title">Come <span class="hl">dormi</span></h1>' +
      '<div class="subtitle">Il riposo è metà del lavoro: qui monitorerai il tuo sonno.</div>' +
      '<div class="card tint-violet" style="text-align:center;padding:26px 18px;">' +
      '<div style="font-size:56px;line-height:1;">🌙</div>' +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:22px;margin-top:10px;">In costruzione</div>' +
      '<p class="small muted" style="margin-top:6px;font-weight:600;line-height:1.5;">Questa sezione arriverà presto. Ecco cosa ci sarà:</p>' +
      "</div>" +
      '<div class="card" style="margin-top:14px;padding:6px 16px;">' +
      COMING.map((c, i) =>
        '<div class="row" style="gap:12px;justify-content:flex-start;padding:12px 0;' + (i ? "border-top:1.5px dashed var(--line);" : "") + '">' +
        '<div class="food-tile" style="--tint:var(--violet-soft)">' + c.emoji + "</div>" +
        '<div><div style="font-weight:800;">' + c.title + '</div><div class="small muted" style="font-weight:600;">' + c.sub + "</div></div></div>"
      ).join("") +
      "</div>";
  }

  window.GA.sleep = { render };
})();
