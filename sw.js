const CACHE = "yojo-cache-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/theme.js",
  "./js/db.js",
  "./js/foods.js",
  "./js/calc.js",
  "./js/coach.js",
  "./js/ui.js",
  "./js/ai.js",
  "./js/timer.js",
  "./js/calendar.js",
  "./js/onboarding.js",
  "./js/workout.js",
  "./js/pdfimport.js",
  "./js/nutrition.js",
  "./js/dietimport.js",
  "./js/quicklog.js",
  "./js/recipes.js",
  "./js/sleep.js",
  "./js/app.js",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Rete prima (così gli aggiornamenti arrivano subito), cache come ripiego offline.
// Le chiamate all'API di Anthropic sono POST e non passano mai dalla cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
