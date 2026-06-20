// Taseca Service Worker v2
const CACHE = "taseca-v2";
let companySlug = null;

// Recibir el slug desde el cliente al registrar
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SET_SLUG") {
    companySlug = e.data.slug;
  }
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

self.addEventListener("fetch", e => {
  // Solo navegación principal
  if (e.request.mode !== "navigate") return;
  
  const url = new URL(e.request.url);
  
  // Si no tiene ?e= y tenemos slug guardado, redirigir
  if (!url.searchParams.get("e") && companySlug) {
    const newUrl = url.origin + "/?e=" + companySlug;
    return e.respondWith(
      Response.redirect(newUrl, 302)
    );
  }
  
  // Normal fetch
  e.respondWith(fetch(e.request));
});
