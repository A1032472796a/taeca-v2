// Taseca Service Worker v3
const CACHE = "taseca-v3";

// Recibir el slug desde el cliente (ya no se usa para redirigir,
// se conserva por compatibilidad con el postMessage de index.html)
let companySlug = null;
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SET_SLUG") {
    companySlug = e.data.slug;
  }
  // Permitir activación solo cuando el cliente lo pida explícitamente
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// NO forzar skipWaiting en install: el SW nuevo espera hasta que
// el usuario acepte, para no reiniciar la sesión en pleno uso.
self.addEventListener("install", () => {
  // sin skipWaiting()
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

// IMPORTANTE: sin intercepción de navegación ni Response.redirect.
// La lógica de ?e=slug ya vive en el cliente. El SW solo pasa las
// peticiones de largo (passthrough), sin reescribir navegaciones.
// Si más adelante quieres cache offline, cachea aquí SOLO assets
// estáticos (css/js/iconos), nunca redirijas la navegación principal.
