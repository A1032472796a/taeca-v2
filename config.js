// ─── COLORES ────────────────────────────────────────────────────
export const C = {
  bg: "#080c10", card: "#111820", accent: "#c9a84c", cyan: "#4ecdc4",
  text: "#f0f0f0", muted: "#6a7a8a", border: "#1e2a35",
  ok: "#2ecc71", err: "#e74c3c", warn: "#f39c12"
};

// ─── ROLES ──────────────────────────────────────────────────────
export const ROLES = {
  admin: "Administrador", barbero: "Barbero",
  tatuador: "Tatuador/a", recepcionista: "Recepcionista", vendedor: "Vendedor"
};

export const RTABS = {
  admin:         ["agenda","clientes","fidelidad","catalogo","caja","reportes","config"],
  barbero:       ["agenda","clientes","fidelidad","catalogo","reportes"],
  tatuador:      ["agenda","clientes","fidelidad","catalogo","reportes"],
  recepcionista: ["agenda","clientes"],
  vendedor:      ["catalogo","caja"]
};

// ─── STATUS / CAT ────────────────────────────────────────────────
export const SC = {
  confirmado:"#4ecdc4", pendiente:"#f39c12", cancelado:"#e74c3c", walk_in:"#8e44ad"
};
export const SL = {
  confirmado:"Confirmado", pendiente:"Pendiente", cancelado:"Cancelado", walk_in:"Sin cita"
};
export const CAT = { barberia:"#3498db", tatuaje:"#8e44ad" };

// ─── FECHAS ──────────────────────────────────────────────────────
export const MO = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const MS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const DY = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];
// ─── SLOTS 15min 8am–9pm ────────────────────────────────────────
export const SLOTS = [];
for (let h = 8; h < 21; h++) {
  SLOTS.push((h < 10 ? "0" : "") + h + ":00");
  SLOTS.push((h < 10 ? "0" : "") + h + ":15");
  SLOTS.push((h < 10 ? "0" : "") + h + ":30");
  SLOTS.push((h < 10 ? "0" : "") + h + ":45");
}

// Helper: slots disponibles según duración del servicio
export function slotsForDuration(dur) {
  if (!dur || dur <= 15) return SLOTS;
  return SLOTS.filter(sl => {
    const [hh, mm] = sl.split(":").map(Number);
    const mins = hh * 60 + mm - 8 * 60;
    return mins % 15 === 0;
  });
}


// ─── STAFF COLORS ────────────────────────────────────────────────
export const STAFF_COLORS = [
  "#4ecdc4","#f39c12","#9b59b6","#e74c3c",
  "#2ecc71","#3498db","#e91e63","#ff5722"
];

// ─── DEFAULTS ────────────────────────────────────────────────────
export const DEF_CFG = {
  id: "cfg", stampsOn: true, businessName: "", businessSubtitle: "", businessLogo: null
};

export const DEF_USERS = [
  { id:"u1", name:"Juan Barbero",    role:"barbero",   pin:"1234", photo:null,
    workDays:[1,2,3,4,5], wStart:"09:00", wEnd:"19:00", blocks:{} },
  { id:"u2", name:"Maria Tatuadora", role:"tatuador",  pin:"5678", photo:null,
    workDays:[2,3,4,5,6], wStart:"10:00", wEnd:"18:00", blocks:{} },
  { id:"u3", name:"Admin",           role:"admin",     pin:"0000", photo:null,
    workDays:[1,2,3,4,5,6], wStart:"08:00", wEnd:"21:00", blocks:{} }
];

export const DEF_SVC = [
  { id:"s1", name:"Corte clasico",    cat:"barberia", price:15,  dur:30  },
  { id:"s2", name:"Barba y perfilado",cat:"barberia", price:12,  dur:25  },
  { id:"s3", name:"Tatuaje pequeno",  cat:"tatuaje",  price:80,  dur:60  },
  { id:"s4", name:"Tatuaje mediano",  cat:"tatuaje",  price:150, dur:120 }
];

// ─── BASE STYLES (inline JS styles) ────────────────────────────
export const S = {
  app: { background:"linear-gradient(160deg,#080c10,#0d1520)", minHeight:"100vh", color:C.text, width:"100%" },
  card: { background:C.card, borderRadius:14, padding:"13px 15px", marginBottom:10, border:"1px solid "+C.border },
  inp: { width:"100%", background:"#1a2230", border:"1px solid "+C.border, borderRadius:10,
         padding:"10px 12px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none" },
  lbl: { fontSize:12, color:C.muted, marginBottom:4, display:"block" },
  row: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  badge: col => ({ background:col+"22", color:col, fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:600 }),
  btn: v => {
    v = v || "gold";
    return {
      background: v==="gold"?C.accent : v==="cyan"?C.cyan : v==="err"?C.err : v==="ghost"?"transparent" : C.border,
      color: v==="ghost"?C.muted : "#000",
      border: v==="ghost"?"1px solid "+C.border : "none",
      borderRadius:10, padding:"9px 15px", cursor:"pointer", fontWeight:700, fontSize:13
    };
  },
  ov: { position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:300,
        display:"flex", alignItems:"flex-end", justifyContent:"center" },
  mb: { background:C.card, borderRadius:"20px 20px 0 0", padding:"20px 16px 34px",
        width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }
};

// ─── SUPER ADMIN hash ────────────────────────────────────────────
export const SA_PWD_HASH = "7564cd9fa08551e5ba2e9080fa9a402104501bc1fbeb71763d8ce43bfd6a93bc";
