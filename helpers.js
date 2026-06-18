import { SLOTS, STAFF_COLORS } from "./config.js";

// ─── DATE / TIME ──────────────────────────────────────────────────
/** "HH:MM" → minutes from midnight */
export function pt(t) {
  const p = t.split(":");
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

/** Date → "YYYY-MM-DD" using local timezone (fixes UTC offset bug) */
export function ts(d) {
  const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
  return y + "-" + (m  < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
}

/** Today as "YYYY-MM-DD" */
export function today() { return ts(new Date()); }

// ─── VALIDATION ───────────────────────────────────────────────────
export function vPhone(p) { return (p || "").replace(/\D/g, "").length === 10; }

// ─── CALENDAR HELPERS ─────────────────────────────────────────────
/** Returns array of Date|null for a month calendar grid */
export function calDays(y, m) {
  const days = [], f = new Date(y, m, 1), l = new Date(y, m + 1, 0);
  for (let i = 0; i < f.getDay(); i++) days.push(null);
  for (let d = 1; d <= l.getDate(); d++) days.push(new Date(y, m, d));
  return days;
}

/** Returns array of 7 Dates for the week containing `base` */
export function weekOf(base) {
  const d = new Date(base), sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(sun);
    x.setDate(sun.getDate() + i);
    return x;
  });
}

// ─── STAFF COLORS ────────────────────────────────────────────────
export function staffColor(users, stId) {
  const idx = users.findIndex(u => u.id === stId);
  return STAFF_COLORS[(idx < 0 ? 0 : idx) % STAFF_COLORS.length];
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────
export function pushNotif(title, body) {
  if (window.Notification && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico" }); } catch {}
  }
}

// ─── EMAIL REMINDER ──────────────────────────────────────────────
async function sendReminder(appt, clientData, staffName) {
  if (!clientData?.email || !window.emailjs) return;
  try {
    emailjs.init(window.EMAILJS_KEY);
    await emailjs.send(window.EMAILJS_SVC, window.EMAILJS_TPL, {
      to_email:    clientData.email,
      client_name: clientData.name || appt.client,
      service:     appt.svc,
      staff:       staffName || "Tu profesional",
      date:        appt.date,
      time:        appt.time
    });
    console.log("✅ Recordatorio enviado a", clientData.email);
  } catch (e) { console.error("EmailJS error:", e); }
}

/** Schedule an email reminder 1 hour before the appointment (only if within 24h) */
export function scheduleReminder(appt, clientData, staffName) {
  if (!clientData?.email) return;
  const apptTime     = new Date(appt.date + "T" + appt.time + ":00");
  const reminderTime = new Date(apptTime.getTime() - 60 * 60 * 1000);
  const diff         = reminderTime - Date.now();
  if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
    console.log("📧 Recordatorio programado para", reminderTime.toLocaleTimeString());
    setTimeout(() => sendReminder(appt, clientData, staffName), diff);
  }
}
