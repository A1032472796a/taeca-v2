/* ═══════════════════════════════════════════════════════════
   TASECA · Service Worker — Push Notifications
   Archivo: sw.js (debe estar en la RAÍZ del repositorio)
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = "taseca-v1";
const SCOPE = "/";

/* ─── Instalación ─── */
self.addEventListener("install", function(e){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(clients.claim());
});

/* ─── Push recibido ─── */
self.addEventListener("push", function(e){
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: "Taseca", body: e.data ? e.data.text() : "Nueva notificación" }; }

  var title   = data.title || "Taseca · Barber & Tattoo";
  var options = {
    body:    data.body    || "Tienes una nueva notificación",
    icon:    SCOPE + "icon-192.png",
    badge:   SCOPE + "icon-96.png",
    tag:     data.tag     || "taseca-notif",
    data:    { url: data.url || SCOPE },
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

/* ─── Clic en notificación → abrir app ─── */
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || SCOPE;
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(wins){
      for(var i = 0; i < wins.length; i++){
        if(wins[i].url.includes("taeca-v2") && "focus" in wins[i]){
          return wins[i].focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(target);
    })
  );
});
