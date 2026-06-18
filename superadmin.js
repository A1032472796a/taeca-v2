import { C, S, SA_PWD_HASH } from "./config.js";
import { Toggle } from "./components.js";

const { createElement: ce, useState, useEffect } = React;

// ─── SUPER LOGIN ─────────────────────────────────────────────────
export function SuperLogin({ onLogin, onBack }) {
  const [pwd,  setPwd]  = useState("");
  const [err,  setErr]  = useState("");
  const [load, setLoad] = useState(false);
  const [show, setShow] = useState(false);

  async function login() {
    setErr(""); setLoad(true);
    try {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(pwd));
      const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
      if (hex === SA_PWD_HASH) onLogin();
      else { setErr("Contraseña incorrecta"); setPwd(""); }
    } catch { setErr("Error de verificación"); }
    setLoad(false);
  }

  return ce("div", { style:{ minHeight:"100vh", width:"100%", background:"linear-gradient(160deg,#080c10,#0d1520)",
                               display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" } },
    ce("div", { style:{ width:"100%", maxWidth:400 } },
      ce("div", { style:{ textAlign:"center", marginBottom:28 } },
        ce("div", { style:{ fontSize:11, color:C.err, fontWeight:900, letterSpacing:3, marginTop:8 } }, "⬡ SUPER ADMIN"),
        ce("div", { style:{ fontSize:18, fontWeight:900, color:C.accent, marginTop:4 } }, "TASECA Master Panel"),
        ce("div", { style:{ fontSize:11, color:C.muted, marginTop:4 } }, "Gestión central de empresas")
      ),
      ce("div", { style:{ background:C.card, border:"1px solid "+C.err+"44", borderRadius:14, padding:"20px 16px 24px" } },
        ce("label", { style:S.lbl }, "Contraseña maestra"),
        ce("div", { style:{ position:"relative", marginBottom:12 } },
          ce("input", { style:{ ...S.inp, paddingRight:44 }, type: show?"text":"password",
            placeholder:"Contraseña alfanumérica", value:pwd,
            onChange:e=>{ setPwd(e.target.value); setErr(""); },
            onKeyDown:e=>{ if(e.key==="Enter") login(); }
          }),
          ce("button", { type:"button",
            style:{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 },
            onClick:()=>setShow(v=>!v) }, show?"🙈":"👁️")
        ),
        err && ce("div", { style:{ background:C.err+"22", border:"1px solid "+C.err+"44", borderRadius:9, padding:"8px 12px", fontSize:12, color:C.err, marginBottom:10 } }, "⚠️ ", err),
        ce("button", { type:"button",
          style:{ background:C.err, border:"none", borderRadius:10, padding:"11px", fontSize:14, color:"#fff", fontWeight:700, cursor:"pointer", width:"100%", opacity:load?0.6:1 },
          onClick:login, disabled:load }, load?"Verificando...":"Ingresar al panel"),
        ce("button", { type:"button",
          style:{ background:"none", border:"none", color:C.muted, fontSize:11, cursor:"pointer", width:"100%", marginTop:10 },
          onClick:onBack }, "← Volver al inicio")
      )
    )
  );
}

// ─── EDIT COMPANY MODAL ──────────────────────────────────────────
function EditCompanyMdl({ co, onClose, onSave }) {
  const [name,  setName]  = useState(co.company_name || "");
  const [type,  setType]  = useState(co.plan || "barberia");
  const [trial, setTrial] = useState(co.trial_end || "");
  const [pay,   setPay]   = useState(co.payment_due || "");
  const [mods,  setMods]  = useState(() => { try { return JSON.parse(co.modules||"{}"); } catch { return {}; } });
  const [err,   setErr]   = useState("");
  const [load,  setLoad]  = useState(false);

  function toggleMod(m) { setMods(p => ({ ...p, [m]: !p[m] })); }
  function addDays(d)   { const dt = new Date(); dt.setDate(dt.getDate()+d); return dt.toISOString().slice(0,10); }

  function save() {
    if (!name.trim()) { setErr("Nombre obligatorio"); return; }
    setLoad(true); setErr("");
    const payload = { company_name:name.trim(), plan:type, trial_end:trial||null, payment_due:pay||null, modules:JSON.stringify(mods) };
    fetch(window.SB_URL+"/rest/v1/company?id=eq."+co.id, {
      method:"PATCH",
      headers:{ "apikey":window.SB_KEY, "Authorization":"Bearer "+window.SB_KEY, "Content-Type":"application/json", "Prefer":"return=representation" },
      body: JSON.stringify(payload)
    })
    .then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t); }))
    .then(() => { onSave({ ...co, ...payload }); setLoad(false); })
    .catch(e => { setErr(e.message); setLoad(false); });
  }

  const TYPES = [{v:"barberia",l:"Barbería"},{v:"tatuaje",l:"Tatuaje"},{v:"mixto",l:"Mixto"},{v:"estetica",l:"Estética"}];
  const MOD_LIST = [["agenda","📅 Agenda",true],["clientes","👥 Clientes",true],
    ["sellos","🎫 Sellos",false],["catalogo","🛒 Catálogo",false],["caja","💰 Caja",false],["reportes","📊 Reportes",false]];

  return ce("div", { style:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"flex-end", justifyContent:"center" }, onClick:onClose },
    ce("div", { style:{ ...S.mb, maxHeight:"90vh" }, onClick:e=>e.stopPropagation() },
      ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 } },
        ce("b", { style:{ fontSize:15, color:C.accent } }, "✏️ Editar: ", co.company_name),
        ce("button", { type:"button", onClick:onClose, style:{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" } }, "×")
      ),
      ce("div", { style:{ marginBottom:10 } },
        ce("label", { style:S.lbl }, "Nombre"),
        ce("input", { style:S.inp, value:name, onChange:e=>setName(e.target.value) })
      ),
      ce("div", { style:{ marginBottom:10 } },
        ce("label", { style:S.lbl }, "Tipo"),
        ce("select", { style:S.inp, value:type, onChange:e=>setType(e.target.value) },
          TYPES.map(t => ce("option", { key:t.v, value:t.v }, t.l))
        )
      ),
      // Trial + Payment
      [["⏳ Vencimiento trial", trial, setTrial],["💳 Fecha de pago", pay, setPay]].map(([lbl,val,set]) =>
        ce("div", { key:lbl, style:{ background:"#1a2230", borderRadius:11, padding:"11px 13px", marginBottom:10, border:"1px solid "+C.border } },
          ce("label", { style:{ ...S.lbl, fontWeight:700, display:"block", marginBottom:6 } }, lbl),
          ce("input", { style:S.inp, type:"date", value:val, onChange:e=>set(e.target.value) }),
          ce("div", { style:{ display:"flex", gap:5, marginTop:6 } },
            [7,14,30].map(d =>
              ce("button", { type:"button", key:d, onClick:()=>set(addDays(d)),
                style:{ flex:1, padding:"5px", borderRadius:8, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:10, cursor:"pointer" } }, "+"+d+"d")
            )
          )
        )
      ),
      // Modules
      ce("div", { style:{ background:"#1a2230", borderRadius:11, padding:"11px 13px", marginBottom:10, border:"1px solid "+C.border } },
        ce("b", { style:{ fontSize:12, color:C.accent, display:"block", marginBottom:10 } }, "🧩 Módulos"),
        ce("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 } },
          MOD_LIST.map(([key,icon,req]) => {
            const on = !!mods[key];
            return ce("div", { key, onClick:()=>{ if(!req) toggleMod(key); },
              style:{ background: on?C.accent+"11":"transparent", border:"1px solid "+(on?C.accent+"44":C.border),
                      borderRadius:9, padding:"8px 10px", cursor:req?"default":"pointer" } },
              ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center" } },
                ce("span", { style:{ fontSize:12 } }, icon+" "+key),
                ce(Toggle, { val:on, onChange:()=>{ if(!req) toggleMod(key); } })
              ),
              req && ce("div", { style:{ fontSize:8, color:C.warn, marginTop:2 } }, "🔒 Incluido")
            );
          })
        )
      ),
      err && ce("div", { style:{ background:C.err+"22", border:"1px solid "+C.err+"44", borderRadius:9, padding:"8px 11px", fontSize:12, color:C.err, marginBottom:8, wordBreak:"break-all" } }, err),
      ce("div", { style:{ display:"flex", gap:10 } },
        ce("button", { type:"button", style:{ ...S.btn("ghost"), flex:1 }, onClick:onClose }, "Cancelar"),
        ce("button", { type:"button", style:{ ...S.btn("gold"), flex:2, color:"#000", opacity:load?0.6:1 }, disabled:load, onClick:save }, load?"Guardando...":"Guardar cambios")
      )
    )
  );
}

