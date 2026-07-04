// Taseca Service Worker v4
// Objetivo: reemplazar de forma segura al SW viejo (v2/v3) que causaba
// pantalla negra y expulsión de sesión, SIN recargar en medio del uso.
const CACHE = "taseca-v4";

let companySlug = null;
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SET_SLUG") {
    companySlug = e.data.slug;
  }
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Tomar control apenas se instale este SW nuevo, para desalojar al
// viejo (v2 con Response.redirect) que rompía la app. Es seguro aquí
// porque este SW NO intercepta navegaciones ni redirige.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Borrar TODOS los caches viejos (v2, v3, etc.)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// SIN handler de fetch: no interceptamos nada. La navegación va
// directa a la red (comportamiento normal del navegador). La lógica
// de ?e=slug vive en el cliente (index.html / app.js), no en el SW.
