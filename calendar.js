import { C, S, ROLES, SC, SL, SLOTS, STAFF_COLORS, DY, MO, slotsForDuration } from "./config.js";
import { pt, ts, today, calDays, weekOf } from "./helpers.js";
import { DB } from "./db.js";

const { createElement: ce, useState } = React;

// Altura de cada slot de 15min en píxeles
const ROW_H = 26;
const MINS_PER_ROW = 15;

// ─── WEEK CALENDAR ───────────────────────────────────────────────
export function WeekCal({ appts, users, stId, onSlot, onAppt, onReschedule }) {
  const [view, setView] = useState("day");
  const [cur,  setCur]  = useState(new Date());
  const [fSt,  setFSt]  = useState("all");
  const [dragging, setDragging] = useState(null); // {appt, startY, origTime}
  const [dragOver, setDragOver] = useState(null); // slot string being hovered

  const hrs = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

  const staffList = users.filter(u => u.role === "barbero" || u.role === "tatuador");
  let cols = stId ? [users.find(u => u.id === stId) || null] : staffList;
  if (cols.length === 0) cols = users.slice(0, 3);

  const wk    = view === "week" ? weekOf(cur) : [cur];
  const wStrs = wk.map(d => ts(d));
  const waAll = appts.filter(a => wStrs.includes(a.date));
  const wa    = fSt === "all" ? waAll : waAll.filter(a => a.status === fSt);

  function getStaffAppts(uid, ds, hr, mn) {
    const slot = (hr < 10 ? "0" : "") + hr + ":" + String(mn).padStart(2, "0");
    return wa.filter(a => (a.stId || a.st_id) === uid && a.date === ds && a.time === slot);
  }
  function isWork(staffUser, date, hr, mn) {
    if (!staffUser) return true;
    if (!staffUser.workDays?.includes(date.getDay())) return false;
    const t = hr * 60 + mn;
    return t >= pt(staffUser.wStart || "09:00") && t < pt(staffUser.wEnd || "19:00");
  }
  // ─── DRAG HELPERS ───
  function slotFromMins(totalMins) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h < 8 || h >= 21) return null;
    const snap = Math.round(m / 15) * 15;
    const hFinal = snap === 60 ? h + 1 : h;
    const mFinal = snap === 60 ? 0 : snap;
    if (hFinal >= 21) return null;
    return (hFinal < 10 ? "0" : "") + hFinal + ":" + String(mFinal).padStart(2, "0");
  }

  function handleDragStart(e, a) {
    e.stopPropagation();
    setDragging({ appt: a, origTime: a.time });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("apptId", a.id);
  }

  function handleDragOver(e, slot) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(slot);
  }

  function handleDrop(e, hr, mn, su) {
    e.preventDefault();
    if (!dragging || !su) return;
    const newSlot = (hr < 10 ? "0" : "") + hr + ":" + String(mn).padStart(2, "0");
    if (newSlot !== dragging.origTime) {
      onReschedule && onReschedule(dragging.appt, ts(cur), newSlot);
    }
    setDragging(null);
    setDragOver(null);
  }

  function prev() { const d = new Date(cur); d.setDate(d.getDate() - (view==="week"?7:1)); setCur(d); }
  function next() { const d = new Date(cur); d.setDate(d.getDate() + (view==="week"?7:1)); setCur(d); }

  const dayAppts  = view === "day" ? wa : [];
  const pendCount = dayAppts.filter(a => a.status === "pendiente").length;
  const confCount = dayAppts.filter(a => a.status === "confirmado").length;
  const walkCount = dayAppts.filter(a => a.status === "walk_in").length;
  const gridMinW  = view === "day" ? 36 + cols.length * 120 + "px" : "340px";

  function dayLabel() {
    if (view === "day") {
      const isT = ts(cur) === today();
      return ce("span", { style: { fontSize:13, fontWeight:700, color: isT ? C.accent : C.text } },
        DY[cur.getDay()], " ", cur.getDate(), " de ", MO[cur.getMonth()], " ", cur.getFullYear(),
        isT && ce("span", { style:{ background:C.accent, color:"#000", fontSize:9, fontWeight:900,
                                     padding:"1px 6px", borderRadius:10, marginLeft:6 } }, "HOY")
      );
    }
    const wkd = weekOf(cur);
    return ce("span", { style:{fontSize:12,fontWeight:700} },
      `${MO[wkd[0].getMonth()].slice(0,3)} ${wkd[0].getDate()} – ${wkd[6].getDate()}, ${wkd[0].getFullYear()}`
    );
  }

  // Filter bar
  const filterBar = ce("div", { style:{ display:"flex", gap:4, padding:"0 10px 8px", overflowX:"auto" } },
    [["all","Todos","#6a7a8a"],["confirmado","Confirmado",C.cyan],["pendiente","Pendiente",C.warn],
     ["cancelado","Cancelado",C.err],["walk_in","Walk-in","#8e44ad"],["bloqueado","Bloqueado","#c0392b"]]
    .map(([id, label, color]) => {
      const active = fSt === id;
      const cnt    = id === "all" ? waAll.length : waAll.filter(a => a.status === id).length;
      return ce("button", { type:"button", key:id, onClick:()=>setFSt(id),
        style:{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight: active?700:400,
                border:"1.5px solid "+(active?color:color+"44"), background: active?color+"22":"transparent",
                color: active?color:C.muted, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 } },
        label, cnt > 0 && ce("span", { style:{ marginLeft:4, background: active?color:color+"44",
                                                color: active?"#000":color, borderRadius:10,
                                                padding:"0 5px", fontSize:9, fontWeight:700 } }, cnt)
      );
    })
  );

  // Day slot row
  function renderDaySlot(hr, mn) {
    const slotKey = hr + "-" + mn;
    const isHour  = mn === 0;
    return ce("div", { key:slotKey, style:{ display:"flex", borderBottom:"1px solid "+(isHour?C.border+"bb":C.border+"33"),
                                             minHeight:26, background: isHour?"transparent":"#ffffff04", position:"relative" } },
      ce("div", { style:{ width:36, flexShrink:0, display:"flex", alignItems:"flex-start",
                           justifyContent:"flex-end", paddingRight:4, paddingTop:2,
                           borderRight:"2px solid "+C.border+"66" } },
        isHour
          ? ce("span", { style:{ fontSize:8, color:C.muted, fontWeight:700 } }, hr+":00")
          : ce("span", { style:{ fontSize:7, color:C.border+"88" } }, ":30")
      ),
      cols.map((su, si) => {
        if (!su) return ce("div", { key:si, style:{ flex:1, minWidth:120, borderLeft:"2px solid "+C.border+"88" } });
        const sc      = STAFF_COLORS[si % STAFF_COLORS.length];
        const iw      = isWork(su, cur, hr, mn);
        const ib      = su.blocks?.[ts(cur)] === true;
        const slotMins = hr*60+mn;
        const isLunch = !!(su.lunchStart && su.lunchEnd &&
                           slotMins >= pt(su.lunchStart) && slotMins < pt(su.lunchEnd));
        // Also block if a service starting here would invade lunch
        // We check with a default of 30min since we don't know the service duration here
        // The real check happens in slotOk/public.js — here we just show the visual block
        const wouldInvadeLunch = !isLunch && su.lunchStart && su.lunchEnd &&
          slotMins < pt(su.lunchStart) &&
          slotMins + 15 > pt(su.lunchStart); // slot de 15min que toca el almuerzo
        const isToday = ts(cur) === today();
        const slotAppts = getStaffAppts(su.id, ts(cur), hr, mn);
        const slotStr = (hr<10?"0":"")+hr+":"+String(mn).padStart(2,"0");
        const isDragTarget   = dragging && dragOver === su.id+"_"+slotStr && iw && !ib;
        const isConflict     = dragging && dragOver === "conflict_"+slotStr;
        return ce("div", { key:su.id,
          onClick: () => { if (!dragging && slotAppts.length > 0) onAppt(slotAppts[0]); else if (!dragging && iw && !ib && !isLunch && !wouldInvadeLunch) onSlot(cur, hr, mn, su.id); },
          onDragOver: e => iw && !ib ? handleDragOver(e, su.id+"_"+slotStr) : null,
          onDragLeave: () => setDragOver(null),
          onDrop: e => handleDrop(e, hr, mn, su),
          style:{ flex:1, minWidth:120, borderLeft:"2px solid "+sc+"66", position:"relative",
                  background: isConflict?C.err+"22":isDragTarget?sc+"22":!iw?"#0a0c10":ib?"#1a0808":isToday?"#0e1520":"transparent",
                  cursor: dragging?(isDragTarget?"copy":"no-drop"):iw&&!ib?"pointer":"default",
                  overflow:"visible",
                  outline: isConflict?"2px dashed "+C.err:isDragTarget?"2px dashed "+sc:"none" } },
          ce("div", { style:{ position:"absolute", left:0, top:0, bottom:0, width:2, background:sc+"44" } }),
          slotAppts.map((a, ai) => {
            const aCol = SC[a.status] || sc;
            const aDur = a.dur || 30;
            const aHeight = Math.max(ROW_H - 4, Math.round((aDur / MINS_PER_ROW) * ROW_H) - 4);
            return ce("div", { key:a.id,
              draggable: true,
              onDragStart: e => handleDragStart(e, a),
              onDragEnd: () => { setDragging(null); setDragOver(null); },
              onClick: e => { e.stopPropagation(); onAppt(a); },
              style:{
                position:"absolute",
                top: 2, left: ai===0?5:(5+ai*4), right:2,
                height: aHeight + "px",
                background: dragging?.appt?.id===a.id ? aCol+"44" : aCol+"22",
                border:"1.5px solid "+aCol, borderRadius:5,
                padding:"3px 6px", overflow:"hidden", zIndex:10+ai,
                boxShadow:"0 2px 8px "+aCol+"44",
                cursor:"grab", pointerEvents:"auto",
                opacity: dragging?.appt?.id===a.id ? 0.6 : 1,
                transition:"opacity .15s"
              }},
              ce("div", { style:{ fontSize:11, fontWeight:700, color:aCol, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } }, a.client),
              ce("div", { style:{ fontSize:10, color:C.muted, marginTop:1, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } }, a.svc),
              ce("div", { style:{ display:"flex", gap:4, marginTop:2, flexWrap:"wrap" } },
                ce("span", { style: S.badge(aCol) }, SL[a.status] || a.status),
                !stId && ce("span", { style:{ ...S.badge(sc), fontSize:8 } }, su.name.split(" ")[0])
              )
            );
          }),
          ib && ce("div", { style:{ position:"absolute", inset:0,
            background: isLunch
              ? "repeating-linear-gradient(45deg,#f39c1233,#f39c1233 3px,transparent 3px,transparent 7px)"
              : wouldInvadeLunch
              ? "repeating-linear-gradient(45deg,#f39c1222,#f39c1222 2px,transparent 2px,transparent 6px)"
              : "repeating-linear-gradient(45deg,"+C.err+"11,"+C.err+"11 3px,transparent 3px,transparent 7px)" } }),
          iw && !ib && slotAppts.length === 0 && ce("div", {
            style:{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:8, opacity:0 },
            onMouseEnter: e => e.currentTarget.style.opacity = 1,
            onMouseLeave: e => e.currentTarget.style.opacity = 0
          }, ce("span", { style:{ fontSize:9, color:sc+"88" } }, "+ ", su.name.split(" ")[0]))
        );
      })
    );
  }

  // Week slot row
  function renderWeekSlot(hr, mn) {
    const slotKey = hr + "-" + mn;
    const isHour  = mn === 0;
    const slot    = (hr<10?"0":"")+hr+":"+String(mn).padStart(2,"0");
    return ce("div", { key:slotKey, style:{ display:"flex", borderBottom:"1px solid "+(isHour?C.border+"bb":C.border+"33"),
                                             minHeight:26, background: isHour?"transparent":"#ffffff04", position:"relative" } },
      ce("div", { style:{ width:36, flexShrink:0, display:"flex", alignItems:"flex-start",
                           justifyContent:"flex-end", paddingRight:4, paddingTop:2,
                           borderRight:"2px solid "+C.border+"66" } },
        (mn===0)?ce("span",{style:{fontSize:8,color:C.muted,fontWeight:700}},hr+":00"):(mn===30)?ce("span",{style:{fontSize:7,color:C.border}},":30"):ce("span",{style:{fontSize:6,color:C.border+"44"}},":"+String(mn).padStart(2,"0"))
      ),
      wk.map((d, di) => {
        const ds          = ts(d);
        const daySlotAppts = wa.filter(a => a.date===ds && a.time===slot);
        const isToday2    = ds === today();
        return ce("div", { key:di,
          style:{ flex:1, borderLeft:"1px solid "+C.border+"55", position:"relative",
                  background: isToday2?"#0e1520":"transparent", minWidth:44, cursor:"pointer" },
          onClick: () => { setCur(d); setView("day"); }
        },
          daySlotAppts.length > 0 && ce("div", { style:{ position:"absolute", inset:"1px", display:"flex", gap:1 } },
            daySlotAppts.slice(0,3).map(a => {
              const su2  = users.find(u => u.id === (a.stId||a.st_id));
              const si2  = su2 ? users.indexOf(su2) : 0;
              const sc2  = STAFF_COLORS[si2 % STAFF_COLORS.length];
              const aCol = SC[a.status] || sc2;
              return ce("div", { key:a.id, style:{ flex:1, background:aCol+"33", border:"1px solid "+aCol, borderRadius:3, overflow:"hidden", minWidth:0 } },
                ce("div", { style:{ fontSize:6, fontWeight:700, color:aCol, padding:"1px 2px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } }, a.client),
                ce("div", { style:{ height:3, background:sc2, opacity:0.7 } })
              );
            }),
            daySlotAppts.length > 3 && ce("div", { style:{ fontSize:7, color:C.muted, padding:"1px 2px", flexShrink:0 } }, "+", daySlotAppts.length-3)
          )
        );
      })
    );
  }

  return ce("div", { style:{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, overflow:"hidden" } },
    // ── Header ──
    ce("div", { style:{ borderBottom:"1px solid "+C.border } },
      ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px" } },
        ce("div", { style:{ display:"flex", gap:4 } },
          ce("button", { type:"button", onClick:()=>setView("day"),
            style:{ padding:"4px 10px", borderRadius:8, border:"none", fontSize:11, fontWeight:700, cursor:"pointer",
                    background: view==="day"?C.accent:"#1a2230", color: view==="day"?"#000":C.muted } }, "Dia"),
          ce("button", { type:"button", onClick:()=>setView("week"),
            style:{ padding:"4px 10px", borderRadius:8, border:"none", fontSize:11, fontWeight:700, cursor:"pointer",
                    background: view==="week"?C.cyan:"#1a2230", color: view==="week"?"#000":C.muted } }, "Semana")
        ),
        ce("div", { style:{ display:"flex", alignItems:"center", gap:6 } },
          ce("button", { type:"button", onClick:prev, style:{ background:"none", border:"none", color:C.accent, fontSize:18, cursor:"pointer", padding:"2px 5px" } }, "‹"),
          dayLabel(),
          ce("button", { type:"button", onClick:next, style:{ background:"none", border:"none", color:C.accent, fontSize:18, cursor:"pointer", padding:"2px 5px" } }, "›")
        ),
        ce("button", { type:"button", onClick:()=>setCur(new Date()),
          style:{ padding:"4px 9px", borderRadius:8, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:10, cursor:"pointer" } }, "Hoy")
      ),
      filterBar,
      view === "day" && (pendCount+confCount+walkCount > 0
        ? ce("div", { style:{ display:"flex", gap:10, padding:"0 12px 8px", fontSize:11 } },
            confCount > 0 && ce("span", { style:{ color:C.cyan,  fontWeight:700 } }, "✓ ", confCount, " confirmadas"),
            pendCount > 0 && ce("span", { style:{ color:C.warn,  fontWeight:700 } }, "⏳ ", pendCount, " pendientes"),
            walkCount > 0 && ce("span", { style:{ color:"#8e44ad", fontWeight:700 } }, "⚡ ", walkCount, " walk-in")
          )
        : ce("div", { style:{ padding:"0 12px 8px", fontSize:11, color:C.muted } },
            fSt === "all" ? "Sin citas para este dia" : "Sin citas: " + (SL[fSt] || fSt)
          )
      )
    ),
    // ── Grid ──
    ce("div", { style:{ overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 330px)", position:"relative" } },
      ce("div", { style:{ minWidth:gridMinW, position:"relative" } },
        // Column headers
        view === "day" && cols.length > 0 && ce("div", { style:{ display:"flex", borderBottom:"1px solid "+C.border, position:"sticky", top:0, background:C.bg, zIndex:5 } },
          ce("div", { style:{ width:36, flexShrink:0 } }),
          cols.map((su, si) => {
            if (!su) return null;
            const sc  = STAFF_COLORS[si % STAFF_COLORS.length];
            const cnt = wa.filter(a => (a.stId||a.st_id)===su.id).length;
            return ce("div", { key:su.id, style:{ flex:1, minWidth:120, borderLeft:"2px solid "+C.border+"88", padding:"7px 8px", background:sc+"0d" } },
              ce("div", { style:{ display:"flex", alignItems:"center", gap:6 } },
                ce("div", { style:{ width:8, height:8, borderRadius:"50%", background:sc, flexShrink:0 } }),
                ce("div", { style:{ fontSize:11, fontWeight:700, color:sc, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } }, su.name.split(" ")[0]),
                cnt > 0 && ce("span", { style:{ background:sc+"33", color:sc, fontSize:9, fontWeight:900, borderRadius:10, padding:"1px 5px", marginLeft:"auto", flexShrink:0 } }, cnt)
              ),
              ce("div", { style:{ fontSize:9, color:C.muted, marginTop:1 } }, ROLES[su.role])
            );
          })
        ),
        view === "week" && ce("div", { style:{ display:"flex", borderBottom:"1px solid "+C.border, position:"sticky", top:0, background:C.bg, zIndex:5 } },
          ce("div", { style:{ width:36, flexShrink:0 } }),
          wk.map((d, i) => {
            const isT = ts(d) === today();
            const dCnt = appts.filter(a => a.date===ts(d)).length;
            return ce("div", { key:i, style:{ flex:1, textAlign:"center", padding:"5px 1px", minWidth:44, cursor:"pointer" },
              onClick: () => { setCur(d); setView("day"); } },
              ce("div", { style:{ fontSize:9, color: isT?C.accent:C.muted } }, DY[d.getDay()]),
              ce("div", { style:{ width:22, height:22, borderRadius:"50%", background: isT?C.accent:"transparent",
                                   color: isT?"#000":C.text, fontSize:11, display:"flex", alignItems:"center",
                                   justifyContent:"center", margin:"1px auto 0", fontWeight: isT?900:400 } }, d.getDate()),
              dCnt > 0 && ce("div", { style:{ fontSize:8, color: isT?C.accent:C.muted, marginTop:1 } }, dCnt, "c")
            );
          })
        ),
        // Slot rows
        hrs.flatMap(hr => [0,15,30,45].map(mn =>
          view === "day" ? renderDaySlot(hr, mn) : renderWeekSlot(hr, mn)
        ))
      )
    ),
    // ── Legend ──
    ce("div", { style:{ borderTop:"1px solid "+C.border, padding:"7px 10px" } },
      !stId && cols.length > 1 && ce("div", { style:{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:5 } },
        cols.map((su, si) => su && ce("div", { key:su.id, style:{ display:"flex", alignItems:"center", gap:4 } },
          ce("div", { style:{ width:9, height:9, borderRadius:2, background:STAFF_COLORS[si%STAFF_COLORS.length] } }),
          ce("span", { style:{ fontSize:9, color:STAFF_COLORS[si%STAFF_COLORS.length], fontWeight:700 } }, su.name.split(" ")[0])
        ))
      ),
      ce("div", { style:{ display:"flex", gap:8, flexWrap:"wrap" } },
        [[C.cyan,"Confirm."],[C.warn,"Pendiente"],["#8e44ad","Walk-in"],[C.err,"Bloqueado"]].map(([col,lbl]) =>
          ce("div", { key:lbl, style:{ display:"flex", alignItems:"center", gap:3 } },
            ce("div", { style:{ width:7, height:7, borderRadius:2, background:col } }),
            ce("span", { style:{ fontSize:9, color:C.muted } }, lbl)
          )
        )
      )
    )
  );
}

// ─── SCHEDULE MODAL ──────────────────────────────────────────────
export function SchedMdl({ user: u, close, onSave }) {
  const [wd,         setWd]         = useState(u.workDays || [1,2,3,4,5]);
  const [ws,         setWs]         = useState(u.wStart || "09:00");
  const [we,         setWe]         = useState(u.wEnd   || "19:00");
  const [lunchStart, setLunchStart] = useState(u.lunchStart || "");
  const [lunchEnd,   setLunchEnd]   = useState(u.lunchEnd   || "");
  const [yr,         setYr]         = useState(new Date().getFullYear());
  const [mo,         setMo]         = useState(new Date().getMonth());
  const [bl,         setBl]         = useState(u.blocks || {});
  const [saving,     setSaving]     = useState("idle"); // idle | saving | ok | error

  const days = calDays(yr, mo);

  function togDay(d) { setWd(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d].sort()); }
  function togBlock(ds) { setBl(p => { const n={...p}; if(n[ds]) delete n[ds]; else n[ds]=true; return n; }); }
  function applyPat() {
    const nb = {...bl};
    days.forEach(d => { if(d && !wd.includes(d.getDay())) nb[ts(d)] = true; });
    setBl(nb);
  }
  const avDays = days.filter(d => d && wd.includes(d.getDay()) && !bl[ts(d)]).length;
  const slots  = Math.floor((pt(we) - pt(ws)) / 30);

  async function save() {
    setSaving("saving");
    const upd = { ...u, workDays:wd, wStart:ws, wEnd:we, lunchStart:lunchStart||null, lunchEnd:lunchEnd||null, blocks:bl };
    try {
      const res = onSave(upd);
      if (res && typeof res.then === "function") {
        await res;
        setSaving("ok");
        setTimeout(() => { setSaving("idle"); close?.(); }, 1200);
      } else { setSaving("ok"); setTimeout(() => setSaving("idle"), 1200); }
    } catch { setSaving("error"); }
  }

  return ce("div", { style:S.ov, onClick:close },
    ce("div", { style:{ ...S.mb, maxHeight:"92vh" }, onClick:e=>e.stopPropagation() },
      ce("div", { style:{ ...S.row, marginBottom:14 } },
        ce("b", { style:{ fontSize:14, color:C.accent } }, "Patrón de Horario — ", u.name),
        ce("button", { type:"button", onClick:close, style:{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" } }, "✕")
      ),
      // Work days
      ce("label", { style:{ ...S.lbl, fontWeight:700 } }, "DÍAS LABORALES"),
      ce("div", { style:{ display:"flex", gap:5, marginBottom:13, flexWrap:"wrap" } },
        [["Do",0],["Lu",1],["Ma",2],["Mi",3],["Ju",4],["Vi",5],["Sa",6]].map(([lbl,d]) =>
          ce("button", { type:"button", key:d, onClick:()=>togDay(d),
            style:{ padding:"6px 10px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                    background: wd.includes(d)?C.cyan:"#1a2230", color: wd.includes(d)?"#000":C.muted } }, lbl)
        )
      ),
      // Work hours
      ce("label", { style:{ ...S.lbl, fontWeight:700 } }, "HORARIO"),
      ce("div", { style:{ display:"flex", gap:10, marginBottom:13 } },
        ["Entrada","Salida"].map((lbl,i) => {
          const [val, set] = i===0 ? [ws,setWs] : [we,setWe];
          return ce("div", { key:lbl, style:{ flex:1 } },
            ce("label", { style:S.lbl }, lbl),
            ce("select", { style:S.inp, value:val, onChange:e=>set(e.target.value) },
              SLOTS.map(s => ce("option", { key:s, value:s }, s))
            )
          );
        })
      ),
      ce("button", { type:"button", onClick:applyPat, style:{ ...S.btn("cyan"), width:"100%", marginBottom:13, padding:"9px" } },
        "Aplicar patrón a todo ", MO[mo]
      ),
      // Lunch
      ce("div", { style:{ background:"#1a2230", borderRadius:11, padding:"11px 13px", marginBottom:13, border:"1px solid "+C.border } },
        ce("label", { style:{ ...S.lbl, fontWeight:700, marginBottom:8, display:"block" } }, "🍽 HORA DE ALMUERZO (opcional)"),
        ce("div", { style:{ display:"flex", gap:10, marginBottom:8 } },
          [["Inicio",lunchStart,setLunchStart],["Fin",lunchEnd,setLunchEnd]].map(([lbl,val,set]) =>
            ce("div", { key:lbl, style:{ flex:1 } },
              ce("label", { style:S.lbl }, lbl),
              ce("select", { style:S.inp, value:val||"", onChange:e=>set(e.target.value) },
                ce("option", { value:"" }, lbl==="Inicio"?"Sin almuerzo":"--"),
                SLOTS.map(s => ce("option", { key:s, value:s }, s))
              )
            )
          )
        ),
        lunchStart && lunchEnd && ce("div", { style:{ fontSize:11, color:C.warn, textAlign:"center" } },
          "⏸️ Bloqueado de ", lunchStart, " a ", lunchEnd
        )
      ),
      // Month block calendar
      ce("label", { style:{ ...S.lbl, fontWeight:700 } }, "BLOQUEAR DÍAS ESPECÍFICOS"),
      ce("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 } },
        ce("button", { type:"button", onClick:()=>mo===0?(setMo(11),setYr(y=>y-1)):setMo(m=>m-1),
          style:{ background:"none", border:"none", color:C.accent, fontSize:20, cursor:"pointer" } }, "‹"),
        ce("b", { style:{ fontSize:13 } }, MO[mo], " ", yr),
        ce("button", { type:"button", onClick:()=>mo===11?(setMo(0),setYr(y=>y+1)):setMo(m=>m+1),
          style:{ background:"none", border:"none", color:C.accent, fontSize:20, cursor:"pointer" } }, "›")
      ),
      ce("div", { style:{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 } },
        DY.map(d => ce("div", { key:d, style:{ textAlign:"center", fontSize:9, color:C.muted, paddingBottom:3 } }, d))
      ),
      ce("div", { style:{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:12 } },
        days.map((d, i) => {
          if (!d) return ce("div", { key:i });
          const ds = ts(d), iw = wd.includes(d.getDay()), ib = bl[ds], ip = ds < today();
          return ce("div", { key:i, onClick:()=>{ if(!ip) togBlock(ds); },
            style:{ background: !iw||ib?"#1a0808":C.card, border:"1px solid "+(!iw||ib?C.err+"55":C.border),
                    borderRadius:7, padding:"6px 0", textAlign:"center", fontSize:11,
                    color: !iw||ib?C.err:ip?C.muted:C.text, cursor: ip?"default":"pointer", opacity: ip?0.4:1 } },
            d.getDate(), (!iw||ib) && ce("div", { style:{ fontSize:7 } }, "🔒")
          );
        })
      ),
      // Summary
      ce("div", { style:{ background:"#161e2a", borderRadius:11, padding:"10px 13px", marginBottom:13 } },
        ce("b", { style:{ fontSize:12, color:C.accent } }, "Resumen del mes"),
        ce("div", { style:{ display:"flex", gap:16, marginTop:8 } },
          [[avDays,"Días disponibles",C.ok],[days.filter(d=>d).length-avDays,"Bloqueados",C.err],[avDays*slots,"Slots totales",C.accent]]
          .map(([val,lbl,col]) =>
            ce("div", { key:lbl, style:{ textAlign:"center" } },
              ce("div", { style:{ fontSize:18, fontWeight:900, color:col } }, val),
              ce("div", { style:{ fontSize:9, color:C.muted } }, lbl)
            )
          )
        ),
        ce("div", { style:{ display:"flex", gap:10, marginTop:10 } },
          ce("button", { type:"button", style:{ ...S.btn("ghost"), flex:1 }, onClick:close }, "Cancelar"),
          ce("button", { type:"button",
            style:{ ...S.btn(saving==="ok"?"cyan":saving==="error"?"err":undefined), flex:2 },
            onClick: saving==="saving"?null:save, disabled:saving==="saving" },
            saving==="saving"?"⏳ Guardando...":saving==="ok"?"✅ Guardado!":saving==="error"?"❌ Error":"Guardar horario"
          )
        )
      )
    )
  );
}
