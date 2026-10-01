/* ===========================================================
   db.js — livello di persistenza locale (localStorage)
   Un solo account locale per dispositivo, dati applicativi e backup.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const LS_USERS = "ali.users";
  const LS_SESSION = "ali.session";
  const LS_DATA_PREFIX = "ali.data.";

  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function getUsers() {
    return readJSON(LS_USERS, []);
  }
  function saveUsers(users) {
    writeJSON(LS_USERS, users);
  }

  function setSession(userId) {
    localStorage.setItem(LS_SESSION, userId);
  }
  function getSessionUserId() {
    return localStorage.getItem(LS_SESSION);
  }

  // Niente login: un solo account locale per dispositivo. Se ci sono account
  // creati con la vecchia registrazione, riprende quello con più dati.
  function ensureUser() {
    const cur = getCurrentUser();
    if (cur) return cur;
    const users = getUsers();
    if (users.length) {
      const size = (u) => (localStorage.getItem(dataKey(u.id)) || "").length;
      const best = users.slice().sort((a, b) => size(b) - size(a))[0];
      setSession(best.id);
      return best;
    }
    const user = { id: uid("user"), name: "", email: "", createdAt: Date.now() };
    saveUsers([user]);
    initUserData(user.id);
    setSession(user.id);
    return user;
  }

  // Chiede al browser di non cancellare i dati quando lo spazio scarseggia
  function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) { /* non supportato */ }
  }

  // "Reset account": cancella tutti i dati di Yojo (il tema resta)
  function resetAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("ali.") === 0) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  /* ---------- Backup: esporta / importa tutti i dati in un file ---------- */
  function exportBackup() {
    const user = getCurrentUser() || {};
    const data = JSON.parse(JSON.stringify(getData()));
    // la chiave API non finisce nel file: se lo condividi resta privata
    if (data.settings && data.settings.ai) data.settings.ai.apiKey = "";
    return { app: "yojo", version: 1, exportedAt: new Date().toISOString(), user: { name: user.name || "", photo: user.photo || "" }, data };
  }

  function importBackup(backup) {
    if (!backup || backup.app !== "yojo" || !backup.data || typeof backup.data !== "object") {
      throw new Error("Questo file non è un backup di Yojo.");
    }
    const user = ensureUser();
    const cur = getData();
    const data = backup.data;
    // conserva la chiave API già presente su questo dispositivo
    if (cur && cur.settings && cur.settings.ai && cur.settings.ai.apiKey && data.settings && data.settings.ai && !data.settings.ai.apiKey) {
      data.settings.ai.apiKey = cur.settings.ai.apiKey;
    }
    writeJSON(dataKey(user.id), data);
    if (backup.user) updateCurrentUser({ name: backup.user.name || user.name, photo: backup.user.photo || "" });
  }

  function getCurrentUser() {
    const id = getSessionUserId();
    if (!id) return null;
    return getUsers().find((u) => u.id === id) || null;
  }
  function updateCurrentUser(patch) {
    const users = getUsers();
    const id = getSessionUserId();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return;
    users[idx] = Object.assign({}, users[idx], patch);
    saveUsers(users);
  }

  function defaultData() {
    return {
      profile: {
        weight: null,
        height: null,
        age: null,
        sex: null, // 'm' | 'f'
        activity: null, // sedentario | leggero | moderato | intenso | molto_intenso
        goal: null, // mantenimento | bulk | cut
        sports: [], // calcio, pallavolo, basket
        onboarded: false,
      },
      targets: { kcal: 0, protein: 0, carbs: 0, fat: 0, computedAt: null },
      weightLog: [], // {id, date, weight, measures:{...}}
      plan: null, // {type, days:[{id,label,exercises:[...]}], startedAt, weekNumber, lastDeloadWeek, source}
      history: {}, // exerciseId -> [{date, weight, reps, sets:[{w,r}], feedback, sessionId}] (weight/reps = serie migliore)
      sessionsLog: [], // {id, date, dayId, dayLabel, entries:[{exerciseId,name,weight,reps,feedback}], completed}
      nutrition: {
        customFoods: [],
        mealLog: {}, // dateISO -> {colazione:[],pranzo:[],cena:[],spuntini:[]}
        savedRecipes: [],
        recipeBook: [], // {id, name, emoji, source, ingredients:[{name,grams,kcal,p,c,f,emoji,cat,foodId?}] per 1 porzione, uses, lastUsed, createdAt, updatedAt}
        dietPlan: null, // {name, notes, source, importedAt, targets?, days:[{id,label,weekday,meals:[{meal,label,items:[{name,grams,kcal,p,c,f,emoji,alternatives}]}]}]}
        dietDone: {}, // dateISO -> {dayId, meals:[indici dei pasti già segnati nel diario]}
      },
      sleep: { log: [] }, // {id, date, bedtime, wake, hours, quality} — sezione in costruzione
      chat: [], // {id, role, text, ts}
      calendar: [], // {id, date, type:'gym'|'match'|'rest', label, dayId}
      workoutDraft: null, // sessione in corso: {dayId, startedAt, ex:{exId:{sets:[{w,r,done}], feedback}}}
      settings: { deloadReminderWeeks: 7, ai: { apiKey: "", model: "claude-opus-5" } },
      tour: { done: false },
      meta: { createdAt: Date.now() },
    };
  }

  function dataKey(userId) {
    return LS_DATA_PREFIX + userId;
  }

  function initUserData(userId) {
    if (!localStorage.getItem(dataKey(userId))) {
      writeJSON(dataKey(userId), defaultData());
    }
  }

  function getData() {
    const uidCur = getSessionUserId();
    if (!uidCur) return null;
    let data = readJSON(dataKey(uidCur), null);
    if (!data) {
      data = defaultData();
      writeJSON(dataKey(uidCur), data);
    }
    // merge in eventuali chiavi nuove aggiunte in versioni successive
    const def = defaultData();
    Object.keys(def).forEach((k) => {
      if (!(k in data)) data[k] = def[k];
    });
    return data;
  }

  function saveData(data) {
    const uidCur = getSessionUserId();
    if (!uidCur) return;
    writeJSON(dataKey(uidCur), data);
  }

  // helper per aggiornamenti parziali immutabili-ish
  function updateData(mutatorFn) {
    const data = getData();
    mutatorFn(data);
    saveData(data);
    return data;
  }

  window.GA.db = {
    uid,
    ensureUser,
    requestPersistence,
    resetAll,
    exportBackup,
    importBackup,
    getCurrentUser,
    updateCurrentUser,
    getSessionUserId,
    getData,
    saveData,
    updateData,
  };
})();
