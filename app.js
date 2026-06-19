import { DEF_CFG, DEF_USERS, DEF_SVC } from "./config.js";
import { DB } from "./db.js";
import { today } from "./helpers.js";
import { Logo } from "./components.js";
import { C, S } from "./config.js";
import { SuperLogin, SuperAdmin } from "./superadmin.js";

// Public and Admin are large — loaded via dynamic import to keep initial bundle light
// but for simplicity in this single-HTML-less setup they're imported statically
import { Public } from "./public.js";
import { Admin  } from "./admin.js";

const { createElement: ce, useState, useEffect, useCallback } = React;

// ─── LOGIN ───────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60 * 1000; // 1 minuto

function Login({ users, onLogin, onBack }) {
  const [sel,        setSel]        = useState(null);
  const [pin,        setPin]        = useState("");
  const [err,        setErr]        = useState("");
  const [attempts,   setAttempts]   = useState(0);
  const [lockedUntil,setLockedUntil]= useState(null);
  const [countdown,  setCountdown]  = useState(0);

  // Cuenta regresiva mientras está bloqueado
  React.useEffect(() => {
    if (!lockedUntil) return;
    const iv = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown(0);
        setErr("");
        clearInterval(iv);
      } else {
        setCountdown(left);
        setErr("🔒 Bloqueado por " + left + " segundo" + (left === 1 ? "" : "s"));
      }
    }, 500);
    return () => clearInterval(iv);
  }, [lockedUntil]);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  async function tap(d) {
    if (isLocked || pin.length >= 4) return;
    const np = pin + d;
    setPin(np);
    if (np.length === 4) {
      setTimeout(async () => {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(np));
        const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
        if (hex === sel.pin || np === sel.pin) {
          setAttempts(0);
          onLogin(sel);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setPin("");
          if (newAttempts >= MAX_ATTEMPTS) {
            const until = Date.now() + LOCKOUT_MS;
            setLockedUntil(until);
            setErr("🔒 Demasiados intentos. Bloqueado por 60 segundos.");
          } else {
            const left = MAX_ATTEMPTS - newAttempts;
            setErr("PIN incorrecto — " + left + " intento" + (left === 1 ? "" : "s") + " restante" + (left === 1 ? "" : "s"));
          }
        }
      }, 200);
    }
  }

  return ce("div", { style:{ ...S.app, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start" } },
    ce("div", { style:{ width:"100%", maxWidth:440, flex:1, display:"flex", flexDirection:"column" } },
      ce("div", { style:{ padding:"38px 20px 18px", textAlign:"center" } },
        ce("div", { style:{ display:"flex", justifyContent:"center", marginBottom:9 } }, ce(Logo, { size:48 })),
        ce("b",   { style:{ fontSize:19, color:C.accent, display:"block", marginBottom:3 } }, "Acceso Staff"),
        ce("div", { style:{ fontSize:11, color:C.muted } }, "Taseca · Barber & Tattoo")
      ),
      ce("div", { style:{ padding:"0 15px 40px", flex:1 } },
        !sel && ce("div", null,
          ce("div", { style:{ fontSize:12, color:C.muted, marginBottom:11, textAlign:"center" } }, "Selecciona tu perfil"),
          users.map(u =>
            ce("div", { key:u.id, onClick:()=>{ setSel(u); setPin(""); setErr(""); },
              style:{ background:C.card, border:"1px solid "+C.border, borderRadius:12, padding:"11px 13px",
                      marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:10 } },
              ce("div", { style:{ width:40, height:40, borderRadius:"50%", background:C.accent+"33",
                                   display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, overflow:"hidden", flexShrink:0 } },
                u.photo ? ce("img", { src:u.photo, style:{ width:"100%", height:"100%", objectFit:"cover" }, alt:"" }) : u.name[0]
              ),
              ce("div", null, ce("b", { style:{ fontSize:13 } }, u.name), ce("div", { style:{ color:C.muted, fontSize:11 } }, u.role)),
              ce("div", { style:{ marginLeft:"auto", color:C.muted, fontSize:15 } }, "›")
            )
          ),
          ce("button", { type:"button", style:{ ...S.btn("ghost"), width:"100%", marginTop:7 }, onClick:onBack }, "← Inicio")
        ),
        sel && ce("div", null,
          ce("div", { style:{ textAlign:"center", marginBottom:18 } },
            ce("div", { style:{ width:48, height:48, borderRadius:"50%", background:C.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, margin:"0 auto 7px", overflow:"hidden" } },
              sel.photo ? ce("img", { src:sel.photo, style:{ width:"100%", height:"100%", objectFit:"cover" }, alt:"" }) : sel.name[0]
            ),
            ce("b",   { style:{ fontSize:14 } }, sel.name),
            ce("div", { style:{ color:C.muted, fontSize:11, marginTop:9 } }, "Ingresa tu PIN")
          ),
          ce("div", { style:{ display:"flex", gap:11, justifyContent:"center", marginBottom:20 } },
            [0,1,2,3].map(i => ce("div", { key:i, style:{ width:13, height:13, borderRadius:"50%", background: isLocked?C.err:i<pin.length?C.accent:C.border } }))
          ),
          err && ce("div", { style:{ color:C.err, fontSize:12, textAlign:"center", marginBottom:9 } }, err),
          ce("div", { style:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, maxWidth:240, margin:"0 auto" } },
            [1,2,3,4,5,6,7,8,9].map(n =>
              ce("button", { type:"button", key:n, onClick:()=>tap(String(n)), disabled:!!isLocked,
                style:{ background:C.card, border:"1px solid "+C.border, borderRadius:11, padding:"14px",
                        fontSize:19, fontWeight:700, color: isLocked?C.border:C.text,
                        cursor: isLocked?"not-allowed":"pointer", textAlign:"center", opacity: isLocked?0.4:1 } }, n)
            ),
            ce("button", { type:"button", onClick:()=>{ setSel(null); setPin(""); setErr(""); },
              style:{ background:"transparent", border:"none", fontSize:12, color:C.muted, cursor:"pointer", padding:"14px", textAlign:"center" } }, "←"),
            ce("button", { type:"button", onClick:()=>tap("0"), disabled:!!isLocked,
              style:{ background:C.card, border:"1px solid "+C.border, borderRadius:11, padding:"14px", fontSize:19, fontWeight:700, color: isLocked?C.border:C.text, cursor: isLocked?"not-allowed":"pointer", textAlign:"center", opacity: isLocked?0.4:1 } }, "0"),
            ce("button", { type:"button", onClick:()=>setPin(p=>p.slice(0,-1)),
              style:{ background:"transparent", border:"none", fontSize:17, color:C.muted, cursor:"pointer", padding:"14px", textAlign:"center" } }, "⌫")
          )
        )
      )
    )
  );
}

