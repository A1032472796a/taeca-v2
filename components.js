import { C, S } from "./config.js";
import { today } from "./helpers.js";

const { createElement: ce, useState } = React;

// ─── LOGO ────────────────────────────────────────────────────────
export function Logo({ size = 60 }) {
  return ce("svg", { width: size, height: size, viewBox: "0 0 100 100", fill: "none" },
    ce("defs", null,
      ce("linearGradient", { id: "lg", x1: "0%", y1: "100%", x2: "100%", y2: "0%" },
        ce("stop", { offset: "0%",   stopColor: "#c9a84c" }),
        ce("stop", { offset: "100%", stopColor: "#4ecdc4" })
      )
    ),
    ce("circle",  { cx:50, cy:45, r:36, stroke:"#4ecdc4", strokeWidth:0.8, strokeDasharray:"3 3", fill:"none", opacity:0.5 }),
    ce("polygon", { points:"50,8 88,78 12,78", stroke:"url(#lg)", strokeWidth:2.5, fill:"none" }),
    ce("ellipse", { cx:50, cy:50, rx:13, ry:8, stroke:"url(#lg)", strokeWidth:1.8, fill:"#080c10" }),
    ce("circle",  { cx:50, cy:50, r:4.5, fill:"url(#lg)" }),
    ce("circle",  { cx:50, cy:50, r:2,   fill:"#000" }),
    ce("rect", { x:40, y:64, width:3, height:7,  fill:"url(#lg)", rx:1 }),
    ce("rect", { x:45, y:61, width:3, height:10, fill:"url(#lg)", rx:1 }),
    ce("rect", { x:50, y:58, width:3, height:13, fill:"url(#lg)", rx:1 }),
    ce("rect", { x:55, y:61, width:3, height:10, fill:"url(#lg)", rx:1 }),
    ce("rect", { x:60, y:64, width:3, height:7,  fill:"url(#lg)", rx:1 }),
    ce("circle", { cx:50, cy:8,  r:2, fill:"#4ecdc4" }),
    ce("circle", { cx:88, cy:78, r:2, fill:"#4ecdc4" }),
    ce("circle", { cx:12, cy:78, r:2, fill:"#4ecdc4" })
  );
}

// ─── FIELD ───────────────────────────────────────────────────────
export function Field({ label, val, set, opts, type, ph }) {
  return ce("div", { style: { marginBottom: 10 } },
    ce("label", { style: S.lbl }, label),
    opts
      ? ce("select", { style: S.inp, value: val || "", onChange: e => set(e.target.value) },
          ce("option", { value: "" }, "Seleccionar..."),
          opts.map(o => ce("option", { key: o.v, value: o.v }, o.l))
        )
      : ce("input", {
          style: S.inp, type: type || "text", placeholder: ph || "",
          value: val || "",
          onChange: e => set(e.target.value),
          onKeyDown: e => { if (e.key === "Enter") e.preventDefault(); }
        })
  );
}

