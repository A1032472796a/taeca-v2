// ─── SUPABASE ────────────────────────────────────────────────────
const SB = {
  h() {
    return {
      "Content-Type": "application/json",
      "apikey": window.SB_KEY,
      "Authorization": "Bearer " + window.SB_KEY,
      "Prefer": "return=representation"
    };
  },
  co(c) {
    return ["users","services","products","clients","appointments",
            "sales","config","product_sales","notifs"].indexOf(c) >= 0;
  }
};

// ─── FIELD MAPPERS ───────────────────────────────────────────────
export function toDb(c, o) {
  const d = { ...o };
  if (c === "users") {
    if (d.workDays !== undefined) { d.work_days = Array.isArray(d.workDays) ? d.workDays.map(Number) : []; delete d.workDays; }
    if (d.wStart   !== undefined) { d.w_start = d.wStart; delete d.wStart; }
    if (d.wEnd     !== undefined) { d.w_end   = d.wEnd;   delete d.wEnd;   }
    d.blocks = { ...(typeof d.blocks === "string" ? JSON.parse(d.blocks) : d.blocks || {}) };
    if (d.lunchStart !== undefined) { d.blocks._lunchStart = d.lunchStart || null; delete d.lunchStart; }
    if (d.lunchEnd   !== undefined) { d.blocks._lunchEnd   = d.lunchEnd   || null; delete d.lunchEnd;   }
    if (d.svcsConfig !== undefined) { d.blocks._svcsConfig = { ...d.svcsConfig }; delete d.svcsConfig; }
  }
  if (c === "config") {
    if (d.stampsOn        !== undefined) { d.stamps_on        = d.stampsOn;        delete d.stampsOn;        }
    if (d.businessName    !== undefined) { d.business_name    = d.businessName;    delete d.businessName;    }
    if (d.businessSubtitle!== undefined) { d.business_subtitle= d.businessSubtitle;delete d.businessSubtitle;}
    if (d.businessLogo    !== undefined) { d.business_logo    = d.businessLogo;    delete d.businessLogo;    }
  }
  if (c === "appointments") {
    if (d.stId !== undefined) { d.st_id = d.stId; delete d.stId; }
    // Eliminar campos que no existen como columnas en Supabase
    delete d.svcId; delete d.isBlock; delete d.endTime; delete d.note;
    delete d.email; delete d.svcPrice; delete d.clientFound;
  }
  if (c === "sales" || c === "product_sales") {
    if (d.dueDate  !== undefined) { d.due_date  = d.dueDate;  delete d.dueDate;  }
    if (d.paidDate !== undefined) { d.paid_date = d.paidDate; delete d.paidDate; }
    if (d.abonos   !== undefined) d.abonos = Array.isArray(d.abonos) ? d.abonos : [];
    if (d.pendiente !== undefined && d.pendiente !== null) d.pendiente = Number(d.pendiente);
  }
  return d;
}

export function fromDb(c, o) {
  const d = { ...o };
  if (c === "users") {
    d.workDays = Array.isArray(d.work_days) ? d.work_days.map(Number) : (d.workDays || []);
    d.wStart   = d.w_start || d.wStart || "09:00";
    d.wEnd     = d.w_end   || d.wEnd   || "19:00";
    delete d.work_days; delete d.w_start; delete d.w_end;
    try { d.blocks = typeof d.blocks === "string" ? JSON.parse(d.blocks) : d.blocks || {}; } catch { d.blocks = {}; }
    d.lunchStart = d.blocks._lunchStart || "";
    d.lunchEnd   = d.blocks._lunchEnd   || "";
    d.svcsConfig = d.blocks._svcsConfig || {};
  }
  if (c === "config") {
    if (d.stamps_on         !== undefined) { d.stampsOn         = !!d.stamps_on;         delete d.stamps_on;         }
    if (d.business_name     !== undefined) { d.businessName     = d.business_name;       delete d.business_name;     }
    if (d.business_subtitle !== undefined) { d.businessSubtitle = d.business_subtitle;   delete d.business_subtitle; }
    if (d.business_logo     !== undefined) { d.businessLogo     = d.business_logo;       delete d.business_logo;     }
  }
  if (c === "appointments" && d.st_id !== undefined) { d.stId = d.st_id; delete d.st_id; }
  if (c === "sales" || c === "product_sales") {
    if (d.due_date  !== undefined) { d.dueDate  = d.due_date;  delete d.due_date;  }
    if (d.paid_date !== undefined) { d.paidDate = d.paid_date; delete d.paid_date; }
    if (d.abonos === undefined) d.abonos = [];
    const totalAb = (Array.isArray(d.abonos) ? d.abonos : []).reduce((a,x)=>a+(Number(x.monto)||0),0);
    d.pendiente = (d.pendiente === undefined || d.pendiente === null)
      ? Math.max(0, (Number(d.total)||0) - totalAb)
      : Number(d.pendiente);
    if (d.method !== "debe") d.pendiente = 0;
    try { if (typeof d.items === "string") d.items = JSON.parse(d.items); } catch { d.items = []; }
  }
  return d;
}

