/* ===========================================================
   pdfimport.js — importa una scheda da PDF e la trasforma in
   una scheda interattiva.
   1) Se Enrico AI è configurato, Claude legge il PDF (anche
      scansionato) e restituisce giorni/esercizi strutturati.
   2) Altrimenti (o in caso di errore) estraiamo il testo con
      pdf.js e lo interpretiamo con un parser euristico.
   In entrambi i casi l'utente rivede il risultato nell'editor.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const ai = () => window.GA.ai;

  // build "legacy": la normale usa funzioni JS recentissime che Safari su iPhone non ha
  const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/legacy/build/pdf.min.mjs";
  const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/legacy/build/pdf.worker.min.mjs";
  const MAX_BYTES = 25 * 1024 * 1024;

  function open() {
    const aiOn = ai().isConfigured();
    const html =
      '<div class="sheet-title">' + ui().icon("file") + " Importa da PDF</div>" +
      '<label class="dropzone" id="pdf-drop">' +
      '<div style="font-size:40px;margin-bottom:6px;">📄</div>' +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:18px;">Scegli il PDF della scheda</div>' +
      '<div class="small muted" style="margin-top:4px;">o trascinalo qui</div>' +
      '<input type="file" id="pdf-file" accept="application/pdf,.pdf" hidden />' +
      "</label>" +
      '<div class="key-status ' + (aiOn ? "ok" : "no") + '" style="margin-top:14px;">' + (aiOn
        ? "✨ Enrico AI attivo: legge anche PDF scansionati, tabelle e note."
        : "⚡ Modalità base: riconosco schede scritte come “Panca piana 4x8”. Per PDF complessi o scansionati attiva Enrico AI dal menu.") + "</div>" +
      '<div id="pdf-progress" style="margin-top:14px;"></div>';
    const overlay = ui().openSheet(html);
    const input = overlay.querySelector("#pdf-file");
    const drop = overlay.querySelector("#pdf-drop");
    input.addEventListener("change", () => input.files[0] && handleFile(input.files[0], overlay));
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f, overlay); });
  }

  function steps(overlay, active, labels) {
    const box = overlay.querySelector("#pdf-progress");
    if (!box) return;
    box.innerHTML = labels.map((l, i) =>
      '<div class="parse-step ' + (i < active ? "on ok" : i === active ? "on" : "") + '"><div class="ps-dot">' + (i < active ? ui().icon("check") : "") + "</div>" + l + "</div>"
    ).join("");
  }

  async function handleFile(file, overlay) {
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { ui().toast("Seleziona un file PDF"); return; }
    if (file.size > MAX_BYTES) { ui().toast("Il PDF è troppo grande (max 25 MB)"); return; }
    const labels = ["Apro “" + file.name + "”", ai().isConfigured() ? "Enrico legge la scheda" : "Riconosco giorni ed esercizi", "Preparo la scheda interattiva"];
    steps(overlay, 0, labels);
    const buf = await file.arrayBuffer();
    steps(overlay, 1, labels);

    let res = null;
    let via = "local";
    if (ai().isConfigured()) {
      try {
        const out = await ai().parsePlanPdf(toBase64(buf));
        res = {
          name: out.title || "",
          notes: out.general_notes ? [out.general_notes] : [],
          days: (out.days || []).map((d) => ({
            label: d.label,
            notes: d.notes ? [d.notes] : [],
            exercises: d.exercises.map((e) => ({
              name: e.name, sets: e.sets, reps: e.reps,
              restSec: e.rest_sec > 0 ? e.rest_sec : null, restExSec: e.rest_after_sec > 0 ? e.rest_after_sec : null,
              startWeight: e.weight_kg > 0 ? e.weight_kg : "", notes: e.notes || "",
            })),
          })),
        };
        via = "ai";
      } catch (err) {
        ui().toast(ai().friendlyError(err) + " Provo in locale…", 3500);
      }
    }
    if (!res || !res.days.some((d) => d.exercises.length)) {
      try {
        res = parseText(await extractLines(buf.slice(0)));
        via = "local";
      } catch (err) {
        steps(overlay, 1, labels);
        ui().toast("Non riesco a leggere il PDF: " + (err.message || err), 4000);
        return;
      }
    }
    const plan = finalize(res);
    const days = plan.days;
    steps(overlay, 2, labels);

    if (!days.length) {
      overlay.querySelector("#pdf-progress").innerHTML =
        '<div class="card tint-pink flat"><p class="small" style="font-weight:600;">Non ho trovato esercizi nel PDF' +
        (ai().isConfigured() ? "." : ": forse è scansionato o ha un formato particolare. Attiva Enrico AI dal menu per leggerlo, oppure scrivi la scheda a mano.") +
        '</p><button class="btn small" id="pdf-manual" style="margin-top:10px;">Scrivila a mano</button></div>';
      overlay.querySelector("#pdf-manual").addEventListener("click", () => window.GA.workout.openBuilder(null));
      return;
    }
    const nEx = days.reduce((a, d) => a + d.exercises.length, 0);
    const nAuto = days.reduce((a, d) => a + d.exercises.filter((e) => e.restAuto).length, 0);
    setTimeout(() => {
      window.GA.workout.openBuilder(days, {
        title: "Controlla la scheda",
        source: "pdf",
        meta: { name: plan.name, notes: plan.notes },
        banner: (via === "ai" ? "✨ Enrico ha letto " : "Ho trovato ") + days.length + (days.length === 1 ? " giorno" : " giorni") + " e " + nEx + " esercizi." +
          (plan.alternation ? " Ho messo i giorni nell'ordine dell'alternanza settimanale." : "") +
          (nAuto ? " I recuperi che la scheda non indicava li ho aggiunti io in base al tipo di esercizio." : "") +
          " Controlla e correggi se serve, poi salva.",
        savedMsg: "Scheda importata dal PDF 🎉",
      });
    }, 350);
  }

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }

  /* ---------------- Estrazione testo con pdf.js ---------------- */
  async function extractLines(buf) {
    const pdfjs = await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      // raggruppa i frammenti per riga (coordinata y), poi ordina per x
      const rows = [];
      tc.items.forEach((it) => {
        if (!it.str || !it.str.trim()) return;
        const y = it.transform[5], x = it.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) < 3.5);
        if (!row) { row = { y, parts: [] }; rows.push(row); }
        row.parts.push({ x, w: it.width || 0, s: it.str });
      });
      rows.sort((a, b) => b.y - a.y);
      rows.forEach((r) => {
        r.parts.sort((a, b) => a.x - b.x);
        let line = "", endX = null;
        r.parts.forEach((pt) => {
          if (endX != null) line += pt.x - endX > 12 ? "  |  " : pt.x - endX > 1.5 ? " " : "";
          line += pt.s;
          endX = pt.x + pt.w;
        });
        out.push(line.replace(/\s+/g, (m) => (m.includes("|") ? m : " ")).trim());
      });
    }
    return out.filter(Boolean);
  }

  /* ---------------- Parser euristico ---------------- */
  const WEEKDAY = "(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)";
  const DAY_RE = new RegExp("^\\s*(?:(giorno|day|scheda|allenamento|workout|seduta|sessione|training)\\s*[A-Z0-9]{0,3}\\b|" + WEEKDAY + "(?![a-zà-ù])|(push|pull|legs?|gambe|upper|lower|full\\s*body|petto|dorso|schiena|spalle|braccia)\\b(?=[^\\d]*$))", "i");
  const HEADER_RE = /^\s*(esercizi[oa]?|exercises?)\b.*\b(serie|sets?|ripetizioni|reps?)\b/i;
  const JUNK_RE = /^\s*(?:pag(?:ina|\.)?\s*)?\d+(?:\s*(?:\/|di)\s*\d+)?\s*$/i;
  // ripetizioni, anche a tempo o distanza: 8, 6-8, 30-40s, 45'', 1', 30m, max
  const REPS = "(\\d{1,3}(?:\\s*[-–\\/]\\s*\\d{1,3})?(?:\\s*(?:''|\"|sec(?:ondi)?\\b|s\\b|min(?:uti)?\\b|'|metri\\b|m\\b))?|max|amrap|cedimento)";
  const SETSREPS_RE = new RegExp("(\\d{1,2})\\s*(?:serie\\s*)?[x×*]\\s*" + REPS, "i");
  const SERIE_DA_RE = new RegExp("(\\d{1,2})\\s*serie\\s*(?:da|di|x)?\\s*" + REPS, "i");
  const COLS_RE = /^(.*?[a-zà-ù].*?)\s*\|?\s+(\d{1,2})\s*\|?\s+(\d{1,3}(?:\s*[-–\/]\s*\d{1,3})?)(?:\s*\|?\s+|$)/i;
  const SIDE_RE = /^\s*(per\s+(?:lato|gamba|braccio|arto))\b/i;
  const WEIGHT_RE = /(\d{1,3}(?:[.,]\d{1,2})?)\s*kg/i;
  const REST_KW_RE = /\b(?:rec(?:uper[oi])?\b\.?|rest\b|recovery\b|pausa\b|riposo\b)\s*(?:tra\s+(?:le\s+|gli\s+|ogni\s+)?(?:serie|set|esercizi[oa]?)\s*)?[:.=]?\s*/i;
  // 1.5' · 2' · 2 min · 1'30" · 1:30 · 90" · 90'' · 90s · 90 sec
  const TIME_RE = /(\d)[.,](\d)\s*(?:'(?!')|min)|(\d{1,2})\s*(?:'(?!')|min(?:ut[oi])?\b)\s*(?:(\d{1,2})\s*(?:''|"|s\b|sec))?|(\d{1,2}):(\d{2})|(\d{1,3})\s*(?:''|"|s\b|sec(?:ondi)?\b)/i;

  function timeSec(m) {
    if (m[1]) return Math.round(parseFloat(m[1] + "." + m[2]) * 60);
    if (m[3]) return parseInt(m[3], 10) * 60 + (m[4] ? parseInt(m[4], 10) : 0);
    if (m[5]) return parseInt(m[5], 10) * 60 + parseInt(m[6], 10);
    return parseInt(m[7], 10);
  }

  const clampRest = (s) => Math.max(15, Math.min(600, Math.round(s)));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function cleanName(s) {
    return s
      .replace(/\|/g, " ")
      .replace(/^[\s\-–•·*\d.)]+/, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[\s:–\-]+$/, "")
      .trim();
  }

  function normReps(r) {
    return String(r).replace(/\s+/g, "").replace(/–/g, "-")
      .replace(/(?:''|"|sec(?:ondi)?)$/i, "s").replace(/metri$/i, "m").replace(/min(?:uti)?$/i, "'");
  }

  // "Nordic curl (o leg curl)" → alternativa nelle note; "(20-30% del massimale)" → nota
  function splitName(name) {
    const notes = [];
    name = name.replace(/\s*\(([^)]*)\)/g, (all, inner) => {
      const alt = inner.match(/^\s*(?:o|oppure|or|in alternativa)\b\s*:?\s*(.+)$/i);
      if (alt) { notes.push("In alternativa: " + alt[1].trim()); return ""; }
      if (/%|rpe|rir|buffer|massimale|1rm|tempo\b/i.test(inner)) { notes.push(inner.trim()); return ""; }
      return all;
    });
    return { name: name.trim(), notes };
  }

  // Recupero scritto accanto all'esercizio: "rec 90''", "recupero 2'", una colonna "| 90" |"
  function findRest(text) {
    const kw = text.match(REST_KW_RE);
    if (kw) {
      const after = text.slice(kw.index + kw[0].length);
      const t = after.match(TIME_RE);
      if (t && t.index <= 2) return { sec: timeSec(t), text: kw[0] + after.slice(0, t.index + t[0].length) };
      const bare = after.match(/^(\d{1,3})\b/);
      if (bare) { const n = parseInt(bare[1], 10); return { sec: n <= 5 ? n * 60 : n, text: kw[0] + bare[0] }; }
    }
    for (const cell of text.split("|")) {
      const t = cell.match(TIME_RE);
      if (!t) continue;
      const rest = cell.slice(t.index + t[0].length);
      if (cell.replace(t[0], "").trim() === "" || /^\s*(?:di\s+)?(?:rec|recupero|pausa|riposo)\b/i.test(rest)) return { sec: timeSec(t), text: cell };
    }
    return null;
  }

  function parseExercise(line) {
    let m = line.match(SETSREPS_RE) || line.match(SERIE_DA_RE);
    let name, sets, reps, tail;
    if (m) {
      name = line.slice(0, m.index);
      tail = line.slice(m.index + m[0].length);
      sets = parseInt(m[1], 10);
      reps = m[2];
      // nomi scritti dopo le serie ("4x8 Panca piana")
      if (!/[a-zà-ù]{3}/i.test(name)) {
        const first = tail.split(/\||\brec(?:upero)?\b|\d+(?:[.,]\d+)?\s*kg/i)[0];
        if (/[a-zà-ù]{3}/i.test(first) && !SIDE_RE.test(first)) { name = first; tail = tail.slice(first.length); }
      }
    } else if ((m = line.match(COLS_RE)) && parseInt(m[2], 10) <= 12) {
      name = m[1];
      sets = parseInt(m[2], 10);
      reps = m[3];
      tail = line.slice(m[0].length);
    } else return null;
    if (!(sets > 0 && sets <= 12)) return null;

    reps = normReps(reps);
    const side = tail.match(SIDE_RE);
    if (side) { reps += " " + side[1].toLowerCase(); tail = tail.slice(side.index + side[0].length); }
    const rest = findRest(tail);
    if (rest) tail = tail.replace(rest.text, " ");
    const w = tail.match(WEIGHT_RE);
    if (w) tail = tail.replace(w[0], " ");
    const sp = splitName(cleanName(name));
    const extra = tail.replace(/\|/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s,;:·\-–]+|[\s,;:·\-–]+$/g, "");
    if (/[a-zà-ù0-9]/i.test(extra)) sp.notes.push(extra);
    return {
      name: /[a-zà-ù]{3}/i.test(sp.name) ? cap(sp.name) : "",
      sets, reps,
      restSec: rest ? clampRest(rest.sec) : null,
      restExSec: null,
      startWeight: w ? parseFloat(w[1].replace(",", ".")) : "",
      notes: sp.notes.join(" · "),
    };
  }

  // Testo del PDF → { name, notes:[], days:[{label, notes:[], exercises, restSec, restExSec}], restSec, restExSec }
  function parseText(lines) {
    const res = { name: "", notes: [], days: [], restSec: null, restExSec: null };
    let cur = null;
    let lastEx = null;
    let pending = []; // righe di testo non ancora assegnate: note, o il nome di un esercizio andato a capo
    const newDay = (label) => { cur = { label, notes: [], exercises: [], restSec: null, restExSec: null }; res.days.push(cur); lastEx = null; };
    const flush = () => { pending.forEach((t) => (cur || res).notes.push(t)); pending = []; };

    lines.forEach((raw) => {
      const line = raw.replace(/\s+/g, " ").trim();
      if (!line || JUNK_RE.test(line) || HEADER_RE.test(line) || line.length > 300) return;

      const ex = parseExercise(line);
      if (ex && (ex.name || pending.length)) {
        if (!ex.name) ex.name = cap(cleanName(pending.pop()));
        flush();
        if (!cur) newDay("Giorno " + String.fromCharCode(65 + res.days.length));
        cur.exercises.push(ex);
        lastEx = ex;
        return;
      }

      if (line.length < 60 && DAY_RE.test(line) && !REST_KW_RE.test(line)) {
        flush();
        newDay(cleanName(line) || "Giorno " + String.fromCharCode(65 + res.days.length));
        return;
      }

      const text = line.replace(/\s*\|\s*/g, " · ");

      // regole generali di recupero: "Recupero 90'' tra le serie e 2' tra gli esercizi"
      if (/\b(rec|recuper[oi]|riposo|pausa|rest)\b/i.test(line)) {
        const times = [];
        const re = new RegExp(TIME_RE.source, "gi");
        let t;
        while ((t = re.exec(line))) times.push(timeSec(t));
        const scope = cur || res;
        const mentionsEx = /eserciz/i.test(line), mentionsSets = /\bserie\b|\bset\b/i.test(line);
        if (times.length >= 2 && mentionsEx && mentionsSets) { scope.restSec = times[0]; scope.restExSec = times[1]; }
        else if (times.length && mentionsEx && !mentionsSets) scope.restExSec = times[0];
        else if (times.length) scope.restSec = times[0];
        if (times.length) { flush(); scope.notes.push(text); return; }
      }

      // note esplicite subito sotto un esercizio: "Nota: fermo al petto", "- gomiti stretti"
      if (lastEx && /^(?:note?|n\.?b\.?|↳|→|-|•|\*)\s*:?/i.test(line)) {
        const n = text.replace(/^(?:note?|n\.?b\.?|↳|→|-|•|\*)\s*:?\s*/i, "");
        lastEx.notes = lastEx.notes ? lastEx.notes + " · " + n : n;
        return;
      }
      pending.push(text);
    });
    flush();
    return res;
  }

  // Recupero consigliato quando la scheda non lo dice (tra le serie / prima dell'esercizio successivo)
  function estimateRest(name, reps) {
    const n = String(name).toLowerCase();
    const r = String(reps).toLowerCase();
    const nums = (r.match(/\d+/g) || []).map(Number);
    const top = nums.length ? Math.max(...nums) : 10;
    if (/\d(s|''|"|')(\s|$)/.test(r) || /plank|dead\s*bug|hollow|crunch|addominal|bird\s*dog|pallof|sit.?up/.test(n)) return { set: 45, ex: 75 };
    if (/farmer|carry|trasport|walk|slitta|sled/.test(n) || /\dm(\s|$)/.test(r)) return { set: 90, ex: 120 };
    if (/\blanc[io]|\bsalt[io]|jump|\bbalz|esplosiv|pliometr|sprint|clean|snatch|strappo|slancio|swing|palla medica|med\s*ball/.test(n)) return { set: 120, ex: 150 };
    if (top <= 5) return { set: 180, ex: 210 };
    if (top <= 8) return { set: 120, ex: 150 };
    if (top <= 12) return { set: 90, ex: 120 };
    return { set: 60, ex: 90 };
  }

  // Schede alternate "Push A / Push B / Pull A…": prima tutti i giorni A, poi tutti i B
  function alternation(days) {
    const tags = days.map((d) => String(d.label).trim().match(/^(.*?\S)[\s\-–—]*\(?\b([A-D])\)?$/));
    if (tags.some((t) => !t)) return null;
    const bases = [], variants = [];
    tags.forEach((t) => {
      const b = t[1].toLowerCase();
      if (!bases.includes(b)) bases.push(b);
      if (!variants.includes(t[2])) variants.push(t[2]);
    });
    if (bases.length < 2 || variants.length < 2 || bases.length * variants.length !== days.length) return null;
    variants.sort();
    const find = (b, v) => days[tags.findIndex((t) => t[1].toLowerCase() === b && t[2] === v)];
    const ordered = [];
    for (const v of variants) for (const b of bases) { const d = find(b, v); if (!d) return null; ordered.push(d); }
    const note = "📅 Alternanza settimanale — " + variants.map((v) => "settimana " + v + ": " + bases.map((b) => find(b, v).label).join(" → ")).join(" · ") +
      ". L'app ti propone i giorni in quest'ordine, uno dopo l'altro.";
    return { days: ordered, note };
  }

  // Risultato grezzo (AI o parser locale) → scheda pronta per l'editor
  function finalize(res) {
    const notes = (res.notes || []).filter(Boolean);
    let name = (res.name || "").trim();
    let restSec = res.restSec || null, restExSec = res.restExSec || null;
    const days = [];
    (res.days || []).forEach((d) => {
      if (!d.exercises.length) {
        // titoli senza esercizi (es. "Scheda Push Pull Legs"): nome della scheda e note generali
        if (!days.length && !name) name = d.label;
        else if (d.label) notes.push(d.label);
        (d.notes || []).forEach((n) => n && notes.push(n));
        if (!days.length) { restSec = restSec || d.restSec; restExSec = restExSec || d.restExSec; }
        return;
      }
      days.push(d);
    });
    const out = days.map((d) => ({
      label: d.label,
      notes: (d.notes || []).filter(Boolean).join("\n"),
      exercises: d.exercises.map((e) => {
        const est = estimateRest(e.name, e.reps);
        const set = e.restSec || d.restSec || restSec;
        const next = e.restExSec || d.restExSec || restExSec;
        return Object.assign({}, e, {
          restSec: clampRest(set || est.set), restAuto: !set,
          restExSec: clampRest(next || (set ? set + 30 : est.ex)), restExAuto: !next,
        });
      }),
    }));
    const alt = alternation(out);
    const planNotes = alt ? notes.filter((n) => !(n.length < 60 && /altern/i.test(n))).concat(alt.note) : notes;
    return { name, notes: planNotes.join("\n"), days: alt ? alt.days : out, alternation: !!alt };
  }

  // compatibilità: solo i giorni
  function parseLines(lines) {
    return finalize(parseText(lines)).days;
  }

  window.GA.pdfImport = { open, parseText, parseLines, finalize, estimateRest, extractLines, toBase64, MAX_BYTES };
})();
