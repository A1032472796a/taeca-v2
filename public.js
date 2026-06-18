import { C, S, ROLES, SC, SL, SLOTS, MO, DY } from "./config.js";
import { pt, ts, today, vPhone, calDays, weekOf, scheduleReminder } from "./helpers.js";
import { DB } from "./db.js";
import { Logo, Field, PhoneInput, StampCard, PtsBar } from "./components.js";

const { createElement: ce, useState, useEffect } = React;

export function Public({ svcs, appts, users, clients, cfg, onBook, onAdmin, onSuperAdmin, onReg }) {
  const stampsOn = cfg && cfg.stampsOn;
  const [ptab, setPtab] = useState("booking");
  const [step, setStep] = useState(1);
  const [svc,  setSvc]  = useState(null);
  const [stf,  setStf]  = useState(null);
  const [dt,   setDt]   = useState(null);
  const [tm,   setTm]   = useState(null);
  const [nm,   setNm]   = useState("");
  const [ph,   setPh]   = useState("");
  const [err,  setErr]  = useState("");
  const [clientFound, setClientFound] = useState(null);
  const [yr, setYr] = useState(new Date().getFullYear());
  const [mo, setMo] = useState(new Date().getMonth());
  const [rn, setRn] = useState(""); const [rp, setRp] = useState("");
  const [re, setRe] = useState(""); const [rb, setRb] = useState("");
  const [rerr, setRerr] = useState(""); const [rdone, setRdone] = useState(false);
  const [lp, setLp] = useState(""); const [lv, setLv] = useState(false);

  const staffL = users.filter(u => u.role === "barbero" || u.role === "tatuador");
  const days   = calDays(yr, mo);

  function slotOk(d, sl) {
    if (!stf) return false;
    const ds = ts(d);
    if (ds < today()) return false;
    if (ds === today()) {
      const now2 = new Date();
      if (pt(sl) <= now2.getHours()*60+now2.getMinutes()) return false;
    }
    if (!stf.workDays?.includes(d.getDay())) return false;
    const sm = pt(sl);
    if (sm < pt(stf.wStart||"09:00") || sm >= pt(stf.wEnd||"19:00")) return false;
    if (stf.blocks?.[ds] === true) return false;
    if (stf.lunchStart && stf.lunchEnd && sm >= pt(stf.lunchStart) && sm < pt(stf.lunchEnd)) return false;
    return !appts.some(a => a.stId === stf.id && a.date === ds && a.time === sl);
  }
  function dayOk(d) {
    if (!stf) return false;
    const ds = ts(d);
    if (ds < today()) return false;
    if (!stf.workDays?.includes(d.getDay())) return false;
    if (stf.blocks?.[ds] === true) return false;
    return SLOTS.some(sl => slotOk(d, sl));
  }
  const avSlots = { m: [], a: [] };
  if (stf && dt) SLOTS.forEach(sl => { if (slotOk(dt,sl)) { if (pt(sl)<13*60) avSlots.m.push(sl); else avSlots.a.push(sl); } });

  async function confirm() {
    if (!nm) { setErr("Ingresa tu nombre"); return; }
    if (!vPhone(ph)) { setErr("El teléfono debe tener exactamente 10 dígitos"); return; }
    const a = { id:"a"+Date.now(), client:nm, phone:ph, svc:svc?svc.name:"", svcId:svc?svc.id:"",
                stId:stf?stf.id:null, date:ts(dt), time:tm, status:"pendiente", dur:svc?svc.dur:30 };
    let cliData = clientFound;
    if (!clientFound) {
      const newCli = { id:"c"+Date.now(), name:nm, phone:ph, email:"", visits:0, last:"-", stamps:0, pts:0, since:today() };
      cliData = newCli; onReg(newCli);
      try { await DB.save("clients", newCli.id, newCli); } catch {}
    } else {
      const upd = { ...clientFound, visits:(clientFound.visits||0)+1, last:today() };
      onReg(upd); try { await DB.save("clients", upd.id, upd); } catch {}
    }
    onBook(a); setStep(5);
    try { await DB.save("appointments", a.id, a); } catch(e){ console.error(e); }
    scheduleReminder(a, cliData, stf?stf.name:"Tu profesional");
  }

  async function doReg() {
    setRerr("");
    if (!rn) { setRerr("El nombre es obligatorio"); return; }
    if (!vPhone(rp)) { setRerr("El teléfono debe tener exactamente 10 dígitos"); return; }
    if (clients.some(c => c.phone === rp)) { setRerr("Ya existe una cuenta con ese número"); return; }
    const cl = { id:"c"+Date.now(), name:rn, phone:rp, email:re, bday:rb, visits:0, last:"-", stamps:0, pts:0, since:today() };
    await DB.save("clients", cl.id, cl);
    onReg(cl); setRdone(true); setLp(rp);
  }

  let loyClient = null;
  if (lv && lp) loyClient = clients.find(c => c.phone === lp) || null;
  const loyAppts = loyClient ? appts.filter(a => a.client===loyClient.name||a.phone===loyClient.phone).slice().reverse().slice(0,5) : [];

  const pubTabs = [["booking","📅 Agendar"],["registro","📝 Registro"]];
  if (stampsOn) pubTabs.push(["loyalty","🎫 Mi tarjeta"]);

  // ── Staff step ──
  function renderStep1() {
    return ce("div", null,
      ce("b", { style:{ fontSize:14, color:C.accent, display:"block", marginBottom:11 } }, "Elige tu profesional"),
      ce("div", { className:"staff-grid" },
        staffL.map(u => ce("div", { key:u.id, onClick:()=>{ setStf(u); setSvc(null); setDt(null); setTm(null); },
          style:{ background: stf?.id===u.id?C.cyan+"18":C.card, border:"1.5px solid "+(stf?.id===u.id?C.cyan:C.border),
                  borderRadius:12, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 } },
          ce("div", { style:{ width:38, height:38, borderRadius:"50%", background:C.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, overflow:"hidden", flexShrink:0 } },
            u.photo ? ce("img",{src:u.photo,style:{width:"100%",height:"100%",objectFit:"cover"},alt:""}) : u.name[0]
          ),
          ce("div", null, ce("b",{style:{fontSize:13}},u.name), ce("div",{style:{color:C.muted,fontSize:11}},ROLES[u.role])),
          stf?.id===u.id && ce("div",{style:{marginLeft:"auto",color:C.cyan,fontSize:17}},"✓")
        ))
      ),
      ce("button", { type:"button", style:{ ...S.btn(), width:"100%", marginTop:10, opacity:stf?1:0.4 }, disabled:!stf, onClick:()=>setStep(2) }, "Continuar →")
    );
  }

  // ── Service step ──
  function renderStep2() {
    const cfg2 = stf?.svcsConfig || {};
    const hasCfg = Object.keys(cfg2).some(k => cfg2[k]?.on);
    const list = hasCfg ? svcs.filter(sv => cfg2[sv.id]?.on) : svcs;
    return ce("div", null,
      ce("b", { style:{ fontSize:14, color:C.accent, display:"block", marginBottom:4 } }, "¿Qué servicio necesitas?"),
      ce("div", { style:{ color:C.muted, fontSize:11, marginBottom:11 } }, "Con: ", ce("b",{style:{color:C.text}},stf?.name)),
      ce("div", { className:"svc-grid" },
        list.map(sv => {
          const c2 = cfg2[sv.id];
          const price = c2?.price || sv.price, dur = c2?.dur || sv.dur;
          return ce("div", { key:sv.id, onClick:()=>setSvc({...sv,price,dur}),
            style:{ background: svc?.id===sv.id?C.accent+"18":C.card, border:"1.5px solid "+(svc?.id===sv.id?C.accent:C.border),
                    borderRadius:12, padding:"12px 14px", cursor:"pointer" } },
            ce("div", { style:S.row },
              ce("div", null, ce("span",{style:{fontSize:13,fontWeight:700,color:"#fff",display:"block"}},sv.name), ce("div",{style:{color:C.muted,fontSize:11}},"⏱ ",dur," min")),
              ce("b", {style:{color:C.accent,fontSize:15}},"$",price)
            )
          );
        })
      ),
      ce("div", { style:{ display:"flex", gap:9, marginTop:10 } },
        ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:()=>setStep(1)},"← Volver"),
        ce("button",{type:"button",style:{...S.btn(),flex:2,opacity:svc?1:0.4},disabled:!svc,onClick:()=>setStep(3)},"Continuar →")
      )
    );
  }

  // ── Date/Time step ──
  function renderStep3() {
    return ce("div", null,
      ce("b",{style:{fontSize:14,color:C.accent,display:"block",marginBottom:4}},"Elige fecha y hora"),
      ce("div",{style:{color:C.muted,fontSize:11,marginBottom:11}},"Con: ",ce("b",{style:{color:C.text}},stf?.name)),
      ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}},
        ce("button",{type:"button",onClick:()=>mo===0?(setMo(11),setYr(y=>y-1)):setMo(m=>m-1),style:{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer"}},"‹"),
        ce("b",{style:{fontSize:13}},MO[mo]," ",yr),
        ce("button",{type:"button",onClick:()=>mo===11?(setMo(0),setYr(y=>y+1)):setMo(m=>m+1),style:{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer"}},"›")
      ),
      ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}},
        DY.map(d=>ce("div",{key:d,style:{textAlign:"center",fontSize:9,color:C.muted,paddingBottom:3}},d))
      ),
      ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:11}},
        days.map((d,i) => {
          if (!d) return ce("div",{key:i});
          const ok=dayOk(d), sel=dt&&ts(d)===ts(dt);
          return ce("div",{key:i,onClick:()=>{ if(ok){setDt(d);setTm(null);} },
            style:{background:sel?"linear-gradient(135deg,#c9a84c,#4ecdc4)":ok?C.card:"#080c10",
                   border:"1px solid "+(sel?"transparent":C.border),borderRadius:8,padding:"7px 0",textAlign:"center",
                   cursor:ok?"pointer":"default",color:sel?"#000":ok?C.text:C.border,fontSize:11,fontWeight:sel?700:400}},
            d.getDate(), ok&&!sel&&ce("div",{style:{width:4,height:4,borderRadius:"50%",background:C.ok,margin:"1px auto 0"}})
          );
        })
      ),
      dt && ce("div",null,
        ce("b",{style:{fontSize:12,color:C.cyan,display:"block",marginBottom:7}},dt.getDate()," de ",MO[dt.getMonth()]),
        avSlots.m.length>0&&ce("div",null,
          ce("div",{style:{fontSize:10,color:C.muted,marginBottom:5}},"🌅 Mañana"),
          ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:9}},
            avSlots.m.map(sl=>ce("div",{key:sl,onClick:()=>setTm(sl),
              style:{padding:"7px 3px",borderRadius:7,border:"1px solid "+(tm===sl?C.accent:C.border),
                     background:tm===sl?C.accent+"22":"transparent",color:tm===sl?C.accent:C.muted,
                     cursor:"pointer",fontSize:11,textAlign:"center",fontWeight:tm===sl?700:400}},sl))
          )
        ),
        avSlots.a.length>0&&ce("div",null,
          ce("div",{style:{fontSize:10,color:C.muted,marginBottom:5}},"🌆 Tarde"),
          ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:9}},
            avSlots.a.map(sl=>ce("div",{key:sl,onClick:()=>setTm(sl),
              style:{padding:"7px 3px",borderRadius:7,border:"1px solid "+(tm===sl?C.accent:C.border),
                     background:tm===sl?C.accent+"22":"transparent",color:tm===sl?C.accent:C.muted,
                     cursor:"pointer",fontSize:11,textAlign:"center",fontWeight:tm===sl?700:400}},sl))
          )
        )
      ),
      ce("div",{style:{display:"flex",gap:9}},
        ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:()=>setStep(2)},"← Volver"),
        ce("button",{type:"button",style:{...S.btn(),flex:2,opacity:dt&&tm?1:0.4},disabled:!(dt&&tm),onClick:()=>setStep(4)},"Continuar →")
      )
    );
  }

  // ── Contact step ──
  function renderStep4() {
    return ce("div",null,
      ce("b",{style:{fontSize:14,color:C.accent,display:"block",marginBottom:11}},"Tus datos"),
      ce("div",{style:{...S.card,border:"1px solid "+C.accent+"44",marginBottom:13}},
        [["Servicio",svc?.name||""],["Profesional",stf?.name||""],["Fecha",dt?dt.getDate()+" de "+MO[dt.getMonth()]:""],["Hora",tm||""]].map(([k,v])=>
          ce("div",{key:k,style:{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}},
            ce("span",{style:{color:C.muted}},k),ce("b",{style:{color:k==="Hora"?C.accent:C.text}},v))
        )
      ),
      ce(PhoneInput,{label:"Teléfono (10 dígitos) *",val:ph,set:v=>{
        setPh(v);
        if(v.length===10){const f=clients.find(c=>c.phone===v);setClientFound(f||null);if(f)setNm(f.name);}
        else setClientFound(null);
      }}),
      clientFound&&ce("div",{style:{background:C.ok+"18",border:"1px solid "+C.ok+"44",borderRadius:9,padding:"9px 12px",marginBottom:9,display:"flex",alignItems:"center",gap:9}},
        ce("div",{style:{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#c9a84c,#4ecdc4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#000",flexShrink:0}},clientFound.name[0]),
        ce("div",null,ce("div",{style:{fontWeight:700,fontSize:13,color:C.ok}},"✓ Cliente encontrado"),ce("div",{style:{fontSize:11,color:C.muted}},clientFound.name," · ",clientFound.visits||0," visitas"))
      ),
      !clientFound&&ph.length===10&&ce("div",{style:{background:C.warn+"18",border:"1px solid "+C.warn+"44",borderRadius:9,padding:"9px 12px",marginBottom:9,fontSize:12,color:C.warn}},"📋 Número nuevo — completa tu nombre para registrarte"),
      ce(Field,{label:"Nombre completo *",val:nm,set:setNm,ph:"Carlos Pérez"}),
      err&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:9}},"⚠️ ",err),
      ce("div",{style:{display:"flex",gap:9}},
        ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:()=>setStep(3)},"← Volver"),
        ce("button",{type:"button",style:{...S.btn(),flex:2},onClick:confirm},"Confirmar ✓")
      )
    );
  }

  // ── Success step ──
  function renderStep5() {
    return ce("div",{style:{textAlign:"center",padding:"26px 12px"}},
      ce("div",{style:{fontSize:50,marginBottom:11}},"🎉"),
      ce("div",{style:{fontSize:18,fontWeight:900,background:"linear-gradient(90deg,#c9a84c,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:9}},"¡Cita agendada!"),
      ce("div",{style:{color:C.muted,fontSize:12,lineHeight:1.9,marginBottom:18}},
        ce("b",{style:{color:C.text}},nm),", tu cita de ",ce("b",{style:{color:C.text}},svc?.name),ce("br"),
        "con ",ce("b",{style:{color:C.text}},stf?.name),ce("br"),
        "el ",ce("b",{style:{color:C.accent}},dt?.getDate()," de ",MO[dt?.getMonth()]," a las ",tm)
      ),
      ce("button",{type:"button",style:{...S.btn(),width:"100%",color:"#000"},onClick:()=>{
        setStep(1);setSvc(null);setStf(null);setDt(null);setTm(null);setNm("");setPh("");setErr("");setClientFound(null);
      }},"Agendar otra cita")
    );
  }

  return ce("div",{id:"pub-root"},
    // Hero
    ce("div",{id:"pub-hero",style:{background:"linear-gradient(160deg,#080c10,#0d1a28)",padding:"28px 20px 20px",textAlign:"center",borderBottom:"1px solid "+C.border}},
      ce("div",{style:{display:"flex",justifyContent:"center",marginBottom:10}},
        cfg?.businessLogo?.length>100
          ? ce("img",{src:cfg.businessLogo,style:{width:72,height:72,borderRadius:16,objectFit:"cover",border:"2px solid "+C.accent+"44"},onError:e=>{e.target.style.display="none";}})
          : ce(Logo,{size:64})
      ),
      ce("div",{style:{fontSize:26,fontWeight:900,letterSpacing:cfg?.businessName?.trim()?2:5}},
        cfg?.businessName?.trim()
          ? ce("span",{style:{color:C.accent}},cfg.businessName.trim().toUpperCase())
          : ce("span",{className:"gradient-text",style:{background:"linear-gradient(90deg,#c9a84c,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}},"TASECA")
      ),
      ce("div",{style:{fontSize:10,color:C.cyan,letterSpacing:4,marginTop:2}},
        cfg?.businessSubtitle?.trim() ? cfg.businessSubtitle.trim().substring(0,40).toUpperCase() : "BARBER & TATTOO STUDIO"
      ),
      cfg?.businessName?.trim() && ce("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:10,opacity:0.55}},
        ce("span",{style:{fontSize:8,color:C.muted,letterSpacing:1}},"POWERED BY"),
        ce(Logo,{size:12}),
        ce("span",{style:{fontSize:9,fontWeight:900,background:"linear-gradient(90deg,#c9a84c,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}},"TASECA")
      )
    ),
    // Tabs
    ce("div",{id:"pub-tabs-wrap"},
      ce("div",{id:"pub-tabs"},
        pubTabs.map(([id,lbl])=>ce("button",{type:"button",key:id,onClick:()=>setPtab(id),
          style:{flex:1,padding:"11px 3px",background:"none",border:"none",
                 borderBottom:"2px solid "+(ptab===id?C.accent:"transparent"),
                 color:ptab===id?C.accent:C.muted,fontWeight:ptab===id?700:400,fontSize:12,cursor:"pointer"}},lbl))
      )
    ),
    // Body
    ce("div",{id:"pub-body"},
      ce("div",{id:"pub-inner"},
        // Booking
        ptab==="booking" && ce("div",null,
          step<5 && ce("div",{style:{display:"flex",gap:4,marginBottom:16}},
            [1,2,3,4].map(i=>ce("div",{key:i,style:{flex:1,height:3,borderRadius:3,background:step>i?C.accent:step===i?C.accent+"66":C.border}}))
          ),
          step===1&&renderStep1(), step===2&&renderStep2(), step===3&&renderStep3(),
          step===4&&renderStep4(), step===5&&renderStep5()
        ),
        // Registro
        ptab==="registro" && ce("div",null,
          !rdone && ce("div",null,
            ce("div",{style:{textAlign:"center",marginBottom:16}},ce("div",{style:{fontSize:36,marginBottom:6}},"📝"),ce("div",{style:{fontWeight:700,fontSize:15,color:C.accent,marginBottom:3}},"Crear mi cuenta"),ce("div",{style:{color:C.muted,fontSize:12}},"Regístrate gratis y acumula beneficios")),
            ce(Field,{label:"Nombre completo *",val:rn,set:setRn,ph:"Carlos Pérez"}),
            ce(PhoneInput,{val:rp,set:setRp}),
            ce(Field,{label:"Email (opcional)",val:re,set:setRe,ph:"carlos@email.com",type:"email"}),
            ce(Field,{label:"Fecha de cumpleaños (opcional)",val:rb,set:setRb,type:"date"}),
            rerr&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:10}},"⚠️ ",rerr),
            ce("button",{type:"button",style:{...S.btn("cyan"),width:"100%",color:"#000",padding:"12px",fontSize:14},onClick:doReg},"Crear mi cuenta →")
          ),
          rdone && ce("div",{style:{textAlign:"center",padding:"28px 14px"}},
            ce("div",{style:{fontSize:50,marginBottom:12}},"🎉"),
            ce("div",{style:{fontSize:19,fontWeight:900,color:C.ok,marginBottom:7}},"¡Cuenta creada!"),
            stampsOn&&ce(StampCard,{n:0}),
            ce("button",{type:"button",style:{...S.btn(),width:"100%",color:"#000",marginTop:14},onClick:()=>{setRdone(false);setRn("");setRp("");setRe("");setRb("");setPtab("booking");}},"Agendar cita")
          )
        ),
        // Loyalty
        ptab==="loyalty" && stampsOn && ce("div",null,
          !lv && ce("div",null,
            ce("div",{style:{textAlign:"center",marginBottom:16}},ce("div",{style:{fontSize:34,marginBottom:6}},"🎫"),ce("div",{style:{fontWeight:700,fontSize:15,color:C.accent}},"Tu tarjeta de fidelidad")),
            ce("div",{style:{...S.card,marginBottom:10}},
              ce("b",{style:{color:C.accent,fontSize:12}},"🔍 Ya tengo cuenta"),
              ce("div",{style:{marginTop:9}},ce(PhoneInput,{val:lp,set:setLp})),
              ce("button",{type:"button",style:{...S.btn(),width:"100%"},onClick:()=>setLv(true)},"Ver mi tarjeta →")
            ),
            ce("div",{style:{...S.card,border:"1px solid "+C.cyan+"44"}},
              ce("b",{style:{color:C.cyan,fontSize:12}},"✨ Quiero registrarme"),
              ce("div",{style:{color:C.muted,fontSize:12,marginTop:5,marginBottom:9}},"Crea tu perfil y empieza a acumular hoy"),
              ce("button",{type:"button",style:{...S.btn("cyan"),width:"100%",color:"#000"},onClick:()=>setPtab("registro")},"Crear perfil gratis")
            )
          ),
          lv && ce("div",null,
            ce("button",{type:"button",onClick:()=>setLv(false),style:{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:12}},"← Volver"),
            !loyClient && ce("div",{style:{textAlign:"center",padding:28,color:C.muted,fontSize:13}},"No encontramos cuenta con ese número"),
            loyClient && ce("div",null,
              ce("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:14}},
                ce("div",{style:{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#c9a84c,#4ecdc4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#000"}},loyClient.name[0]),
                ce("div",null,ce("div",{style:{fontSize:17,fontWeight:900}},loyClient.name),ce("div",{style:{color:C.muted,fontSize:12}},loyClient.visits||0," visitas"))
              ),
              ce(StampCard,{n:loyClient.stamps||0}),
              ce(PtsBar,{pts:loyClient.pts||0}),
              ce("b",{style:{fontSize:12,color:C.accent,display:"block",marginTop:14,marginBottom:9}},"📋 Mis últimas citas"),
              loyAppts.length===0
                ? ce("div",{style:{color:C.muted,textAlign:"center",padding:14,fontSize:12}},"Sin citas")
                : loyAppts.map(a=>ce("div",{key:a.id,style:{...S.card,marginBottom:7}},
                    ce("div",{style:S.row},
                      ce("div",null,ce("b",{style:{fontSize:12}},a.svc),ce("div",{style:{color:C.muted,fontSize:11}},a.date," · ",a.time)),
                      ce("span",{style:S.badge(SC[a.status]||C.muted)},a.status)
                    )
                  ))
            )
          )
        )
      )
    ),
    // Staff button
    ce("button",{type:"button",onClick:onAdmin,style:{position:"fixed",bottom:14,right:13,background:C.card,border:"1px solid "+C.border,borderRadius:20,padding:"5px 11px",color:C.muted,fontSize:11,cursor:"pointer"}},"🔒 Staff"),
    // SuperAdmin button (solo en root)
    (()=>{
      const host=window.location.hostname;
      const hasE=new URLSearchParams(window.location.search).get("e");
      if(host==="app.taseca.tech"&&!hasE) return ce("button",{type:"button",onClick:()=>onSuperAdmin&&onSuperAdmin(),style:{position:"fixed",bottom:14,left:13,background:"transparent",border:"none",borderRadius:"50%",width:28,height:28,color:C.border,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4}},"⚙️");
      return null;
    })()
  );
}