// ─── CACHE (localStorage + memory, TTL 5min) ─────────────────────
const CACHE_TTL = 5 * 60 * 1000;
const _mem = {};
window._memCache = _mem; // expuesto para limpiar cache externamente

function cacheGet(key) {
  if (_mem[key] && (Date.now() - _mem[key].t) < CACHE_TTL) return _mem[key].v;
  try {
    const raw = localStorage.getItem("taseca_cache_" + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.t > CACHE_TTL) { localStorage.removeItem("taseca_cache_" + key); return null; }
    _mem[key] = obj;
    return obj.v;
  } catch { return null; }
}
function cacheSet(key, val) {
  const obj = { t: Date.now(), v: val };
  _mem[key] = obj;
  try { localStorage.setItem("taseca_cache_" + key, JSON.stringify(obj)); } catch {}
}
function cacheClear(key) {
  delete _mem[key];
  try { localStorage.removeItem("taseca_cache_" + key); } catch {}
}

// ─── DB API ──────────────────────────────────────────────────────
export const DB = {
  async all(c) {
    const ck = c + "_" + (window._companyId || "root");
    if (["services","products","config"].includes(c)) {
      const cv = cacheGet(ck);
      if (cv) return cv;
    }
    const noOrder = ["config","company","push_subscriptions","product_sales","notifs"];
    let url = window.SB_URL + "/rest/v1/" + c + "?select=*" + (!noOrder.includes(c) ? "&order=created_at.asc" : "");
    if (SB.co(c) && window._companyId) url += "&company_id=eq." + window._companyId;
    const r = await fetch(url, { headers: SB.h() });
    if (!r.ok) throw new Error("DB.all " + c + ": " + r.status + " " + await r.text());
    const res = (await r.json()).map(o => fromDb(c, o));
    if (["services","products","config"].includes(c)) cacheSet(ck, res);
    return res;
  },

  async save(c, id, data) {
    const p = toDb(c, data);
    p.id = id;
    cacheClear(c + "_" + (window._companyId || "root"));
    if (SB.co(c) && window._companyId) p.company_id = window._companyId;
    Object.keys(p).forEach(k => { if (p[k] === undefined) delete p[k]; });
    if (c === "appointments") console.log("[DB.save appointments] payload:", JSON.stringify(p));
    const r = await fetch(window.SB_URL + "/rest/v1/" + c, {
      method: "POST",
      headers: { ...SB.h(), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(p)
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error("[DB.save "+c+" ERROR]", r.status, errText);
      throw new Error("DB.save " + c + ": " + r.status + " " + errText);
    }
    return r.json();
  },

  async del(c, id) {
    const r = await fetch(
      window.SB_URL + "/rest/v1/" + c + "?id=eq." + encodeURIComponent(String(id)),
      { method: "DELETE", headers: SB.h() }
    );
    if (!r.ok) throw new Error("DB.del " + c + ": " + r.status + " " + await r.text());
  },

  async getCompany(slug) {
    const r = await fetch(
      window.SB_URL + "/rest/v1/company?company_id=eq." + encodeURIComponent(slug) + "&select=*",
      { headers: SB.h() }
    );
    if (!r.ok) throw new Error("DB.getCompany: " + r.status);
    const a = await r.json();
    return a.length > 0 ? a[0] : null;
  }
};
