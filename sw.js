/* ═══════════════════════════════════════════════════════════
   TASECA · Service Worker v2
═══════════════════════════════════════════════════════════ */

self.addEventListener("install", function(e){
  console.log("[SW] Install");
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  console.log("[SW] Activate");
  e.waitUntil(clients.claim());
});

/* ─── Push recibido ─── */
self.addEventListener("push", function(e){
  console.log("[SW] Push recibido:", e);

  var title = "Taseca · Nueva cita";
  var options = {
    body: "Tienes una nueva cita agendada",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    tag: "taseca-cita",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: "/" }
  };

  /* Intentar parsear el payload si viene con datos */
  if(e.data){
    try{
      var d = e.data.json();
      if(d.title) title = d.title;
      if(d.body)  options.body = d.body;
      if(d.tag)   options.tag  = d.tag;
      if(d.url)   options.data = { url: d.url };
    }catch(err){
      try{ options.body = e.data.text(); }catch(err2){}
    }
  }

  console.log("[SW] Mostrando notificacion:", title, options);
  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ─── Clic en notificación ─── */
self.addEventListener("notificationclick", function(e){
  console.log("[SW] Notificacion clickeada");
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(wins){
      for(var i = 0; i < wins.length; i++){
        if("focus" in wins[i]) return wins[i].focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