// ─── SUPER ADMIN PANEL ───────────────────────────────────────────
export function SuperAdmin({ onLogout }) {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [sel,       setSel]       = useState([]);
  const [editCo,    setEditCo]    = useState(null);

  useEffect(() => {
    fetch(window.SB_URL+"/rest/v1/company?select=*&order=id.asc", {
      headers:{ "apikey":window.SB_KEY, "Authorization":"Bearer "+window.SB_KEY }
    })
    .then(r=>r.json())
    .then(d=>{ setCompanies(Array.isArray(d)?d:[]); setLoading(false); })
    .catch(()=>setLoading(false));
  }, []);

  // ── New Company Modal ──
  function NewCompanyMdl() {
    const [name,       setName]       = useState("");
    const [slug,       setSlug]       = useState("");
    const [type,       setType]       = useState("barberia");
    const [pin,        setPin]        = useState("0000");
    const [err,        setErr]        = useState("");
    const [load,       setLoad]       = useState(false);
    const [trialDays,  setTrialDays]  = useState(14);
    const [mods,       setMods]       = useState({ agenda:true, clientes:true, sellos:false, catalogo:false, caja:false, reportes:false });

    function toggleMod(m) { setMods(p => ({ ...p, [m]: !p[m] })); }

    async function save() {
      setErr(""); setLoad(true);
      if (!name.trim()) { setErr("Nombre obligatorio"); setLoad(false); return; }
      if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) { setErr("Slug: solo letras minúsculas, números y guiones"); setLoad(false); return; }
      if (companies.some(c => c.company_id === slug)) { setErr("Ese subdominio ya existe"); setLoad(false); return; }
      try {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(pin));
        const hashedPin = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
        const trialEnd  = (() => { const d=new Date(); d.setDate(d.getDate()+trialDays); return d.toISOString().slice(0,10); })();

        const coRes = await fetch(window.SB_URL+"/rest/v1/company", {
          method:"POST",
          headers:{ "apikey":window.SB_KEY, "Authorization":"Bearer "+window.SB_KEY, "Content-Type":"application/json", "Prefer":"return=representation" },
          body: JSON.stringify({ company_name:name.trim(), company_id:slug, active:true, plan:type, trial_end:trialEnd, modules:JSON.stringify(mods) })
        });
        if (!coRes.ok) throw new Error(await coRes.text());
        const newCo = (await coRes.json())[0];

        await fetch(window.SB_URL+"/rest/v1/users", {
          method:"POST",
          headers:{ "apikey":window.SB_KEY, "Authorization":"Bearer "+window.SB_KEY, "Content-Type":"application/json", "Prefer":"return=representation" },
          body: JSON.stringify({ id:"u_"+newCo.id+"_admin", name:"Admin", role:"admin", pin:hashedPin, photo:null, work_days:[1,2,3,4,5,6], w_start:"08:00", w_end:"21:00", blocks:{}, company_id:newCo.id })
        });
        await fetch(window.SB_URL+"/rest/v1/config", {
          method:"POST",
          headers:{ "apikey":window.SB_KEY, "Authorization":"Bearer "+window.SB_KEY, "Content-Type":"application/json", "Prefer":"return=representation" },
          body: JSON.stringify({ id:"cfg_"+newCo.id, stamps_on:true, company_id:newCo.id })
        });
        setCompanies(x => [...x, newCo]);
        alert(`✅ Empresa creada!\n\n🏢 ${name.trim()}\n🔗 app.taseca.tech?e=${slug}\n🔑 PIN Admin: ${pin}`);
        setShowNew(false);
      } catch(e) { setErr("Error: "+e.message); }
      setLoad(false);
    }

    const MOD_LIST = [
      ["agenda","📅 Agenda","Citas y calendario",true],["clientes","👥 Clientes","Base de clientes",true],
      ["sellos","🎫 Sellos","Programa de fidelidad",false],["catalogo","🛒 Catálogo","Productos e inventario",false],
      ["caja","💰 Caja","Ventas y cobros",false],["reportes","📊 Reportes","Métricas",false]
    ];
    const TYPES = [{v:"barberia",l:"Barbería"},{v:"tatuaje",l:"Tatuaje"},{v:"mixto",l:"Mixto"},{v:"estetica",l:"Estética"}];

    return ce("div", { style:S.ov, onClick:()=>setShowNew(false) },
      ce("div", { style:S.mb, onClick:e=>e.stopPropagation() },
        ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 } },
          ce("b", { style:{ fontSize:15, color:C.accent } }, "🏢 Nueva Empresa"),
          ce("button", { type:"button", onClick:()=>setShowNew(false), style:{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" } }, "✕")
        ),
        ce("div", { style:{ marginBottom:10 } },
          ce("label", { style:S.lbl }, "Nombre del negocio *"),
          ce("input", { style:S.inp, placeholder:"Barbería El Rey", value:name, onChange:e=>setName(e.target.value) })
        ),
        ce("div", { style:{ marginBottom:10 } },
          ce("label", { style:S.lbl }, "Slug *"),
          ce("div", { style:{ display:"flex", alignItems:"center", gap:6 } },
            ce("input", { style:S.inp, placeholder:"elrey", value:slug, onChange:e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"")) }),
            ce("span", { style:{ fontSize:11, color:C.muted, whiteSpace:"nowrap" } }, ".taseca.tech")
          ),
          slug && ce("div", { style:{ fontSize:10, color:C.cyan, marginTop:4 } }, "→ app.taseca.tech?e=", slug)
        ),
        ce("div", { style:{ marginBottom:10 } },
          ce("label", { style:S.lbl }, "Tipo"),
          ce("select", { style:S.inp, value:type, onChange:e=>setType(e.target.value) },
            TYPES.map(t => ce("option", { key:t.v, value:t.v }, t.l))
          )
        ),
        ce("div", { style:{ marginBottom:10 } },
          ce("label", { style:S.lbl }, "PIN Admin"),
          ce("input", { style:S.inp, placeholder:"0000", value:pin, onChange:e=>setPin(e.target.value) })
        ),
        // Trial selector
        ce("div", { style:{ background:"#1a2230", borderRadius:11, padding:"12px 13px", marginBottom:10, border:"1px solid "+C.border } },
          ce("b", { style:{ fontSize:12, color:C.accent, display:"block", marginBottom:8 } }, "⏳ Período de prueba"),
          ce("div", { style:{ display:"flex", gap:6 } },
            [7,14,30,60].map(d => ce("button", { type:"button", key:d, onClick:()=>setTrialDays(d),
              style:{ flex:1, padding:"7px 4px", borderRadius:9, border:"1.5px solid "+(trialDays===d?C.accent:C.border),
                      background: trialDays===d?C.accent+"22":"transparent", color: trialDays===d?C.accent:C.muted,
                      fontSize:12, fontWeight: trialDays===d?700:400, cursor:"pointer" } }, d+" días")
            )
          )
        ),
        // Modules
        ce("div", { style:{ background:"#1a2230", borderRadius:11, padding:"12px 13px", marginBottom:10, border:"1px solid "+C.border } },
          ce("b", { style:{ fontSize:12, color:C.accent, display:"block", marginBottom:10 } }, "🧩 Módulos"),
          ce("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 } },
            MOD_LIST.map(([key,icon,desc,req]) => {
              const on = !!mods[key];
              return ce("div", { key, onClick:()=>{ if(!req) toggleMod(key); },
                style:{ background: on?C.accent+"11":"transparent", border:"1px solid "+(on?C.accent+"44":C.border),
                        borderRadius:9, padding:"8px 10px", cursor:req?"default":"pointer" } },
                ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center" } },
                  ce("div", null, ce("div", { style:{ fontSize:13 } }, icon), ce("div", { style:{ fontSize:10, color: on?C.accent:C.muted, fontWeight:700 } }, key)),
                  ce(Toggle, { val:on, onChange:()=>{ if(!req) toggleMod(key); } })
                ),
                req && ce("div", { style:{ fontSize:8, color:C.warn } }, "🔒 Incluido")
              );
            })
          )
        ),
        err && ce("div", { style:{ background:C.err+"22", border:"1px solid "+C.err+"44", borderRadius:9, padding:"8px 11px", fontSize:12, color:C.err, marginBottom:8 } }, "⚠️ ", err),
        ce("div", { style:{ display:"flex", gap:10, marginTop:8 } },
          ce("button", { type:"button", style:{ flex:1, background:"transparent", border:"1px solid "+C.border, borderRadius:10, padding:"9px", color:C.muted, cursor:"pointer" }, onClick:()=>setShowNew(false) }, "Cancelar"),
          ce("button", { type:"button", style:{ flex:2, background:C.accent, border:"none", borderRadius:10, padding:"9px", color:"#000", fontWeight:700, cursor:"pointer", opacity:load?0.6:1 }, onClick:save, disabled:load }, load?"Creando...":"✅ Crear empresa")
        )
      )
    );
  }

  const ICONS  = { barberia:"💈", tatuaje:"🪡", mixto:"💈", estetica:"💅" };
  const COLORS = { barberia:C.cyan, tatuaje:"#8e44ad", mixto:C.accent, estetica:"#e91e63" };

  // Payment alerts
  const today2 = new Date(); today2.setHours(0,0,0,0);
  const venc = companies.filter(c => c.payment_due && Math.ceil((new Date(c.payment_due)-today2)/864e5)<=0);
  const prox = companies.filter(c => { const d=c.payment_due&&Math.ceil((new Date(c.payment_due)-today2)/864e5); return d>0&&d<=7; });

  return ce("div", { style:{ background:"linear-gradient(160deg,#080c10,#0d1520)", minHeight:"100vh", width:"100%", color:C.text } },
    // Header
    ce("div", { style:{ background:"linear-gradient(135deg,#0d1520,#080c10)", padding:"14px 16px", borderBottom:"2px solid "+C.err+"44" } },
      ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center" } },
        ce("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
          ce("div", { style:{ fontSize:14, fontWeight:900, color:C.accent } }, "TASECA"),
          ce("div", { style:{ fontSize:9, color:C.err, fontWeight:700, letterSpacing:2 } }, "⬡ SUPER ADMIN")
        ),
        ce("button", { type:"button", style:{ background:C.border, border:"none", borderRadius:9, padding:"5px 12px", color:C.muted, fontSize:11, cursor:"pointer" }, onClick:onLogout }, "← Salir")
      )
    ),
    // Alerts
    (venc.length||prox.length) ? ce("div", { style:{ padding:"12px 16px 0" } },
      venc.length > 0 && ce("div", { style:{ background:C.err+"22", border:"1px solid "+C.err+"55", borderRadius:10, padding:"10px 14px", marginBottom:6, display:"flex", gap:8, alignItems:"center" } },
        ce("span", { style:{ fontSize:20 } }, "🚨"),
        ce("div", null, ce("b", { style:{ color:C.err, fontSize:13 } }, venc.length, " pago(s) VENCIDO(S)"),
                        ce("div", { style:{ fontSize:11, color:C.muted } }, venc.map(c=>c.company_name).join(", ")))
      ),
      prox.length > 0 && ce("div", { style:{ background:C.warn+"22", border:"1px solid "+C.warn+"55", borderRadius:10, padding:"10px 14px", display:"flex", gap:8, alignItems:"center" } },
        ce("span", { style:{ fontSize:20 } }, "⚠️"),
        ce("div", null, ce("b", { style:{ color:C.warn, fontSize:13 } }, prox.length, " pago(s) próximo(s) ≤7d"),
                        ce("div", { style:{ fontSize:11, color:C.muted } }, prox.map(c=>c.company_name+"("+c.payment_due+")").join(", ")))
      )
    ) : null,
    // KPIs
    ce("div", { style:{ padding:"16px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 } },
      [[companies.length,"🏢","Total",C.accent],[companies.filter(c=>c.active!==false).length,"✅","Activas",C.ok],[companies.filter(c=>c.active===false).length,"🔒","Inactivas",C.muted]]
      .map(([val,icon,lbl,col]) =>
        ce("div", { key:lbl, style:{ background:col+"18", border:"1px solid "+col+"33", borderRadius:12, padding:"12px 8px", textAlign:"center" } },
          ce("div", { style:{ fontSize:22, fontWeight:900, color:col } }, val),
          ce("div", { style:{ fontSize:9, color:C.muted, marginTop:2 } }, lbl)
        )
      )
    ),
    // List
    ce("div", { style:{ padding:"0 16px 100px" } },
      ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 } },
        ce("b", { style:{ fontSize:14, color:C.accent } }, "🏢 Empresas"),
        ce("div", { style:{ display:"flex", gap:7 } },
          sel.length > 0 && ce("button", { type:"button",
            style:{ background:C.err, border:"none", borderRadius:10, padding:"7px 14px", fontSize:12, color:"#fff", fontWeight:700, cursor:"pointer" },
            onClick:() => {
              if (!confirm("¿Eliminar "+sel.length+" empresa(s)?")) return;
              sel.forEach(id => fetch(window.SB_URL+"/rest/v1/company?id=eq."+id, { method:"DELETE", headers:{ "apikey":window.SB_KEY,"Authorization":"Bearer "+window.SB_KEY } }));
              setCompanies(x=>x.filter(c=>!sel.includes(c.id))); setSel([]);
            }
          }, "🗑️ Eliminar ("+sel.length+")"),
          ce("button", { type:"button", style:{ background:C.accent, border:"none", borderRadius:10, padding:"7px 14px", fontSize:12, color:"#000", fontWeight:700, cursor:"pointer" }, onClick:()=>setShowNew(true) }, "+ Nueva empresa")
        )
      ),
      loading && ce("div", { style:{ textAlign:"center", padding:"32px", color:C.muted } }, "⏳ Cargando..."),
      companies.map(co => {
        const tc     = COLORS[co.plan] || C.accent;
        const active = co.active !== false;
        const isSel  = sel.includes(co.id);
        const dLeft  = co.payment_due ? Math.ceil((new Date(co.payment_due)-today2)/864e5) : null;
        const payCol = dLeft!==null ? (dLeft<=0?C.err:dLeft<=7?C.warn:C.ok) : null;
        const trialDaysLeft = co.trial_end ? Math.ceil((new Date(co.trial_end)-today2)/864e5) : null;
        return ce("div", { key:co.id,
          style:{ background:C.card, border:"1px solid "+(isSel?C.err+"88":active?tc+"44":C.border),
                  borderRadius:14, padding:"13px 15px", marginBottom:10, opacity:active?1:0.6 } },
          ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center" } },
            ce("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
              ce("div", { onClick:e=>{ e.stopPropagation(); setSel(p=>p.includes(co.id)?p.filter(x=>x!==co.id):[...p,co.id]); },
                style:{ width:20, height:20, borderRadius:5, border:"2px solid "+(isSel?C.err:C.border), background:isSel?C.err:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
                isSel && ce("span", { style:{ color:"#fff", fontSize:12, fontWeight:900 } }, "✓")
              ),
              ce("div", { style:{ width:42, height:42, borderRadius:11, background:tc+"22", border:"1px solid "+tc+"44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 } }, ICONS[co.plan]||"🏢"),
              ce("div", null,
                ce("b",   { style:{ fontSize:14 } }, co.company_name),
                ce("div", { style:{ fontSize:11, color:C.cyan,  marginTop:1 } }, "app.taseca.tech?e=", co.company_id),
                trialDaysLeft !== null && trialDaysLeft >= 0 && ce("div", { style:{ fontSize:9, color: trialDaysLeft<=3?C.err:trialDaysLeft<=7?C.warn:C.ok, fontWeight:700 } }, "⏳ Trial: ", trialDaysLeft, "d restantes"),
                trialDaysLeft !== null && trialDaysLeft < 0  && ce("div", { style:{ fontSize:9, color:C.err, fontWeight:700 } }, "❌ Trial vencido")
              )
            ),
            ce("span", { style:{ background:(active?C.ok:C.muted)+"22", color:active?C.ok:C.muted, fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:600 } }, active?"Activa":"Inactiva")
          ),
          payCol && ce("div", { style:{ background:payCol+"22", border:"1px solid "+payCol+"55", borderRadius:8, padding:"5px 10px", margin:"8px 0", fontSize:10, color:payCol, fontWeight:700 } },
            dLeft<=0 ? "❌ PAGO VENCIDO hace "+Math.abs(dLeft)+"d" : "💳 Pago en "+dLeft+"d — "+co.payment_due
          ),
          ce("div", { style:{ display:"flex", gap:6, marginTop:8 } },
            ce("button", { type:"button", style:{ flex:2, background:C.cyan, border:"none", borderRadius:10, padding:"7px", fontSize:11, color:"#000", fontWeight:700, cursor:"pointer" }, onClick:()=>window.open("https://app.taseca.tech?e="+co.company_id,"_blank") }, "🚀 Abrir"),
            ce("button", { type:"button", style:{ flex:1, background:C.accent+"22", border:"1px solid "+C.accent+"44", borderRadius:10, padding:"7px", fontSize:11, color:C.accent, fontWeight:700, cursor:"pointer" }, onClick:e=>{ e.stopPropagation(); setEditCo({...co}); } }, "✏️"),
            ce("button", { type:"button", style:{ flex:1, background:"transparent", border:"1px solid "+C.border, borderRadius:10, padding:"6px", fontSize:11, color:C.muted, cursor:"pointer" },
              onClick:() => {
                fetch(window.SB_URL+"/rest/v1/company?id=eq."+co.id, { method:"PATCH", headers:{ "apikey":window.SB_KEY,"Authorization":"Bearer "+window.SB_KEY,"Content-Type":"application/json" }, body:JSON.stringify({ active:!active }) });
                setCompanies(x=>x.map(c=>c.id===co.id?{ ...c, active:!active }:c));
              }
            }, active?"Desactivar":"Activar")
          )
        );
      })
    ),
    showNew && ce(NewCompanyMdl, null),
    editCo  && ce(EditCompanyMdl, { co:editCo, onClose:()=>setEditCo(null), onSave:upd=>{ setCompanies(x=>x.map(c=>c.id===upd.id?upd:c)); setEditCo(null); } })
  );
}
