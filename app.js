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

  // ─── NOTIFICACIONES: polling cada 30s para citas nuevas ─────────
  useEffect(() => {
    // Guardar IDs conocidos al arrancar
    const knownIds = new Set(appts.map(a => a.id));

    function showApptNotif(a) {
      const staffName = users.find(u => u.id === (a.stId||a.st_id))?.name || "Tu profesional";
      const title     = "📅 Nueva cita — " + (a.client || "Cliente");
      const body      = `✂️ ${a.svc||"Servicio"} · 👨 ${staffName}\n📆 ${a.date} a las ${a.time}`;

      // 1. Notificación nativa del navegador
      if (window.Notification?.permission === "granted") {
        try { new Notification(title, { body, icon:"/icon-192.png", tag:"appt-"+a.id }); } catch {}
      }

      // 2. Banner visual
      const div = document.createElement("div");
      div.style.cssText = "position:fixed;top:16px;right:16px;z-index:99999;background:#111820;border:1.5px solid #c9a84c;border-radius:14px;padding:14px 16px;max-width:300px;box-shadow:0 4px 24px #000c;font-family:system-ui,sans-serif;animation:tslideIn .3s ease";
      div.innerHTML = `
        <style>@keyframes tslideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}</style>
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="font-size:22px">📅</div>
          <div style="flex:1">
            <div style="font-weight:900;color:#c9a84c;font-size:13px;margin-bottom:4px">Nueva cita agendada</div>
            <div style="color:#f0f0f0;font-size:12px;font-weight:700">${a.client||"Cliente"}</div>
            <div style="color:#aaa;font-size:11px;margin-top:2px">✂️ ${a.svc||""} · 👨 ${staffName}</div>
            <div style="color:#4ecdc4;font-size:11px;font-weight:700;margin-top:3px">📆 ${a.date} · ${a.time}</div>
          </div>
          <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:#666;font-size:20px;cursor:pointer;line-height:1;padding:0">×</button>
        </div>`;
      document.body.appendChild(div);
      setTimeout(() => { try { div.remove(); } catch {} }, 9000);

      // 3. Sonido
      try {
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        [523,659,784].forEach((f,i) => {
          const o=ctx.createOscillator(), g=ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value=f; o.type="sine";
          g.gain.setValueAtTime(0.12, ctx.currentTime+i*.18);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*.18+.35);
          o.start(ctx.currentTime+i*.18); o.stop(ctx.currentTime+i*.18+.35);
        });
      } catch {}
    }

    async function checkNewAppts() {
      try {
        // Limpiar cache para traer datos frescos
        const ck = "taseca_cache_appointments_" + (window._companyId||"root");
        try { localStorage.removeItem(ck); } catch {}
        delete window._memCache?.[ck];

        const fresh = await DB.all("appointments");
        const newOnes = fresh.filter(a => !knownIds.has(a.id));
        newOnes.forEach(a => {
          knownIds.add(a.id);
          showApptNotif(a);
        });
        if (newOnes.length > 0) {
          setAppts(fresh);
        }
      } catch(e) {
        console.warn("[Taseca] notif check error:", e.message);
      }
    }

    // Inicializar knownIds con las citas actuales
    appts.forEach(a => knownIds.add(a.id));

    const iv = setInterval(checkNewAppts, 30000); // cada 30 segundos
    return () => clearInterval(iv);
  }, []); // solo una vez

  // ─── AUTO-REFRESH cada 5 minutos ─────────────────────────────
  useEffect(() => {  // ─── AUTO-REFRESH cada 5 minutos ─────────────────────────────
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