// ─── LOADING SCREEN ──────────────────────────────────────────────
function LoadingScreen() {
  return ce("div", { style:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                               minHeight:"100vh", width:"100%", background:"linear-gradient(160deg,#080c10,#0d1520)" } },
    ce(Logo, { size:68 }),
    ce("div", { style:{ color:C.accent, fontSize:17, fontWeight:900, marginTop:14, letterSpacing:4 } }, "TASECA"),
    ce("div", { style:{ color:C.muted, fontSize:11, marginTop:7 } }, "Conectando...")
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────
export function App() {
  const [scr,       setScr]       = useState("loading");
  const [user,      setUser]      = useState(null);
  const [users,     setUsers]     = useState([]);
  const [svcs,      setSvcs]      = useState([]);
  const [prods,     setProds]     = useState([]);
  const [clients,   setClients]   = useState([]);
  const [appts,     setAppts]     = useState([]);
  const [sales,     setSales]     = useState([]);
  const [prodSales, setProdSales] = useState([]);
  const [cfg,       setCfg]       = useState(DEF_CFG);

  const init = useCallback(async () => {
    try {
      let u = await DB.all("users");
      if (u.length === 0 && !window._companyId) {
        for (const du of DEF_USERS) await DB.save("users", du.id, du);
        u = DEF_USERS;
      }
      setUsers(u);

      let sv = await DB.all("services");
      if (sv.length === 0 && !window._companyId) {
        for (const ds of DEF_SVC) await DB.save("services", ds.id, ds);
        sv = DEF_SVC;
      }
      setSvcs(sv);

      setProds(    await DB.all("products"));
      setClients(  await DB.all("clients"));
      setAppts(    await DB.all("appointments"));
      setSales(    await DB.all("sales"));
      setProdSales(await DB.all("product_sales"));

      const cfArr = await DB.all("config");
      if (cfArr.length > 0) {
        const loaded = cfArr[0];
        if (!loaded.id) loaded.id = "cfg_" + (window._companyId || "default");
        setCfg(loaded);
      } else {
        const defCfg = { ...DEF_CFG, id: window._companyId ? "cfg_"+window._companyId : "cfg" };
        setCfg(defCfg);
        await DB.save("config", defCfg.id, defCfg);
      }
      setScr("public");
    } catch (e) {
      console.error(e);
      setScr("public");
    }
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        if (window._companySlug) {
          const co = await DB.getCompany(window._companySlug);
          if (co) {
            window._companyId      = co.id;
            window._companyModules = co.modules ? (() => { try { return JSON.parse(co.modules); } catch { return null; } })() : null;
            window._companyTrialEnd   = co.trial_end    || null;
            window._companyPaymentDue = co.payment_due  || null;
          } else {
            console.warn("[Taseca] empresa no encontrada:", window._companySlug);
          }
        }
      } catch (e) { console.error("[Taseca] boot error:", e); }
      init();
    }
    boot();
  }, [init]);

  // ─── NOTIFICACIONES EN TIEMPO REAL (Supabase Realtime) ─────────
  useEffect(() => {
    if (!window.SB_URL || !window.SB_KEY) return;

    function showApptNotif(appt) {
      // Buscar nombre del barbero
      const staffName = users.find(u => u.id === (appt.stId||appt.st_id))?.name || "Tu profesional";
      const svcName   = appt.svc || appt.svc_name || "Servicio";
      const client    = appt.client || "Cliente";
      const date      = appt.date  || "";
      const time      = appt.time  || "";

      const msg = `📅 Nueva cita
👤 ${client}
✂️ ${svcName}
👨 ${staffName}
📆 ${date} a las ${time}`;

      // 1. Notificación del navegador
      if (window.Notification && Notification.permission === "granted") {
        try {
          new Notification("📅 Nueva cita — Taseca", {
            body: `${client} · ${svcName} · ${staffName}
${date} a las ${time}`,
            icon: "/icon-192.png",
            badge: "/icon-96.png",
            tag: "appt-" + (appt.id || Date.now())
          });
        } catch(e) {}
      }

      // 2. Banner visual en pantalla
      const banner = document.createElement("div");
      banner.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="font-size:24px;flex-shrink:0">📅</div>
          <div>
            <div style="font-weight:900;font-size:14px;color:#c9a84c;margin-bottom:3px">Nueva cita agendada</div>
            <div style="font-size:12px;color:#f0f0f0"><b>${client}</b></div>
            <div style="font-size:11px;color:#9aa">✂️ ${svcName} · 👨 ${staffName}</div>
            <div style="font-size:11px;color:#4ecdc4;margin-top:2px">📆 ${date} a las <b>${time}</b></div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#6a7a8a;font-size:18px;cursor:pointer;margin-left:auto;flex-shrink:0">×</button>
        </div>`;
      banner.style.cssText = "position:fixed;top:16px;right:16px;z-index:9999;background:#111820;border:1.5px solid #c9a84c55;border-radius:14px;padding:14px 16px;max-width:320px;box-shadow:0 4px 24px #000a;animation:slideIn .3s ease";
      if (!document.getElementById("taseca-notif-style")) {
        const st = document.createElement("style");
        st.id = "taseca-notif-style";
        st.textContent = "@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}";
        document.head.appendChild(st);
      }
      document.body.appendChild(banner);
      setTimeout(() => { try { banner.remove(); } catch {} }, 8000);

      // 3. Sonido de notificación
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i*0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.15 + 0.3);
          osc.start(ctx.currentTime + i*0.15);
          osc.stop(ctx.currentTime + i*0.15 + 0.3);
        });
      } catch {}
    }

    // Conectar a Supabase Realtime via WebSocket
    const companyFilter = window._companyId ? `company_id=eq.${window._companyId}` : null;
    const wsUrl = window.SB_URL.replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + window.SB_KEY + "&vsn=1.0.0";

    let ws, pingInterval, reconnectTimeout;
    let knownIds = new Set();

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[Taseca] Realtime conectado ✓");
          // Join channel
          ws.send(JSON.stringify({
            topic: "realtime:public:appointments" + (companyFilter ? ":" + companyFilter : ""),
            event: "phx_join",
            payload: { config: { broadcast: { self: false }, presence: { key: "" } } },
            ref: "1"
          }));
          // Heartbeat cada 30s
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: null }));
            }
          }, 30000);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === "INSERT" && msg.payload?.record) {
              const appt = msg.payload.record;
              // Evitar duplicados
              if (knownIds.has(appt.id)) return;
              knownIds.add(appt.id);
              // Normalizar campo st_id → stId
              if (appt.st_id && !appt.stId) appt.stId = appt.st_id;
              // Actualizar estado React
              setAppts(prev => {
                if (prev.some(a => a.id === appt.id)) return prev;
                return [...prev, appt];
              });
              // Mostrar notificación
              showApptNotif(appt);
            }
          } catch {}
        };

        ws.onclose = () => {
          clearInterval(pingInterval);
          console.log("[Taseca] Realtime desconectado — reconectando en 5s...");
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = () => ws.close();

      } catch(e) {
        console.warn("[Taseca] Realtime no disponible:", e.message);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      try { ws?.close(); } catch {}
    };
  }, [users]); // re-subscribe cuando cambian los usuarios (para tener nombres actualizados)

  // ─── AUTO-REFRESH cada 5 minutos ─────────────────────────────
  useEffect(() => {
    async function refresh() {
      if (!window._companyId && window._companySlug) return; // aún no inicializado
      try {
        // Limpiar cache para forzar datos frescos
        ["appointments","clients","sales","product_sales"].forEach(t => {
          const key = "taseca_cache_" + t + "_" + (window._companyId || "root");
          try { localStorage.removeItem(key); } catch {}
        });
        const [newAppts, newClients, newSales, newProdSales] = await Promise.all([
          DB.all("appointments"),
          DB.all("clients"),
          DB.all("sales"),
          DB.all("product_sales")
        ]);
        setAppts(newAppts);
        setClients(newClients);
        setSales(newSales);
        setProdSales(newProdSales);
        console.log("[Taseca] Auto-refresh ✓", new Date().toLocaleTimeString("es"));
      } catch(e) {
        console.warn("[Taseca] Auto-refresh error:", e.message);
      }
    }
    const INTERVAL = 5 * 60 * 1000; // 5 minutos
    const iv = setInterval(refresh, INTERVAL);
    return () => clearInterval(iv);
  }, []); // solo una vez al montar

  const sharedProps = { users, setUsers, svcs, setSvcs, prods, setProds, clients, setClients,
                         appts, setAppts, sales, setSales, prodSales, setProdSales, cfg, setCfg };

  if (scr === "loading")    return ce(LoadingScreen, null);
  if (scr === "superlogin") return ce(SuperLogin, { onLogin:()=>setScr("superadmin"), onBack:()=>setScr("public") });
  if (scr === "superadmin") return ce(SuperAdmin, { onLogout:()=>setScr("public") });
  if (scr === "login")      return ce(Login,      { users, onLogin:u=>{ setUser(u); setScr("admin"); }, onBack:()=>setScr("public") });
  if (scr === "admin")      return ce(Admin,       { ...sharedProps, user, onLogout:()=>{ setUser(null); setScr("public"); } });

  return ce(Public, {
    ...sharedProps,
    onBook:       a  => setAppts(x=>[...x,a]),
    onAdmin:      ()  => setScr("login"),
    onSuperAdmin: ()  => setScr("superlogin"),
    onReg:        c   => setClients(x=>[...x,c])
  });
}
