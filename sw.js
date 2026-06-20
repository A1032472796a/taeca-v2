// Taseca Service Worker
const CACHE = "taseca-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

// Al abrir la PWA, redirigir a la URL correcta con ?e=slug
self.addEventListener("fetch", e => {
  // Solo manejar navegación (no assets)
  if (e.request.mode === "navigate") {
    const url = new URL(e.request.url);
    // Si no tiene ?e= pero la URL de scope sí lo tiene, redirigir
    if (!url.searchParams.get("e") && self.registration.scope) {
      const scopeUrl = new URL(self.registration.scope);
      const slug = scopeUrl.searchParams.get("e");
      if (slug) {
        url.searchParams.set("e", slug);
        return e.respondWith(Response.redirect(url.toString(), 302));
      }
    }
  }
  // Para todo lo demás, ir a la red
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