// ─── MODAL ───────────────────────────────────────────────────────
export function Mdl({ title, close, save, saveLabel, children }) {
  return ce("div", { style: S.ov, onClick: close },
    ce("div", { style: S.mb, onClick: e => e.stopPropagation(),
                onKeyDown: e => { if (e.key === "Enter") e.stopPropagation(); } },
      ce("div", { style: { ...S.row, marginBottom: 14 } },
        ce("b",      { style: { fontSize: 15, color: C.accent } }, title),
        ce("button", { type: "button", onClick: close,
                       style: { background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" } }, "✕")
      ),
      children,
      ce("div", { style: { display:"flex", gap:10, marginTop:8 } },
        ce("button", { type:"button", style:{ ...S.btn("ghost"), flex:1 }, onClick:close }, "Cancelar"),
        ce("button", { type:"button", style:{ ...S.btn(),        flex:2 }, onClick:save  }, saveLabel || "Guardar")
      )
    )
  );
}

// ─── TOGGLE ──────────────────────────────────────────────────────
export function Toggle({ val, onChange }) {
  return ce("div", {
    onClick: onChange,
    style: { width:44, height:24, borderRadius:12, background: val ? C.ok : C.border,
             cursor:"pointer", position:"relative", transition:"background .25s", flexShrink:0 }
  },
    ce("div", { style: { width:18, height:18, borderRadius:"50%", background:"#fff",
                          position:"absolute", top:3, left: val ? 23 : 3, transition:"left .25s" } })
  );
}

// ─── PHONE INPUT ─────────────────────────────────────────────────
export function PhoneInput({ label, val, set, ph }) {
  const digs = (val || "").replace(/\D/g, "");
  const ok   = digs.length === 10;
  return ce("div", { style: { marginBottom: 10 } },
    ce("label", { style: S.lbl }, label || "Telefono (10 digitos)"),
    ce("div", { style: { position:"relative" } },
      ce("input", {
        style: { ...S.inp, borderColor: digs.length > 0 ? (ok ? C.ok : C.err) : C.border },
        type: "tel", placeholder: ph || "0981000000",
        value: val || "",
        onChange: e => set(e.target.value.replace(/\D/g,"").slice(0,10)),
        onKeyDown: e => { if (e.key === "Enter") e.preventDefault(); }
      }),
      digs.length > 0 && ce("span", {
        style: { position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                 fontSize:11, color: ok ? C.ok : C.err, fontWeight:700 }
      }, digs.length + "/10")
    )
  );
}

// ─── STAMP CARD ──────────────────────────────────────────────────
export function StampCard({ n = 0 }) {
  const tot = 10;
  return ce("div", { style: { background:"#1a1a0a", border:"1.5px solid "+C.accent+"44", borderRadius:13, padding:"13px 14px" } },
    ce("div", { style: { display:"flex", justifyContent:"space-between", marginBottom:8 } },
      ce("b",    { style: { color:C.accent, fontSize:13 } }, "Tarjeta de Fidelidad"),
      ce("span", { style: { color:C.muted,  fontSize:12 } }, n + "/" + tot)
    ),
    ce("div", { style: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5, marginBottom:10 } },
      Array.from({ length: tot }, (_, i) =>
        ce("div", { key: i, style: {
          aspectRatio:"1", borderRadius:7,
          background: i < n ? "linear-gradient(135deg,#c9a84c,#f0c040)" : C.border,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:13
        }}, i < n ? "✂" : "")
      )
    ),
    ce("div", { style: { background: n >= tot ? "#2ecc7122" : "#1a2230", borderRadius:8, padding:"6px 10px", textAlign:"center", fontSize:12 } },
      n >= tot
        ? ce("b",    { style: { color: C.ok } },   "Servicio gratis disponible! 🎉")
        : ce("span", { style: { color: C.muted } }, "Faltan ", ce("b", { style:{ color:C.accent } }, tot-n), " sellos para tu servicio gratis")
    )
  );
}

// ─── POINTS BAR ──────────────────────────────────────────────────
export function PtsBar({ pts = 0 }) {
  const lvls = [
    { n:"Bronze",   min:0,    max:100,  c:"#cd7f32" },
    { n:"Silver",   min:100,  max:300,  c:"#aaa"    },
    { n:"Gold",     min:300,  max:700,  c:C.accent  },
    { n:"Platinum", min:700,  max:1500, c:C.cyan    }
  ];
  const cur = lvls.find((l,i) => pts >= l.min && (pts < l.max || i === lvls.length-1)) || lvls[0];
  const pct = Math.min(100, cur.max > cur.min ? (pts - cur.min) / (cur.max - cur.min) * 100 : 100);
  const nxt = lvls[lvls.indexOf(cur) + 1];
  return ce("div", { style: { background:"#161e2a", borderRadius:13, padding:"12px 13px",
                               border:"1px solid "+cur.c+"44", marginTop:10 } },
    ce("div", { style: { display:"flex", justifyContent:"space-between", marginBottom:5 } },
      ce("b", { style: { color:cur.c, fontSize:12 } }, "⭐ " + cur.n),
      ce("b", { style: { color:C.accent, fontSize:13 } }, pts + " pts")
    ),
    ce("div", { style: { background:C.border, borderRadius:20, height:7, overflow:"hidden" } },
      ce("div", { style: { width:pct+"%", height:"100%",
                            background:"linear-gradient(90deg,"+cur.c+","+C.accent+")", borderRadius:20 } })
    ),
    ce("div", { style: { display:"flex", justifyContent:"space-between", marginTop:3, fontSize:10, color:C.muted } },
      ce("span", null, cur.n),
      ce("span", null, nxt ? cur.max + " → " + nxt.n : "MAX")
    )
  );
}

// ─── TRIAL BANNER ────────────────────────────────────────────────
export function TrialBanner() {
  const [vis, setVis] = useState(true);
  if (!vis) return null;
  const today2    = new Date(); today2.setHours(0,0,0,0);
  const trialEnd  = window._companyTrialEnd   ? new Date(window._companyTrialEnd)   : null;
  const payDue    = window._companyPaymentDue ? new Date(window._companyPaymentDue) : null;
  const trialDays = trialEnd ? Math.ceil((trialEnd  - today2) / 864e5) : null;
  const payDays   = payDue   ? Math.ceil((payDue    - today2) / 864e5) : null;
  if (trialDays === null && payDays === null) return null;
  const isTrial      = trialDays !== null && trialDays >= 0;
  const isPayOverdue = payDays !== null && payDays < 0;
  const isPaySoon    = payDays !== null && payDays >= 0 && payDays <= 7;
  if (!isTrial && !isPayOverdue && !isPaySoon) return null;
  const bgCol = isPayOverdue ? C.err : isPaySoon ? C.warn : C.cyan;
  const msg   = isPayOverdue
    ? `⚠️ MORA: Tu pago venció hace ${Math.abs(payDays)} día(s). Contáctanos para no perder el servicio.`
    : isPaySoon
    ? `💳 Próximo pago en ${payDays} día(s) (${window._companyPaymentDue}). Asegura tu continuidad.`
    : `⏳ Prueba gratuita: ${trialDays > 0 ? "te quedan "+trialDays+" día(s)" : "vence hoy"}. ¡Activa tu plan para continuar!`;
  return ce("div", { style: { background:bgCol+"22", border:"1.5px solid "+bgCol+"66",
                               borderRadius:12, padding:"11px 14px", marginBottom:12,
                               display:"flex", alignItems:"center", gap:10 } },
    ce("div", { style: { flex:1, fontSize:12, color:bgCol, fontWeight:700 } }, msg),
    ce("button", { type:"button",
                   style: { background:"none", border:"none", color:bgCol, fontSize:18, cursor:"pointer", flexShrink:0 },
                   onClick: () => setVis(false) }, "×")
  );
}

// ─── NOTIF BANNER ────────────────────────────────────────────────
export function NotifBanner() {
  const [perm, setPerm] = useState(Notification?.permission || "default");
  const [vis,  setVis]  = useState(perm === "default");
  if (!vis || !window.Notification || perm === "granted" || perm === "denied") return null;
  async function request() {
    const r = await Notification.requestPermission();
    setPerm(r); setVis(false);
    if (r === "granted") new Notification("Taseca activado", { body:"Recibirás notificaciones de nuevas citas" });
  }
  return ce("div", { style: { background:"linear-gradient(135deg,#1a2230,#111820)",
                               border:"1px solid "+C.accent+"44", borderRadius:13,
                               padding:"13px 15px", marginBottom:11, display:"flex", alignItems:"center", gap:11 } },
    ce("div", { style: { fontSize:28, flexShrink:0 } }, "🔔"),
    ce("div", { style: { flex:1 } },
      ce("div", { style: { fontWeight:700, fontSize:13, marginBottom:2 } }, "Activar notificaciones"),
      ce("div", { style: { color:C.muted, fontSize:11 } }, "Recibe alertas cuando lleguen nuevas citas")
    ),
    ce("div", { style: { display:"flex", gap:7, flexShrink:0 } },
      ce("button", { type:"button", onClick:()=>setVis(false), style:{ ...S.btn("ghost"), padding:"5px 9px", fontSize:11 } }, "No"),
      ce("button", { type:"button", onClick:request,           style:{ ...S.btn("cyan"),  padding:"5px 9px", fontSize:11, color:"#000" } }, "Activar")
    )
  );
}
