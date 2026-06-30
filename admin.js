import { C, S, ROLES, RTABS, SC, SL, CAT, DY, SLOTS, MO, slotsForDuration } from "./config.js";
import { DB } from "./db.js";
import { ts, today, vPhone, pt, scheduleReminder } from "./helpers.js";
import { Logo, Field, Mdl, Toggle, PhoneInput, StampCard, PtsBar, TrialBanner, NotifBanner } from "./components.js";
import { WeekCal, SchedMdl } from "./calendar.js";

const { createElement: ce, useState, useEffect, useRef } = React;

// ─── REPORTES ────────────────────────────────────────────────────
function Reportes({ appts, sales, clients, users, isAdmin, prodSales = [], prods = [] }) {
  const [period, setPeriod] = useState("month");
  const [stf,    setStf]    = useState("all");
  const [rtab,   setRtab]   = useState("servicios");

  const now = new Date(), tm = now.toISOString().slice(0,7);
  const lm  = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7);
  const ty  = now.getFullYear().toString();

  function pf(ds) {
    if (!ds) return false;
    if (period==="week")      return (now-new Date(ds))/864e5 <= 7;
    if (period==="month")     return ds.startsWith(tm);
    if (period==="lastmonth") return ds.startsWith(lm);
    if (period==="year")      return ds.startsWith(ty);
    return true;
  }

  const fa   = appts.filter(a => pf(a.date) && (stf==="all" || a.stId===stf));
  const fs   = sales.filter(s => pf(s.date));
  const ing  = fs.reduce((a,s)=>a+s.total,0);
  const tc   = fa.length;
  const conf = fa.filter(a=>a.status==="confirmado").length;
  const pend = fa.filter(a=>a.status==="pendiente").length;
  const walk = fa.filter(a=>a.status==="walk_in").length;
  const canc = fa.filter(a=>a.status==="cancelado").length;
  const tasa = tc>0?Math.round(conf/tc*100):0;
  const tkt  = fs.length>0?Math.round(ing/fs.length):0;

  const sc2  = {};
  fa.filter(a=>a.status==="confirmado"||a.status==="walk_in").forEach(a=>{ if(a.svc) sc2[a.svc]=(sc2[a.svc]||0)+1; });
  const top  = Object.entries(sc2).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const pm   = {}; fs.forEach(s=>{ pm[s.method]=(pm[s.method]||0)+s.total; });

  const staffL = users.filter(u=>u.role==="barbero"||u.role==="tatuador");
  const sp = staffL.map(u=>({ name:u.name, id:u.id, n:fa.filter(a=>(a.stId||a.st_id)===u.id&&(a.status==="confirmado"||a.status==="walk_in")).length })).sort((a,b)=>b.n-a.n);
  const mc = Math.max(...sp.map(x=>x.n),1);
  const bd = [0,0,0,0,0,0,0]; fa.forEach(a=>{ if(a.date) bd[new Date(a.date).getDay()]++; });
  const md = Math.max(...bd,1);

  const fps      = prodSales.filter(s=>pf(s.date));
  const ingProd  = fps.reduce((a,s)=>a+s.total,0);
  const porCob   = fps.filter(s=>s.method==="debe").reduce((a,s)=>a+Math.max(0,s.pendiente||0),0);
  const deudas   = fps.filter(s=>s.method==="debe"&&(s.pendiente||0)>0).length;
  const pc       = {}; fps.forEach(s=>(s.items||[]).forEach(it=>{ const n=it.replace(/ x\d+$/,"").trim(); const m=it.match(/ x(\d+)$/); pc[n]=(pc[n]||0)+(m?parseInt(m[1]):1); }));
  const topProds = Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const pmProd   = {}; fps.forEach(s=>{ pmProd[s.method]=(pmProd[s.method]||0)+s.total; });
  const stockBajo= prods.filter(p=>(p.stock||0)>0&&(p.stock||0)<5).length;
  const agotados = prods.filter(p=>(p.stock||0)===0).length;

  const PL = { week:"Esta semana", month:"Este mes", lastmonth:"Mes anterior", year:"Este año", all:"Todo" };
  const periods = [["week","7 días"],["month","Este mes"],["lastmonth","Mes ant."],["year","Este año"],["all","Todo"]];

  return ce("div", null,
    ce("b",{style:{fontSize:15,color:C.accent}},"📊 Reportes"),
    ce("div",{style:{display:"flex",gap:8,margin:"12px 0 14px"}},
      [["servicios","✂️ Servicios"],["productos","📦 Productos"]].map(([id,lbl])=>
        ce("button",{type:"button",key:id,onClick:()=>setRtab(id),
          style:{...S.btn(rtab===id?"gold":"ghost"),flex:1,fontSize:13,padding:"10px",color:rtab===id?"#000":C.muted}},lbl)
      )
    ),
    rtab==="servicios" ? ce("div",null,
      ce("div",{style:{display:"flex",gap:4,marginBottom:7,overflowX:"auto"}},
        periods.map(([id,lbl])=>ce("button",{type:"button",key:id,onClick:()=>setPeriod(id),
          style:{...S.btn(period===id?"gold":"ghost"),padding:"4px 8px",fontSize:10,whiteSpace:"nowrap",flexShrink:0,color:period===id?"#000":C.muted}},lbl))
      ),
      isAdmin&&ce("div",{style:{display:"flex",gap:4,marginBottom:12,overflowX:"auto"}},
        ce("button",{type:"button",onClick:()=>setStf("all"),style:{...S.btn(stf==="all"?"cyan":"ghost"),padding:"4px 8px",fontSize:10,whiteSpace:"nowrap",flexShrink:0,color:stf==="all"?"#000":C.muted}},"Todos"),
        staffL.map(u=>ce("button",{type:"button",key:u.id,onClick:()=>setStf(u.id),
          style:{...S.btn(stf===u.id?"cyan":"ghost"),padding:"4px 8px",fontSize:10,whiteSpace:"nowrap",flexShrink:0,color:stf===u.id?"#000":C.muted}},u.name.split(" ")[0]))
      ),
      ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:11}},
        [["💰","Ingresos","$"+ing,C.accent],["📅","Citas",tc,C.cyan],["🎯","Confirmación",tasa+"%",C.ok],["🎫","Ticket","$"+tkt,C.warn]]
        .map(([ico,lbl,val,col])=>ce("div",{key:lbl,style:{background:col+"18",border:"1px solid "+col+"33",borderRadius:11,padding:"11px"}},
          ce("div",{style:{fontSize:17}},ico),ce("div",{style:{fontSize:19,fontWeight:900,color:col,marginTop:3}},val),ce("div",{style:{fontSize:10,color:C.muted}},lbl)
        ))
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"📋 Estado de citas — ",PL[period]),
        ce("div",{style:{marginTop:9}},
          [[conf,"Confirmadas",C.cyan],[pend,"Pendientes",C.warn],[walk,"Walk-ins",C.ok],[canc,"Canceladas",C.err]].map(([n,lbl,col])=>{
            const pct2=tc>0?Math.round(n/tc*100):0;
            return ce("div",{key:lbl,style:{marginBottom:7}},
              ce("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2}},ce("span",{style:{fontSize:11,color:col,fontWeight:600}},lbl),ce("span",{style:{fontSize:11,color:C.muted}},n," (",pct2,"%)")),
              ce("div",{style:{background:C.border,borderRadius:20,height:5}},ce("div",{style:{width:pct2+"%",height:"100%",background:col,borderRadius:20}}))
            );
          })
        )
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"✂ Servicios más solicitados"),
        ce("div",{style:{marginTop:9}},
          top.length===0
            ? ce("div",{style:{color:C.muted,fontSize:12,textAlign:"center",padding:10}},"Sin datos")
            : top.map(([nm2,cnt2],i)=>{
                const pct2=Math.round(cnt2/Math.max(top[0][1],1)*100);
                const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"  ";
                return ce("div",{key:nm2,style:{marginBottom:7}},
                  ce("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2}},ce("span",{style:{fontSize:11}},medal," ",nm2),ce("b",{style:{fontSize:11,color:C.accent}},cnt2)),
                  ce("div",{style:{background:C.border,borderRadius:20,height:5}},ce("div",{style:{width:pct2+"%",height:"100%",background:"linear-gradient(90deg,"+C.accent+","+C.cyan+")",borderRadius:20}}))
                );
              })
        )
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"👤 Rendimiento por profesional"),
        ce("div",{style:{marginTop:9}},sp.map(x=>{
          const pct2=Math.round(x.n/mc*100);
          return ce("div",{key:x.id,style:{marginBottom:7}},
            ce("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2}},ce("span",{style:{fontSize:11}},x.name),ce("b",{style:{fontSize:11,color:C.cyan}},x.n," citas")),
            ce("div",{style:{background:C.border,borderRadius:20,height:5}},ce("div",{style:{width:pct2+"%",height:"100%",background:C.cyan,borderRadius:20}}))
          );
        }))
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"📆 Días más ocupados"),
        ce("div",{style:{display:"flex",gap:3,alignItems:"flex-end",height:70,marginTop:10,padding:"0 4px"}},
          ["Do","Lu","Ma","Mi","Ju","Vi","Sa"].map((d,i)=>{
            const hv=bd[i], pct2=Math.round(hv/md*100), isTop=hv===Math.max(...bd);
            return ce("div",{key:d,style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}},
              ce("div",{style:{fontSize:8,color:isTop?C.accent:C.muted,fontWeight:isTop?700:400}},hv||""),
              ce("div",{style:{width:"100%",borderRadius:"3px 3px 0 0",background:isTop?"linear-gradient(180deg,"+C.accent+","+C.cyan+")":C.border,height:Math.max(3,Math.round(pct2*0.52))+"px"}}),
              ce("div",{style:{fontSize:8,color:isTop?C.accent:C.muted,fontWeight:isTop?700:400}},d)
            );
          })
        )
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"💳 Métodos de pago"),
        Object.entries(pm).length===0
          ? ce("div",{style:{color:C.muted,fontSize:12,textAlign:"center",padding:10}},"Sin ventas")
          : Object.entries(pm).map(([met,val])=>ce("div",{key:met,style:{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border}},
              ce("span",{style:{fontSize:12}},met==="efectivo"?"💵 Efectivo":met==="tarjeta"?"💳 Tarjeta":met==="pendiente"?"⏳ Pendiente":"🏦 "+met),
              ce("b",{style:{color:C.accent}},"$",val)
            ))
      )
    ) : ce("div",null,
      ce("div",{style:{display:"flex",gap:4,marginBottom:10,overflowX:"auto"}},
        periods.map(([id,lbl])=>ce("button",{type:"button",key:id,onClick:()=>setPeriod(id),
          style:{...S.btn(period===id?"gold":"ghost"),padding:"4px 10px",fontSize:10,whiteSpace:"nowrap",flexShrink:0,color:period===id?"#000":C.muted}},lbl))
      ),
      ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}},
        [["📦","Ventas prod.","$"+ingProd,C.accent],["🔢","Transacciones",prodSales.length,C.cyan],["⏳","Por cobrar","$"+porCob,C.warn],["🚨","Deudas",deudas,C.err]]
        .map(([ico,lbl,val,col])=>ce("div",{key:lbl,style:{background:col+"18",border:"1px solid "+col+"33",borderRadius:11,padding:"11px",textAlign:"center"}},
          ce("div",{style:{fontSize:20}},ico),ce("div",{style:{fontSize:18,fontWeight:900,color:col,marginTop:3}},val),ce("div",{style:{fontSize:10,color:C.muted}},lbl)
        ))
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"📦 Productos más vendidos"),
        topProds.length===0
          ? ce("div",{style:{color:C.muted,fontSize:12,textAlign:"center",padding:14}},"Sin ventas")
          : ce("div",{style:{marginTop:9}},topProds.map(([nm2,cnt2],i)=>{
              const pct2=Math.round(cnt2/Math.max(topProds[0][1],1)*100);
              const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"  ";
              return ce("div",{key:nm2,style:{marginBottom:8}},
                ce("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},ce("span",{style:{fontSize:12}},medal+" "+nm2),ce("b",{style:{fontSize:12,color:C.accent}},"x"+cnt2)),
                ce("div",{style:{background:C.border,borderRadius:20,height:5}},ce("div",{style:{width:pct2+"%",height:"100%",background:"linear-gradient(90deg,"+C.accent+","+C.cyan+")",borderRadius:20}}))
              );
            }))
      ),
      ce("div",{style:{...S.card,marginBottom:10}},
        ce("b",{style:{fontSize:12}},"🟢 Stock actual"),
        ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:9}},
          [[prods.length,"Total",C.text],[stockBajo,"Stock bajo",C.warn],[agotados,"Agotados",C.err]].map(([val,lbl,col])=>
            ce("div",{key:lbl,style:{textAlign:"center",background:col+"11",border:"1px solid "+col+"33",borderRadius:9,padding:"8px 4px"}},
              ce("div",{style:{fontSize:18,fontWeight:900,color:col}},val),ce("div",{style:{fontSize:9,color:C.muted}},lbl)
            )
          )
        )
      )
    )
  );
}

// ─── APPT MDL (module-level: evita remount al re-renderizar Admin) ──────────
function ApptMdl({d,clients,setClients,svcs,staffL,selSt,appts,setAppts,setMdl,setNslot,checkConflict}){
  const [wi,setWi]=useState(!d.id&&!d.date); const [blk,setBlk]=useState(false);
  const [cn,setCn]=useState(d.client||""); const [sv,setSv]=useState(d.svc||"");
  const [dt2,setDt2]=useState(d.date||""); const [tm2,setTm2]=useState(d.time||"");
  const [st2,setSt2]=useState(d.status||"pendiente"); const [sf,setSf]=useState(d.stId||selSt||"");
  const [aph,setAph]=useState(d.phone||""); const [aem,setAem]=useState(d.email||"");
  const [ae,setAe]=useState(""); const [load2,setLoad2]=useState(false);
  const savingRef=useRef(false);
  const [customDur,setCustomDur]=useState(false); const [manualDur,setManualDur]=useState(30);
  const [blkDur,setBlkDur]=useState(15); // duración del bloqueo en minutos
  const [clientFound3,setClientFound3]=useState(null);
  function handleApptPhone(v){
    const digits=v.replace(/\D/g,"").slice(0,10); setAph(digits);
    if(digits.length===10){
      const f=clients.find(c=>c.phone===digits);
      if(f){setClientFound3(f);setCn(f.name);setAem(f.email||"");}
      else setClientFound3(null);
    } else setClientFound3(null);
  }
  async function save(){
    if(savingRef.current) return;
    setAe("");
    if(!blk&&!cn){setAe("El nombre del cliente es obligatorio");return;}
    if(!blk&&!sv){setAe("Selecciona un servicio");return;}
    if(!wi&&!dt2){setAe("Selecciona una fecha");return;}
    if(!wi&&!tm2){setAe("Selecciona una hora");return;}
    if(blk&&!dt2){setAe("Selecciona la fecha del bloqueo");return;}
    if(blk&&!tm2){setAe("Selecciona la hora del bloqueo");return;}
    if(!sf){setAe("Selecciona un profesional");return;}
    // Validar conflictos (almuerzo + citas existentes + bloqueos)
    if(!wi&&tm2&&sf&&dt2){
      const svcObj3=svcs.find(s=>s.name===sv);
      const dur3=svcObj3?svcObj3.dur:30;
      const conflict=checkConflict(sf, dt2, tm2, dur3, d.id||null);
      if(conflict){setAe(conflict);return;}
    }
    savingRef.current=true;
    setLoad2(true);
    try {
      const now2=new Date();
      const svcObj=svcs.find(s=>s.name===sv)||null;
      const selU2=staffL.find(u=>u.id===sf);
      const empCfg=selU2?.svcsConfig?.[svcObj?.id];
      // Si es cliente nuevo con teléfono, registrarlo automáticamente
      if(aph&&aph.length===10&&!clientFound3&&cn){
        const newCli={id:"c"+Date.now(),name:cn,phone:aph,email:aem,visits:0,last:"-",stamps:0,pts:0,since:today()};
        setClients(x=>[...x,newCli]);
        DB.save("clients",newCli.id,newCli).catch(()=>{});
      } else if(clientFound3){
        // Actualizar última visita
        const upd={...clientFound3,visits:(clientFound3.visits||0)+1,last:today()};
        setClients(x=>x.map(c=>c.id===clientFound3.id?upd:c));
        DB.save("clients",clientFound3.id,upd).catch(()=>{});
      }
      const item={
        id:d.id||"a"+Date.now(), client:cn, phone:aph, email:aem,
        svc:sv, svcId:svcObj?.id||"",
        svcPrice:empCfg?.price||(svcObj?.price||0), stId:sf,
        date:wi?today():dt2,
        time:wi?((now2.getHours()<10?"0":"")+now2.getHours()+":"+String(Math.floor(now2.getMinutes()/15)*15).padStart(2,"0")):tm2,
        status:blk?"bloqueado":wi?"walk_in":st2,
        dur:blk?blkDur:customDur?manualDur:(empCfg?.dur||(svcObj?.dur||30))
      };
      d.id?setAppts(x=>x.map(a=>a.id===d.id?item:a)):setAppts(x=>[...x,item]);
      setMdl(null); setNslot(null);
      await DB.save("appointments",item.id,item);
    } catch(e){setAe("Error al guardar: "+e.message);}
    setLoad2(false);
    savingRef.current=false;
  }
  const selUser=staffL.find(u=>u.id===sf);
  const svcOpts=(()=>{
    const cfg2=selUser?.svcsConfig||{};
    const hasCfg=Object.keys(cfg2).some(k=>cfg2[k]?.on);
    if(!selUser||!hasCfg) return svcs.map(s=>({v:s.name,l:s.name+" — $"+s.price}));
    return svcs.filter(s=>cfg2[s.id]?.on).map(s=>{const c2=cfg2[s.id];return {v:s.name,l:s.name+" — $"+(c2.price||s.price)};});
  })();
  return ce(Mdl,{title:wi?"⚡ Cliente sin cita":"Cita",close:()=>{setMdl(null);setNslot(null);},save,saveDisabled:load2},
    ce("div",{style:{display:"flex",gap:8,marginBottom:11}},
      ce("button",{type:"button",onClick:()=>{setWi(false);setBlk(false);},style:{...S.btn(!wi&&!blk?"gold":"ghost"),flex:1,fontSize:12}},"📅 Con cita"),
      ce("button",{type:"button",onClick:()=>{setWi(true);setBlk(false);},style:{...S.btn(wi?"cyan":"ghost"),flex:1,fontSize:12,color:wi?"#000":C.muted}},"⚡ Walk-in"),
      ce("button",{type:"button",onClick:()=>{setWi(false);setBlk(true);},style:{...S.btn(blk?"err":"ghost"),flex:1,fontSize:12,color:blk?"#fff":C.muted}},"🔒 Bloquear")
    ),
    !blk&&ce("div",{style:{marginBottom:10}},
      ce("label",{style:S.lbl},"Teléfono (busca cliente automáticamente)"),
      ce("div",{style:{position:"relative"}},
        ce("input",{
          style:{...S.inp,borderColor:aph.length>0?aph.length===10?C.ok:C.err:C.border},
          type:"tel",placeholder:"3001234567 (opcional)",value:aph,
          onChange:e2=>handleApptPhone(e2.target.value),
          onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}
        }),
        aph.length>0&&ce("span",{style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:aph.length===10?C.ok:C.err,fontWeight:700}},aph.length+"/10")
      )
    ),
    !blk&&clientFound3&&ce("div",{style:{background:C.ok+"18",border:"1px solid "+C.ok+"44",borderRadius:9,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}},
      ce("div",{style:{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.cyan+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#000",flexShrink:0}},clientFound3.name[0]),
      ce("div",null,ce("div",{style:{fontWeight:700,fontSize:12,color:C.ok}},"✓ "+clientFound3.name),ce("div",{style:{fontSize:10,color:C.muted}},clientFound3.visits||0," visitas · ",clientFound3.stamps||0," sellos"))
    ),
    !blk&&!clientFound3&&aph.length===10&&ce("div",{style:{background:C.warn+"18",border:"1px solid "+C.warn+"44",borderRadius:9,padding:"7px 12px",marginBottom:8,fontSize:11,color:C.warn}},"📋 Número nuevo — se registrará como cliente al guardar"),
    !blk&&ce("div",{style:{marginBottom:10,position:"relative"}},
      ce("label",{style:S.lbl},"Nombre completo *"),
      ce("input",{
        style:{...S.inp,borderColor:cn?C.ok:C.border},
        placeholder:"Carlos Pérez", value:cn,
        onChange:e2=>{
          setCn(e2.target.value);
          setClientFound3(null); // reset cuando escribe manualmente
        },
        onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}
      }),
      // Sugerencias de autocompletado por nombre
      cn.length>=2&&!clientFound3&&ce("div",{style:{
        position:"absolute",top:"100%",left:0,right:0,zIndex:50,
        background:"#1a2230",border:"1px solid "+C.border,borderRadius:10,
        maxHeight:180,overflowY:"auto",boxShadow:"0 4px 16px #000a",marginTop:2
      }},
        (()=>{
          const q=cn.toLowerCase().trim();
          const matches=clients.filter(c=>
            c.name.toLowerCase().includes(q) ||
            (c.phone||"").includes(q)
          ).slice(0,6);
          if(!matches.length) return ce("div",{style:{padding:"10px 13px",color:C.muted,fontSize:12}},"Sin coincidencias");
          return matches.map(c=>ce("div",{key:c.id,
            onMouseDown:e2=>{
              e2.preventDefault();
              setCn(c.name);
              setAph(c.phone||"");
              setAem(c.email||"");
              setClientFound3(c);
            },
            style:{padding:"9px 13px",cursor:"pointer",borderBottom:"1px solid "+C.border+"44",
              display:"flex",alignItems:"center",gap:9}
          },
            ce("div",{style:{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.cyan+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#000",flexShrink:0}},c.name[0]),
            ce("div",null,
              ce("div",{style:{fontSize:12,fontWeight:700}},c.name),
              ce("div",{style:{fontSize:10,color:C.muted}},c.phone||"",(c.visits?" · "+c.visits+" visitas":""))
            )
          ));
        })()
      )
    ),
    !blk&&ce(Field,{label:"Email (opcional)",val:aem,set:setAem,ph:"carlos@email.com",type:"email"}),
    ce(Field,{label:"Profesional",val:sf,set:v=>{setSf(v);setSv("");},opts:staffL.map(u=>({v:u.id,l:u.name}))}),
    !blk&&ce(Field,{label:"Servicio",val:sv,set:setSv,opts:svcOpts}),

    !wi&&ce(React.Fragment,null,
      ce(Field,{label:"Fecha",val:dt2,set:setDt2,type:"date"}),
      ce("div",{style:{marginBottom:10}},
      ce("label",{style:S.lbl},"Hora"),
      ce("select",{style:S.inp,value:tm2,onChange:e2=>setTm2(e2.target.value)},
        ce("option",{value:""},"Seleccionar..."),
        (()=>{
          if(!sf||!dt2) return SLOTS.map(s=>ce("option",{key:s,value:s},s));
          const selU4=staffL.find(u=>u.id===sf);
          if(!selU4) return SLOTS.map(s=>ce("option",{key:s,value:s},s));
          if(blk) return SLOTS.map(s=>ce("option",{key:s,value:s},s));
          const svcObj4=svcs.find(s=>s.name===sv)||null;
          const dur4=svcObj4?svcObj4.dur:30;
          const wS=pt(selU4.wStart||"09:00"), wE=pt(selU4.wEnd||"19:00");
          const lS=selU4.lunchStart?pt(selU4.lunchStart):null;
          const lE=selU4.lunchEnd?pt(selU4.lunchEnd):null;
          // Citas del día del barbero (excluyendo la actual si edita)
          const dayCitas=appts
            .filter(a=>(a.stId||a.st_id)===sf&&a.date===dt2&&a.status!=="cancelado"&&a.status!=="bloqueado"&&a.id!==(d.id||null))
            .map(a=>({start:pt(a.time),end:pt(a.time)+(a.dur||30)}));
          if(lS!==null&&lE!==null) dayCitas.push({start:lS,end:lE});
          dayCitas.sort((a,b)=>a.start-b.start);
          // Slots disponibles continuos de 5min
          const available=[];
          let cursor=wS;
          for(const blk of dayCitas){
            let t=cursor;
            while(t+dur4<=blk.start){available.push((Math.floor(t/60)<10?"0":"")+Math.floor(t/60)+":"+String(t%60).padStart(2,"0"));t+=5;}
            cursor=Math.max(cursor,blk.end);
          }
          let t=cursor;
          while(t+dur4<=wE){available.push((Math.floor(t/60)<10?"0":"")+Math.floor(t/60)+":"+String(t%60).padStart(2,"0"));t+=5;}
          return available.map(s=>ce("option",{key:s,value:s},s));
        })()
      )
    ),
      !blk&&ce(Field,{label:"Estado",val:st2,set:setSt2,opts:[{v:"pendiente",l:"Pendiente"},{v:"confirmado",l:"Confirmado"}]})
    ),
    !blk&&ce("div",{style:{background:"#1a2230",borderRadius:11,padding:"10px 13px",marginBottom:10,border:"1px solid "+C.border}},
      ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:customDur?10:0}},
        ce("div",null,
          ce("b",{style:{fontSize:12}},customDur?"⏱ Duración personalizada":"⏱ Duración del servicio"),
          ce("div",{style:{fontSize:10,color:C.muted,marginTop:2}},
            customDur ? manualDur+" min" : (()=>{const s=svcs.find(x=>x.name===sv);const selU5=staffL.find(u=>u.id===sf);const empC=selU5?.svcsConfig?.[s?.id];return s?(empC?.dur||s.dur)+" min":"30 min";})()
          )
        ),
        ce(Toggle,{val:customDur,onChange:()=>{
          if(!customDur){const s=svcs.find(x=>x.name===sv);const selU5=staffL.find(u=>u.id===sf);const empC=selU5?.svcsConfig?.[s?.id];setManualDur(s?(empC?.dur||s.dur):30);}
          setCustomDur(v=>!v);
        }})
      ),
      customDur&&ce("div",null,
        ce("div",{style:{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}},
          ce("button",{type:"button",onClick:()=>setManualDur(v=>Math.max(5,v-5)),
            style:{width:36,height:36,borderRadius:9,border:"none",background:C.err+"22",color:C.err,fontSize:18,fontWeight:900,cursor:"pointer"}},"-"),
          ce("div",{style:{fontSize:22,fontWeight:900,color:C.accent,minWidth:70,textAlign:"center"}},manualDur," min"),
          ce("button",{type:"button",onClick:()=>setManualDur(v=>Math.min(480,v+5)),
            style:{width:36,height:36,borderRadius:9,border:"none",background:C.ok+"22",color:C.ok,fontSize:18,fontWeight:900,cursor:"pointer"}},"+")
        ),
        ce("div",{style:{display:"flex",gap:4,marginTop:8,flexWrap:"wrap",justifyContent:"center"}},
          [5,10,15,20,25,30,40,45,60,90,120].map(m=>
            ce("button",{type:"button",key:m,onClick:()=>setManualDur(m),
              style:{padding:"4px 8px",borderRadius:8,border:"1px solid "+(manualDur===m?C.accent:C.border),
                background:manualDur===m?C.accent+"22":"transparent",color:manualDur===m?C.accent:C.muted,
                fontSize:11,cursor:"pointer",fontWeight:manualDur===m?700:400}
            },m+"m")
          )
        )
      )
    ),
    blk&&tm2&&ce("div",{style:{background:"#1a2230",borderRadius:11,padding:"12px 13px",marginBottom:10,border:"1px solid "+C.border}},
      ce("b",{style:{fontSize:12,color:C.err,display:"block",marginBottom:10}},"🔒 Duración del bloqueo"),
      ce("div",{style:{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginBottom:8}},
        ce("button",{type:"button",onClick:()=>setBlkDur(v=>Math.max(5,v-5)),
          style:{width:36,height:36,borderRadius:9,border:"none",background:C.err+"22",color:C.err,fontSize:18,fontWeight:900,cursor:"pointer"}},"-"),
        ce("div",{style:{fontSize:22,fontWeight:900,color:C.err,minWidth:70,textAlign:"center"}},blkDur," min"),
        ce("button",{type:"button",onClick:()=>setBlkDur(v=>Math.min(480,v+5)),
          style:{width:36,height:36,borderRadius:9,border:"none",background:C.ok+"22",color:C.ok,fontSize:18,fontWeight:900,cursor:"pointer"}},"+")
      ),
      ce("div",{style:{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}},
        [15,30,45,60,90,120].map(m=>
          ce("button",{type:"button",key:m,onClick:()=>setBlkDur(m),
            style:{padding:"4px 8px",borderRadius:8,border:"1px solid "+(blkDur===m?C.err:C.border),
              background:blkDur===m?C.err+"22":"transparent",color:blkDur===m?C.err:C.muted,
              fontSize:11,cursor:"pointer",fontWeight:blkDur===m?700:400}
          },m+"m")
        )
      ),
      tm2&&ce("div",{style:{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}},
        "Bloqueado: ",tm2," → ",(()=>{
          const end=pt(tm2)+blkDur;
          return (Math.floor(end/60)<10?"0":"")+Math.floor(end/60)+":"+String(end%60).padStart(2,"0");
        })()
      )
    ),
    blk&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"10px 12px",fontSize:12,color:C.err}},"🔒 Este slot quedará bloqueado."),
    ae&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"55",borderRadius:9,padding:"9px 12px",fontSize:12,color:C.err,marginTop:8}},"⚠️ ",ae),
    load2&&ce("div",{style:{textAlign:"center",fontSize:12,color:C.muted,marginTop:8}},"⏳ Guardando...")
  );
}

// ─── ADMIN ───────────────────────────────────────────────────────
export function Admin({ user, users, setUsers, svcs, setSvcs, prods, setProds, clients, setClients,
                        appts, setAppts, sales, setSales, prodSales = [], setProdSales = ()=>{},
                        cfg, setCfg, onLogout }) {
  if (!user) return null;
  const isAdmin   = user.role === "admin";
  const stampsOn  = cfg?.stampsOn;

  // ── Tabs ──
  const allTabs = [
    {id:"agenda",   icon:"📅", label:"Agenda"},
    {id:"clientes", icon:"👥", label:"Clientes"},
    {id:"fidelidad",icon:"🎫", label:"Sellos"},
    {id:"catalogo", icon:"🛒", label:"Catálogo"},
    {id:"caja",     icon:"💰", label:"Caja"},
    {id:"reportes", icon:"📊", label:"Reportes"},
    {id:"config",   icon:"⚙️", label:"Config"}
  ];
  const allowed     = RTABS[user.role] || [];
  const companyMods = window._companyModules || null;
  const MOD_MAP     = { fidelidad:"sellos", catalogo:"catalogo", caja:"caja", reportes:"reportes" };
  const tabs = allTabs.filter(t => {
    if (!allowed.includes(t.id)) return false;
    if (!companyMods) return true;
    if (["agenda","clientes","config"].includes(t.id)) return true;
    return companyMods[MOD_MAP[t.id]||t.id] === true;
  });

  const [tab,      setTab]      = useState(tabs[0]?.id || "agenda");
  const [sub,      setSub]      = useState(user.role==="vendedor"?"productos":"servicios");
  const [cajSub,   setCajSub]   = useState("servicios");
  const [cajFilt,  setCajFilt]  = useState("todas");
  const [mdl,      setMdl]      = useState(null);
  const [schUser,  setSchUser]  = useState(null);
  const [adet,     setAdet]     = useState(null);
  const [nslot,    setNslot]    = useState(null);
  const [abonoMdl,    setAbonoMdl]    = useState(null);
  const [reschedMdl,  setReschedMdl]  = useState(null); // cita a reagendar
  const [prodSearch,setProdSearch] = useState("");
  const [cliSearch, setCliSearch]  = useState("");
  const [svcSearch, setSvcSearch]  = useState("");
  const [notifs,   setNotifs]   = useState([]);
  const [showN,    setShowN]    = useState(false);
  const staffL = users.filter(u=>u.role==="barbero"||u.role==="tatuador");
  const initSt = isAdmin ? null : user.id; // Admin: Todos por defecto
  const [selSt, setSelSt] = useState(initSt);

  // ── Notify check ──
  useEffect(()=>{
    if (user.role!=="admin"&&user.role!=="recepcionista") return;
    const lastCheck = localStorage.getItem("taseca_lnc")||"0";
    async function checkN(){
      try {
        const all = await DB.all("notifs").catch(()=>[]);
        const mine = all.filter(n=>n.forRoles?.includes(user.role)&&!n.read&&n.id>lastCheck);
        if (mine.length>0) { setNotifs(mine); setShowN(true); localStorage.setItem("taseca_lnc",mine[mine.length-1].id); }
      } catch {}
    }
    checkN(); const iv=setInterval(checkN,60000); return ()=>clearInterval(iv);
  },[]);


  // ─── VALIDACIÓN CENTRAL DE CONFLICTOS ────────────────────────
  function checkConflict(stId, date, time, dur, excludeId) {
    const slotStart = pt(time);
    const slotEnd   = slotStart + (dur || 30);
    // Verificar contra otras citas
    const citaConflict = appts.some(a => {
      if (excludeId && a.id === excludeId) return false;
      if ((a.stId||a.st_id) !== stId || a.date !== date) return false;
      if (a.status === "cancelado") return false;
      const aStart = pt(a.time);
      const aEnd   = aStart + (a.dur || 30);
      return slotStart < aEnd && slotEnd > aStart;
    });
    if (citaConflict) return "⚠️ Hay una cita que se superpone en ese horario.";
    // Verificar almuerzo
    const staffUser = users.find(u => u.id === stId);
    if (staffUser?.lunchStart && staffUser?.lunchEnd) {
      const lStart = pt(staffUser.lunchStart);
      const lEnd   = pt(staffUser.lunchEnd);
      if (slotStart < lEnd && slotEnd >= lStart)
        return "⚠️ Ese horario invade el almuerzo de " + staffUser.name + " (" + staffUser.lunchStart + "–" + staffUser.lunchEnd + ").";
    }
    // Verificar bloqueo de día
    if (staffUser?.blocks?.[date] === true)
      return "⚠️ " + staffUser.name + " tiene ese día bloqueado.";
    return null; // sin conflicto
  }

  async function toggleStamps(){
    const upd={...cfg,stampsOn:!stampsOn}; setCfg(upd);
    await DB.save("config",upd.id||(window._companyId?"cfg_"+window._companyId:"cfg"),upd);
  }

  function closeM(){ setMdl(null); }

  // ── Sub-modals ──
  function SvcMdl(){
    const d=mdl?.d||{};
    const [n,setN]=useState(d.name||""); const [pr,setPr]=useState(d.price||"");
    const [du,setDu]=useState(d.dur||30); const [cat,setCat]=useState(d.cat||"barberia");
    async function save(){
      if(!n||!pr) return;
      const item={id:d.id||"s"+Date.now(),name:n,price:Number(pr),dur:Number(du),cat};
      d.id?setSvcs(x=>x.map(s=>s.id===d.id?item:s)):setSvcs(x=>[...x,item]);
      closeM(); try{await DB.save("services",item.id,item);}catch(e){console.error(e);}
    }
    return ce(Mdl,{title:d.id?"Editar Servicio":"Nuevo Servicio",close:closeM,save},
      ce(Field,{label:"Nombre",val:n,set:setN,ph:"Corte clásico"}),
      ce(Field,{label:"Precio ($)",val:pr,set:setPr,type:"number",ph:"15"}),
      ce(Field,{label:"Duración (min)",val:du,set:setDu,type:"number",ph:"30"}),
      ce(Field,{label:"Categoría",val:cat,set:setCat,opts:[{v:"barberia",l:"Barbería"},{v:"tatuaje",l:"Tatuaje"}]})
    );
  }

  function ProdMdl(){
    const d=mdl?.d||{};
    const [n,setN]=useState(d.name||""); const [pr,setPr]=useState(d.price||""); const [st,setSt]=useState(d.stock||0);
    async function save(){
      if(!n||!pr) return;
      const item={id:d.id||"p"+Date.now(),name:n,price:Number(pr),stock:Number(st)};
      d.id?setProds(x=>x.map(s=>s.id===d.id?item:s)):setProds(x=>[...x,item]);
      closeM(); try{await DB.save("products",item.id,item);}catch(e){console.error(e);alert("Error: "+e.message);}
    }
    return ce(Mdl,{title:d.id?"Editar Producto":"Nuevo Producto",close:closeM,save},
      ce(Field,{label:"Nombre",val:n,set:setN,ph:"Pomada fijadora"}),
      ce(Field,{label:"Precio ($)",val:pr,set:setPr,type:"number",ph:"10"}),
      ce(Field,{label:"Stock",val:st,set:setSt,type:"number",ph:"20"})
    );
  }

  function CliMdl(){
    const d=mdl?.d||{};
    const [n,setN]=useState(d.name||""); const [ph,setPh]=useState(d.phone||"");
    const [em,setEm]=useState(d.email||""); const [bd,setBd]=useState(d.bday||"");
    const [cerr,setCerr]=useState("");
    async function save(){
      setCerr("");
      if(!n){setCerr("Nombre obligatorio");return;}
      if(ph&&!vPhone(ph)){setCerr("Teléfono debe tener 10 dígitos");return;}
      const item={id:d.id||"c"+Date.now(),name:n,phone:ph,email:em,bday:bd,
        visits:d.visits||0,last:d.last||"-",stamps:d.stamps||0,pts:d.pts||0,since:d.since||today()};
      d.id?setClients(x=>x.map(s=>s.id===d.id?item:s)):setClients(x=>[...x,item]);
      closeM(); try{await DB.save("clients",item.id,item);}catch(e){console.error(e);}
    }
    return ce(Mdl,{title:d.id?"Editar Cliente":"Nuevo Cliente",close:closeM,save},
      ce(Field,{label:"Nombre completo",val:n,set:setN,ph:"Carlos Méndez"}),
      ce(PhoneInput,{val:ph,set:setPh}),
      ce(Field,{label:"Email (opcional)",val:em,set:setEm,ph:"carlos@email.com",type:"email"}),
      ce(Field,{label:"Fecha de cumpleaños (opcional)",val:bd,set:setBd,type:"date"}),
      cerr&&ce("div",{style:{color:C.err,fontSize:12,marginBottom:8}},"⚠️ ",cerr)
    );
  }

  function UserMdl(){
    const d=mdl?.d||{};
    const [n,setN]=useState(d.name||""); const [r,setR]=useState(d.role||"barbero");
    const [e,setE]=useState(d.email||""); const [pi,setPi]=useState(d.pin||"");
    const [sc2,setSc2]=useState(d.svcsConfig||{});
    function toggleSvc(id){setSc2(p=>{const n2={...p};n2[id]={on:true,price:0,dur:30,...n2[id],on:!(n2[id]?.on)};return n2;});}
    function setSvcField(id,field,val){setSc2(p=>{const n2={...p};n2[id]={on:true,price:0,dur:30,...n2[id]};n2[id][field]=val;return n2;});}
    async function save(){
      if(!n) return;
      let hashedPin=pi;
      if(pi&&pi.length<=6){try{const enc=new TextEncoder();const buf=await crypto.subtle.digest("SHA-256",enc.encode(pi));hashedPin=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");}catch{}}
      const item={...(d.id?d:{id:"u"+Date.now(),photo:null,workDays:[1,2,3,4,5],wStart:"09:00",wEnd:"19:00",blocks:{}}),name:n,role:r,email:e,pin:hashedPin,svcsConfig:sc2};
      d.id?setUsers(x=>x.map(u=>u.id===d.id?item:u)):setUsers(x=>[...x,item]);
      closeM(); try{await DB.save("users",item.id,item);}catch(e2){console.error(e2);alert("Error: "+e2.message);}
    }
    return ce(Mdl,{title:d.id?"Editar Usuario":"Nuevo Usuario",close:closeM,save},
      ce(Field,{label:"Nombre",val:n,set:setN,ph:"Juan Barbero"}),
      ce(Field,{label:"Rol",val:r,set:setR,opts:[{v:"admin",l:"Administrador"},{v:"barbero",l:"Barbero"},{v:"tatuador",l:"Tatuador/a"},{v:"recepcionista",l:"Recepcionista"},{v:"vendedor",l:"Vendedor"}]}),
      ce(Field,{label:"Email",val:e,set:setE,ph:"usuario@shop.com"}),
      ce(Field,{label:"PIN (4 dígitos)",val:pi,set:setPi,type:"number",ph:"1234"}),
      (r==="barbero"||r==="tatuador")&&ce("div",null,
        ce("div",{style:{borderTop:"1px solid "+C.border,margin:"14px 0 10px"}}),
        ce("b",{style:{fontSize:12,color:C.accent,display:"block",marginBottom:10}},"✂️ Servicios que presta"),
        svcs.map(s=>{
          const cfg2=sc2[s.id]||{on:false,price:s.price,dur:s.dur};
          return ce("div",{key:s.id,style:{background:cfg2.on?C.accent+"11":C.card,border:"1px solid "+(cfg2.on?C.accent+"44":C.border),borderRadius:11,padding:"10px 12px",marginBottom:8}},
            ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:cfg2.on?8:0}},
              ce("div",null,ce("b",{style:{fontSize:13}},s.name),ce("div",{style:{fontSize:10,color:C.muted}},"Base: $",s.price," · ",s.dur,"min")),
              ce(Toggle,{val:cfg2.on,onChange:()=>toggleSvc(s.id)})
            ),
            cfg2.on&&ce("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
              ce("div",null,ce("label",{style:S.lbl},"Precio ($)"),ce("input",{style:S.inp,type:"number",value:cfg2.price||"",onChange:e2=>setSvcField(s.id,"price",Number(e2.target.value)),onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}})),
              ce("div",null,ce("label",{style:S.lbl},"Duración (min)"),ce("input",{style:S.inp,type:"number",value:cfg2.dur||"",onChange:e2=>setSvcField(s.id,"dur",Number(e2.target.value)),onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}}))
            )
          );
        })
      )
    );
  }

  function AbonoMdl(){
    if(!abonoMdl) return null;
    const s=abonoMdl;
    const [amt,setAmt]=useState(""); const [note,setNote]=useState(""); const [met,setMet]=useState("efectivo"); const [errA,setErrA]=useState("");
    const abonos=s.abonos||[]; const totalAb=abonos.reduce((a,ab)=>a+ab.monto,0); const pendiente=s.pendiente!==undefined?s.pendiente:s.total-totalAb;
    async function saveAbono(){
      setErrA(""); const monto=Number(amt);
      if(!monto||monto<=0){setErrA("Ingresa un monto válido");return;}
      if(monto>pendiente){setErrA("Supera el saldo ($"+pendiente+")");return;}
      const newAbono={id:"ab"+Date.now(),monto,fecha:today(),met,nota:note};
      const newAbonos=[...abonos,newAbono]; const newPend=pendiente-monto;
      const upd={...s,abonos:newAbonos,pendiente:newPend,method:newPend<=0?"efectivo":"debe",paidDate:newPend<=0?today():null};
      if(s._table==="product_sales") setProdSales(x=>x.map(ss=>ss.id===s.id?upd:ss));
      else setSales(x=>x.map(ss=>ss.id===s.id?upd:ss));
      try{
        const tabla=s._table==="product_sales"?"product_sales":"sales";
        await fetch(window.SB_URL+"/rest/v1/"+tabla+"?id=eq."+encodeURIComponent(upd.id),{method:"PATCH",headers:{"Content-Type":"application/json","apikey":window.SB_KEY,"Authorization":"Bearer "+window.SB_KEY},body:JSON.stringify({abonos:upd.abonos,pendiente:Number(upd.pendiente),method:upd.method,paid_date:upd.paidDate||null})});
      }catch(e2){console.error(e2);}
      setAbonoMdl(null);
    }
    return ce("div",{style:S.ov,onClick:()=>setAbonoMdl(null)},
      ce("div",{style:S.mb,onClick:e2=>e2.stopPropagation()},
        ce("div",{style:{...S.row,marginBottom:14}},ce("b",{style:{fontSize:15,color:C.warn}},"💵 Registrar Abono"),ce("button",{type:"button",onClick:()=>setAbonoMdl(null),style:{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}},"✕")),
        ce("div",{style:{background:C.warn+"11",border:"1px solid "+C.warn+"33",borderRadius:11,padding:"11px 13px",marginBottom:12}},
          ce("div",{style:{...S.row,marginBottom:5}},ce("span",{style:{fontSize:12,color:C.muted}},"Cliente"),ce("b",{style:{fontSize:12}},s.client)),
          ce("div",{style:{...S.row,marginBottom:5}},ce("span",{style:{fontSize:12,color:C.muted}},"Total"),ce("b",{style:{color:C.warn}},"$",s.total)),
          ce("div",{style:{...S.row}},ce("b",{style:{fontSize:13,color:C.warn}},"Pendiente"),ce("b",{style:{fontSize:18,color:C.warn}},"$",pendiente))
        ),
        ce("label",{style:S.lbl},"Monto del abono"),
        ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:7}},
          [Math.round(pendiente*.25),Math.round(pendiente*.5),Math.round(pendiente*.75),pendiente].map(v=>
            ce("button",{type:"button",key:v,onClick:()=>setAmt(String(v)),style:{padding:"6px 2px",borderRadius:8,border:"1px solid "+C.warn+"44",background:Number(amt)===v?C.warn+"22":"transparent",color:Number(amt)===v?C.warn:C.muted,fontSize:10,cursor:"pointer"}},v===pendiente?"Total":"$"+v)
          )
        ),
        ce("input",{style:{...S.inp,marginBottom:8},type:"number",placeholder:"Monto $",value:amt,onChange:e2=>setAmt(e2.target.value),onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}}),
        ce(Field,{label:"Nota adicional (opcional)",val:note,set:setNote,ph:"Observaciones..."}),
        errA&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:8}},"⚠️ ",errA),
        ce("div",{style:{display:"flex",gap:10,marginTop:4}},
          ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:()=>setAbonoMdl(null)},"Cancelar"),
          s.phone&&ce("button",{type:"button",style:{background:"#25D366",border:"none",borderRadius:10,padding:"9px 12px",fontSize:12,color:"#fff",fontWeight:700,cursor:"pointer"},
            onClick:()=>{const msg="Hola "+s.client+" 👋\nTienes un saldo pendiente de $"+pendiente;const phone=s.phone.replace(/\D/g,"");window.open("https://wa.me/"+(phone.length===10?"57"+phone:phone)+"?text="+encodeURIComponent(msg),"_blank");}
          },"📱 WA"),
          ce("button",{type:"button",style:{...S.btn("gold"),flex:2,color:"#000"},onClick:saveAbono},"Registrar abono")
        )
      )
    );
  }


  function SvcSaleMdl(){
    const [cl,setCl]=useState(""); const [ph,setPh]=useState(""); const [sv,setSv]=useState("");
    const [mt,setMt]=useState("efectivo"); const [dp,setDp]=useState(""); const [err2,setErr2]=useState("");
    const [clientFound2,setClientFound2]=useState(null);
    function handlePhone(v){
      const digits=v.replace(/\D/g,"").slice(0,10); setPh(digits);
      if(digits.length===10){const f=clients.find(c=>c.phone===digits);setClientFound2(f||null);if(f)setCl(f.name);}
      else setClientFound2(null);
    }
    const svcObj = svcs.find(s=>s.name===sv);
    const total  = svcObj ? svcObj.price : 0;
    async function save(){
      setErr2("");
      if(!cl.trim()){setErr2("Nombre del cliente obligatorio");return;}
      if(!sv){setErr2("Selecciona un servicio");return;}
      if(mt==="debe"&&!dp){setErr2("Selecciona fecha de pago");return;}
      const item={id:"v"+Date.now(),client:cl.trim(),phone:ph,items:[sv],total,
        method:mt,dueDate:mt==="debe"?dp:null,date:today(),abonos:[],pendiente:mt==="debe"?total:0};
      setSales(x=>[...x,item]); closeM();
      try{ await DB.save("sales",item.id,item); }catch(e2){console.error(e2);}
    }
    return ce("div",{style:S.ov,onClick:closeM},
      ce("div",{style:S.mb,onClick:e2=>e2.stopPropagation()},
        ce("div",{style:{...S.row,marginBottom:14}},
          ce("b",{style:{fontSize:15,color:C.accent}},"✂️ Registrar Venta de Servicio"),
          ce("button",{type:"button",onClick:closeM,style:{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}},"✕")
        ),
        ce("div",{style:{marginBottom:10}},
          ce("label",{style:S.lbl},"Teléfono (busca cliente automáticamente)"),
          ce("input",{style:{...S.inp,borderColor:ph.length>0?ph.length===10?C.ok:C.err:C.border},
            type:"tel",placeholder:"3001234567",value:ph,
            onChange:e2=>handlePhone(e2.target.value),
            onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}
          })
        ),
        clientFound2&&ce("div",{style:{background:C.ok+"18",border:"1px solid "+C.ok+"44",borderRadius:9,padding:"9px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:9}},
          ce("div",{style:{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.cyan+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#000",flexShrink:0}},clientFound2.name[0]),
          ce("div",null,ce("div",{style:{fontWeight:700,fontSize:12,color:C.ok}},"✓ "+clientFound2.name),ce("div",{style:{fontSize:11,color:C.muted}},clientFound2.visits||0," visitas"))
        ),
        !clientFound2&&ph.length===10&&ce("div",{style:{background:C.warn+"18",border:"1px solid "+C.warn+"44",borderRadius:9,padding:"7px 12px",marginBottom:10,fontSize:11,color:C.warn}},"📋 Número nuevo — ingresa el nombre manualmente"),
        ce(Field,{label:"Nombre del cliente *",val:cl,set:setCl,ph:"Carlos Pérez"}),
        ce(Field,{label:"Servicio *",val:sv,set:setSv,opts:svcs.map(s=>({v:s.name,l:s.name+" — $"+s.price}))}),
        sv&&ce("div",{style:{background:C.accent+"11",border:"1px solid "+C.accent+"33",borderRadius:10,padding:"10px 13px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          ce("span",{style:{fontSize:13,color:C.muted}},"Total"),
          ce("b",{style:{fontSize:20,color:C.accent}},"$",total)
        ),
        ce("div",{style:{marginBottom:10}},
          ce("label",{style:S.lbl},"Método de pago"),
          ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}},
            [["efectivo","💵 Efectivo",C.ok],["tarjeta","💳 Tarjeta",C.cyan],["transferencia","🏦 Transferencia","#3498db"],["debe","⏳ Debe",C.warn]].map(([id,lbl,col])=>
              ce("button",{type:"button",key:id,onClick:()=>setMt(id),
                style:{padding:"9px",borderRadius:10,border:"1.5px solid "+(mt===id?col:C.border),
                  background:mt===id?col+"22":"transparent",color:mt===id?col:C.muted,
                  fontSize:12,fontWeight:mt===id?700:400,cursor:"pointer"}},lbl)
            )
          )
        ),
        mt==="debe"&&ce("div",{style:{background:C.warn+"11",border:"1px solid "+C.warn+"44",borderRadius:11,padding:"11px 13px",marginBottom:10}},
          ce("div",{style:{fontSize:12,color:C.warn,fontWeight:700,marginBottom:8}},"⏳ Pago pendiente"),
          ce(Field,{label:"Fecha límite de pago",val:dp,set:setDp,type:"date"})
        ),
        err2&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:8}},"⚠️ ",err2),
        ce("div",{style:{display:"flex",gap:10,marginTop:4}},
          ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:closeM},"Cancelar"),
          ce("button",{type:"button",style:{...S.btn("gold"),flex:2,color:"#000"},onClick:save},"Guardar venta")
        )
      )
    );
  }

  function SaleMdl(){
    const [cl,setCl]=useState(""); const [ph,setPh]=useState(""); const [mt,setMt]=useState("efectivo");
    const [dp,setDp]=useState(""); const [selProds,setSelProds]=useState([]); const [search,setSearch]=useState("");
    const [showList,setShowList]=useState(false); const [err2,setErr2]=useState(""); const [clientFound2,setClientFound2]=useState(null);
    const total=selProds.reduce((a,x)=>a+x.price*x.qty,0);
    const filteredProds=prods.filter(pr=>!search||pr.name.toLowerCase().includes(search.toLowerCase()));
    function handlePhone(v){
      const digits=v.replace(/\D/g,"").slice(0,10); setPh(digits);
      if(digits.length===10){const f=clients.find(c=>c.phone===digits);setClientFound2(f||null);if(f)setCl(f.name);}
      else setClientFound2(null);
    }
    function addProd(pr){
      const stock=pr.stock!==undefined?pr.stock:999;
      if(stock<=0){setErr2("Sin stock: "+pr.name);return;}
      setSelProds(prev=>{
        const ex=prev.find(x=>x.id===pr.id);
        if(ex){if(ex.qty>=stock){setErr2("Stock insuficiente: "+stock);return prev;}return prev.map(x=>x.id===pr.id?{...x,qty:x.qty+1}:x);}
        return [...prev,{id:pr.id,name:pr.name,price:pr.price,qty:1,stock}];
      });
      setSearch(""); setShowList(false);
    }
    function changeQty(id,delta){setSelProds(prev=>prev.map(x=>x.id!==id?x:x.qty+delta<=0?null:{...x,qty:x.qty+delta}).filter(Boolean));}
    async function save(){
      setErr2("");
      if(!cl.trim()){setErr2("Nombre del cliente obligatorio");return;}
      if(selProds.length===0){setErr2("Agrega al menos un producto");return;}
      if(mt==="debe"&&!dp){setErr2("Selecciona fecha de pago");return;}
      const item={id:"v"+Date.now(),client:cl.trim(),phone:ph,
        items:selProds.map(x=>x.qty>1?x.name+" x"+x.qty:x.name),
        total,method:mt,dueDate:mt==="debe"?dp:null,date:today(),abonos:[],pendiente:mt==="debe"?total:0};
      setProdSales(x=>[...x,item]); closeM();
      try{
        await DB.save("product_sales",item.id,item);
        const soldIds={}; selProds.forEach(sp=>{soldIds[sp.id]=sp.qty;});
        setProds(prods.map(pr=>{if(!soldIds[pr.id])return pr;const upd={...pr,stock:Math.max(0,(pr.stock||0)-soldIds[pr.id])};DB.save("products",pr.id,upd).catch(()=>{});return upd;}));
      }catch(e2){console.error(e2);}
    }
    return ce("div",{style:S.ov,onClick:closeM},
      ce("div",{style:S.mb,onClick:e2=>e2.stopPropagation()},
        ce("div",{style:{...S.row,marginBottom:14}},ce("b",{style:{fontSize:15,color:C.accent}},"💰 Nueva Venta"),ce("button",{type:"button",onClick:closeM,style:{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}},"✕")),
        ce("div",{style:{marginBottom:10}},
          ce("label",{style:S.lbl},"Telefono"),
          ce("input",{style:S.inp,type:"tel",placeholder:"3001234567",value:ph,onChange:e2=>handlePhone(e2.target.value),onKeyDown:e2=>{if(e2.key==="Enter")e2.preventDefault();}})
        ),
        clientFound2&&ce("div",{style:{background:C.ok+"18",border:"1px solid "+C.ok+"44",borderRadius:9,padding:"9px 12px",marginBottom:10}},ce("div",{style:{fontWeight:700,fontSize:12,color:C.ok}},"✓ ",clientFound2.name)),
        ce(Field,{label:"Nombre del cliente",val:cl,set:setCl,ph:"Carlos Perez"}),
        ce("div",{style:{marginBottom:10}},
          ce("label",{style:S.lbl},"Productos"),
          ce("div",{style:{position:"relative"}},
            ce("input",{style:S.inp,placeholder:"Buscar producto...",value:search,onChange:e2=>{setSearch(e2.target.value);setShowList(true);},onFocus:()=>setShowList(true),onBlur:()=>setTimeout(()=>setShowList(false),200)}),
            showList&&ce("div",{style:{background:"#1a2230",border:"1px solid "+C.border,borderRadius:10,marginTop:4,maxHeight:200,overflowY:"auto",position:"relative",zIndex:50}},
              filteredProds.length===0&&ce("div",{style:{padding:12,textAlign:"center",color:C.muted,fontSize:12}},"Sin productos"),
              filteredProds.map(pr=>ce("div",{key:pr.id,onMouseDown:()=>addProd(pr),style:{padding:"9px 13px",cursor:"pointer",borderBottom:"1px solid "+C.border+"44",display:"flex",justifyContent:"space-between"}},
                ce("span",{style:{fontSize:13}},pr.name),ce("b",{style:{color:C.accent}},"$",pr.price)
              ))
            )
          ),
          selProds.length>0&&ce("div",{style:{background:"#0d1520",border:"1px solid "+C.border,borderRadius:11,padding:8,marginTop:8}},
            selProds.map(x=>ce("div",{key:x.id,style:{display:"flex",alignItems:"center",gap:7,marginBottom:5,background:C.card,borderRadius:8,padding:"6px 9px"}},
              ce("div",{style:{flex:1}},ce("span",{style:{fontSize:12,fontWeight:700}},x.name),ce("span",{style:{fontSize:11,color:C.accent,marginLeft:7}},"$",x.price)),
              ce("div",{style:{display:"flex",alignItems:"center",gap:3}},
                ce("button",{type:"button",onClick:()=>changeQty(x.id,-1),style:{width:22,height:22,borderRadius:6,border:"none",background:C.border,color:C.text,cursor:"pointer"}},"−"),
                ce("span",{style:{fontSize:12,fontWeight:700,minWidth:16,textAlign:"center"}},x.qty),
                ce("button",{type:"button",onClick:()=>changeQty(x.id,1),style:{width:22,height:22,borderRadius:6,border:"none",background:C.border,color:C.text,cursor:"pointer"}},"+")
              ),
              ce("b",{style:{color:C.accent,fontSize:12,minWidth:44,textAlign:"right"}},"$",x.price*x.qty),
              ce("button",{type:"button",onClick:()=>setSelProds(p=>p.filter(s=>s.id!==x.id)),style:{background:"none",border:"none",color:C.err,cursor:"pointer"}},"✕")
            )),
            ce("div",{style:{display:"flex",justifyContent:"space-between",borderTop:"1px solid "+C.border,paddingTop:7,marginTop:3}},
              ce("b",{style:{fontSize:13,color:C.muted}},"Total"),ce("b",{style:{fontSize:18,color:C.accent}},"$",total))
          )
        ),
        ce("div",{style:{marginBottom:10}},
          ce("label",{style:S.lbl},"Metodo de pago"),
          ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}},
            [["efectivo","💵 Efectivo",C.ok],["tarjeta","💳 Tarjeta",C.cyan],["transferencia","🏦 Transferencia","#3498db"],["debe","⏳ Debe",C.warn]].map(([id,lbl,col])=>
              ce("button",{type:"button",key:id,onClick:()=>setMt(id),style:{padding:9,borderRadius:10,border:"1.5px solid "+(mt===id?col:C.border),background:mt===id?col+"22":"transparent",color:mt===id?col:C.muted,fontSize:12,fontWeight:mt===id?700:400,cursor:"pointer"}},lbl)
            )
          )
        ),
        mt==="debe"&&ce(Field,{label:"Fecha limite de pago",val:dp,set:setDp,type:"date"}),
        err2&&ce("div",{style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:8}},"⚠️ ",err2),
        ce("div",{style:{display:"flex",gap:10,marginTop:4}},
          ce("button",{type:"button",style:{...S.btn("ghost"),flex:1},onClick:closeM},"Cancelar"),
          ce("button",{type:"button",style:{...S.btn("gold"),flex:2,color:"#000"},onClick:save},"Guardar venta")
        )
      )
    );
  }

  // ─── REAGENDAR MODAL ─────────────────────────────────────────
  function RescheduleMdl() {
    if (!reschedMdl) return null;
    const a = reschedMdl;
    const [date2, setDate2] = useState(a.date);
    const [time2, setTime2] = useState(a.time);
    const [saving, setSaving] = useState(false);
    const [err2,   setErr2]   = useState("");

    // Botones rápidos de ajuste de hora
    const QUICK = [-15,-10,-5,5,10,15];

    function adjustTime(mins) {
      const [h,m] = time2.split(":").map(Number);
      let total = h*60 + m + mins;
      total = Math.max(8*60, Math.min(20*60, total));
      // NO snap — respetar exactamente los minutos indicados
      const nh = Math.floor(total/60);
      const nm = total%60;
      setTime2((nh<10?"0":"")+nh+":"+String(nm).padStart(2,"0"));
    }

    // Verificar conflictos usando función central
    function hasConflict(newDate, newTime) {
      return !!checkConflict(a.stId||a.st_id, newDate, newTime, a.dur||30, a.id);
    }
    function conflictMsg(newDate, newTime) {
      return checkConflict(a.stId||a.st_id, newDate, newTime, a.dur||30, a.id);
    }

    async function save() {
      setErr2("");
      const conflMsg = conflictMsg(date2, time2);
      if (conflMsg) {
        setErr2(conflMsg);
        return;
      }
      setSaving(true);
      try {
        const upd = {...a, date:date2, time:time2};
        setAppts(x => x.map(ap => ap.id===a.id ? upd : ap));
        await DB.save("appointments", a.id, upd);
        setReschedMdl(null);
        setAdet(null);
      } catch(e) {
        setErr2("Error al guardar: " + e.message);
      }
      setSaving(false);
    }

    const conflict = hasConflict(date2, time2);

    return ce("div", {style:S.ov, onClick:()=>setReschedMdl(null)},
      ce("div", {style:S.mb, onClick:e=>e.stopPropagation()},
        ce("div", {style:{...S.row, marginBottom:14}},
          ce("b", {style:{fontSize:15, color:C.accent}}, "📅 Reagendar cita"),
          ce("button", {type:"button", onClick:()=>setReschedMdl(null),
            style:{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}, "✕")
        ),
        // Info de la cita
        ce("div", {style:{background:C.accent+"11",border:"1px solid "+C.accent+"33",borderRadius:11,padding:"10px 13px",marginBottom:14}},
          ce("b",   {style:{fontSize:13}}, a.client),
          ce("div", {style:{color:C.muted,fontSize:11,marginTop:2}}, a.svc, " · ", a.dur||30, " min"),
          ce("div", {style:{color:C.muted,fontSize:11}}, "Profesional: ", users.find(u=>u.id===(a.stId||a.st_id))?.name||"")
        ),
        // Fecha
        ce("div", {style:{marginBottom:12}},
          ce("label", {style:S.lbl}, "Fecha"),
          ce("input", {style:S.inp, type:"date", value:date2, onChange:e=>setDate2(e.target.value)})
        ),
        // Hora actual + ajuste rápido
        ce("label", {style:S.lbl}, "Hora"),
        ce("div", {style:{background:"#161e2a",borderRadius:12,padding:"12px",marginBottom:12}},
          // Hora actual grande
          ce("div", {style:{textAlign:"center",marginBottom:12}},
            ce("div", {style:{fontSize:36,fontWeight:900,color:C.accent,letterSpacing:4}}, time2),
            ce("div", {style:{fontSize:11,color:C.muted,marginTop:2}}, "hora actual")
          ),
          // Botones rápidos
          ce("div", {style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}},
            QUICK.map(q =>
              ce("button", {type:"button", key:q, onClick:()=>adjustTime(q),
                style:{
                  padding:"8px 4px", borderRadius:9, border:"1.5px solid "+(q<0?C.err+"44":C.ok+"44"),
                  background: q<0?C.err+"11":C.ok+"11",
                  color: q<0?C.err:C.ok,
                  fontSize:13, fontWeight:700, cursor:"pointer"
                }
              }, (q>0?"+":"")+q+" min")
            )
          ),
          // O elegir slot exacto
          ce("div", {style:{borderTop:"1px solid "+C.border,paddingTop:10}},
            ce("label", {style:{...S.lbl,marginBottom:6}}, "O elige hora exacta"),
            ce("select", {style:S.inp, value:time2, onChange:e=>setTime2(e.target.value)},
              SLOTS.map(s => ce("option",{key:s,value:s},s))
            )
          )
        ),
        // Conflicto warning
        conflictMsg(date2,time2) && ce("div", {
          style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"9px 12px",marginBottom:10,fontSize:12,color:C.err}
        }, conflictMsg(date2,time2)),
        err2 && ce("div", {style:{background:C.err+"22",border:"1px solid "+C.err+"44",borderRadius:9,padding:"8px 11px",fontSize:12,color:C.err,marginBottom:8}}, err2),
        ce("div", {style:{display:"flex",gap:10,marginTop:4}},
          ce("button", {type:"button", style:{...S.btn("ghost"),flex:1}, onClick:()=>setReschedMdl(null)}, "Cancelar"),
          ce("button", {type:"button",
            style:{...S.btn(!!conflictMsg(date2,time2)?"ghost":"gold"), flex:2, color:"#000", opacity:saving||!!conflictMsg(date2,time2)?0.5:1},
            disabled:saving||!!conflictMsg(date2,time2), onClick:save
          }, saving?"⏳ Guardando...":"✅ Guardar")
        )
      )
    );
  }

  async function confirmAppt(a){
    const upd={...a,status:"confirmado"};
    setAppts(x=>x.map(aa=>aa.id===upd.id?upd:aa)); setAdet(null);
    try{ await DB.save("appointments",upd.id,upd); }catch{}
    if(stampsOn){
      const mc=clients.find(c=>c.name===a.client||c.phone===a.phone);
      if(mc){
        const mcu={...mc,stamps:Math.min((mc.stamps||0)+1,10),pts:(mc.pts||0)+10,visits:(mc.visits||0)+1,last:today()};
        setClients(x=>x.map(cc=>cc.id===mc.id?mcu:cc));
        try{await DB.save("clients",mc.id,mcu);}catch{}
      }
    }
    const svcObj=svcs.find(s=>s.name===a.svc);
    const sale={id:"v"+Date.now(),client:a.client,items:[a.svc],total:svcObj?.price||0,method:"pendiente",date:a.date,auto:true};
    setSales(x=>[...x,sale]); try{await DB.save("sales",sale.id,sale);}catch{}
  }

  const visClients = isAdmin?clients:clients.filter(cl=>appts.some(a=>a.stId===user.id&&(a.client===cl.name||a.phone===cl.phone)));
  const visAppts   = isAdmin?appts:appts.filter(a=>(a.stId||a.st_id)===user.id);
  const visSales   = (isAdmin||user.role==="vendedor")?sales:sales.filter(s=>visAppts.some(a=>a.client===s.client));

  function PhotoBtn({u}){
    const ref=useRef();
    return ce("span",null,
      ce("input",{type:"file",accept:"image/*",ref,style:{display:"none"},onChange:async e2=>{
        if(!e2.target.files[0])return;
        const fr=new FileReader();
        fr.onload=async ev=>{const upd={...u,photo:ev.target.result};await DB.save("users",u.id,upd);setUsers(x=>x.map(uu=>uu.id===u.id?upd:uu));};
        fr.readAsDataURL(e2.target.files[0]);
      }}),
      ce("button",{type:"button",style:{...S.btn("ghost"),width:"auto",padding:"4px 9px",fontSize:11},onClick:()=>ref.current.click()},"📷")
    );
  }

  // ── RENDER ──
  return ce("div",{"data-taseca-auth":"1",className:"app-main",style:{...S.app,display:"flex",flexDirection:"row",minHeight:"100vh"}},
    // Sidebar
    ce("div",{className:"app-sidebar"},
      ce("div",{style:{padding:"18px 14px 14px",borderBottom:"1px solid "+C.border}},
        ce("div",{style:{display:"flex",alignItems:"center",gap:9,marginBottom:11}},
          ce(Logo,{size:30}),
          ce("div",null,ce("div",{style:{fontSize:15,fontWeight:900,background:"linear-gradient(90deg,#c9a84c,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2}},"TASECA"),ce("div",{style:{fontSize:9,color:C.muted}},"Barber & Tattoo"))
        ),
        ce("div",{style:{background:C.accent+"18",border:"1px solid "+C.accent+"33",borderRadius:10,padding:"8px 11px"}},
          ce("div",{style:{fontSize:13,fontWeight:700,color:C.accent}},user.name),
          ce("div",{style:{fontSize:10,color:C.muted,marginTop:2}},ROLES[user.role])
        )
      ),
      ce("nav",{className:"sidebar-nav"},
        tabs.map(t=>ce("button",{type:"button",key:t.id,className:"sidebar-nav-btn"+(tab===t.id?" active":""),onClick:()=>setTab(t.id)},
          ce("span",{className:"ico"},t.icon),ce("span",null,t.label)
        ))
      ),
      ce("div",{style:{padding:"12px 14px",borderTop:"1px solid "+C.border}},
        ce("button",{type:"button",onClick:()=>setNslot({stId:selSt}),style:{...S.btn("cyan"),width:"100%",padding:"8px",fontSize:12,color:"#000",marginBottom:7}},"⚡ Walk-in"),
        ce("button",{type:"button",onClick:onLogout,style:{...S.btn("ghost"),width:"100%",padding:"7px",fontSize:12}},"← Salir")
      )
    ),
    // Main
    ce("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column",maxHeight:"100vh",overflow:"hidden"}},
      // Mobile header
      ce("div",{style:{background:"linear-gradient(135deg,#0d1520,#080c10)",padding:"10px 13px",borderBottom:"1px solid "+C.border,flexShrink:0}},
        ce("div",{style:S.row},
          ce("div",{style:{display:"flex",alignItems:"center",gap:8}},
            ce(Logo,{size:22}),
            ce("div",null,ce("div",{style:{fontSize:13,fontWeight:900,background:"linear-gradient(90deg,#c9a84c,#4ecdc4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}},"TASECA"),ce("div",{style:{fontSize:9,color:C.muted}},"Hola ",ce("b",{style:{color:C.accent}},user.name)))
          ),
          ce("div",{style:{display:"flex",gap:7,alignItems:"center"}},
            ce("button",{type:"button",onClick:()=>setNslot({stId:selSt}),style:{...S.btn("cyan"),padding:"5px 10px",fontSize:11,color:"#000"}},"⚡"),
            ce("button",{type:"button",onClick:onLogout,style:{background:C.border,border:"none",borderRadius:9,padding:"5px 9px",color:C.muted,fontSize:11,cursor:"pointer"}},"Salir")
          )
        )
      ),
      // Page content
      ce("div",{style:{flex:1,overflowY:"auto",paddingBottom:70}},
        ce("div",{className:"page-inner"},
          // AGENDA
          tab==="agenda"&&ce("div",null,
            isAdmin&&ce(TrialBanner,null), ce(NotifBanner,null),
            isAdmin&&ce("div",{style:{display:"flex",gap:4,marginBottom:8,overflowX:"auto"}},
              ce("button",{type:"button",onClick:()=>setSelSt(null),style:{...S.btn(selSt===null?"gold":"ghost"),padding:"4px 9px",fontSize:10,whiteSpace:"nowrap",color:selSt===null?"#000":C.muted}},"Todos"),
              staffL.map(u=>ce("button",{type:"button",key:u.id,onClick:()=>setSelSt(u.id),style:{...S.btn(selSt===u.id?"cyan":"ghost"),padding:"4px 9px",fontSize:10,whiteSpace:"nowrap",color:selSt===u.id?"#000":C.muted}},u.name.split(" ")[0]))
            ),
            ce(WeekCal,{appts:visAppts,users,stId:selSt,
              onSlot:(d,h,m,sid)=>setNslot({date:ts(d),time:(h<10?"0":"")+h+":"+String(m).padStart(2,"0"),stId:sid}),
              onAppt:a=>setAdet(a),
              onReschedule:(a,newDate,newTime)=>{
                const conflict=checkConflict(a.stId||a.st_id,newDate,newTime,a.dur||30,a.id);
                if(conflict){console.warn("Drag blocked:",conflict);return;}
                const upd={...a,date:newDate,time:newTime};
                setAppts(x=>x.map(ap=>ap.id===a.id?upd:ap));
                DB.save("appointments",a.id,upd).catch(e=>console.error(e));
              }
            }),
            ce("button",{type:"button",style:{position:"fixed",bottom:80,right:18,background:C.accent,color:"#000",border:"none",borderRadius:"50%",width:48,height:48,fontSize:22,cursor:"pointer",fontWeight:900,boxShadow:"0 4px 14px #c9a84c55",zIndex:99},onClick:()=>setMdl({type:"appt",d:{}})},"+")),
          // CLIENTES
          tab==="clientes"&&ce("div",null,
            ce("b",{style:{fontSize:15,color:C.accent,display:"block",marginBottom:8}},"👥 Clientes"),
            // Barra de búsqueda clientes
            ce("div",{style:{position:"relative",marginBottom:12}},
              ce("input",{style:{...S.inp,paddingLeft:12},
                placeholder:"🔍 Buscar por nombre, celular o email...",
                value:cliSearch,
                onChange:e2=>setCliSearch(e2.target.value),
                onKeyDown:e2=>{if(e2.key==="Escape")setCliSearch("");}
              }),
              cliSearch&&ce("button",{type:"button",onClick:()=>setCliSearch(""),
                style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}
              },"×")
            ),
            cliSearch&&ce("div",{style:{fontSize:11,color:C.muted,marginBottom:8}},
              (()=>{const n=visClients.filter(c=>{const q=cliSearch.toLowerCase();return c.name.toLowerCase().includes(q)||(c.phone||"").includes(q)||(c.email||"").toLowerCase().includes(q);}).length; return n+" resultado"+(n===1?"":"s")+" de "+visClients.length+" clientes";})()
            ),
            ce("div",{className:"desktop-2col"},
              (cliSearch.trim()?visClients.filter(c=>{const q=cliSearch.toLowerCase();return c.name.toLowerCase().includes(q)||(c.phone||"").includes(q)||(c.email||"").toLowerCase().includes(q);}):visClients)
              .map(c=>ce("div",{key:c.id,style:S.card},
                ce("div",{style:S.row},
                  ce("div",{style:{display:"flex",alignItems:"center",gap:9}},
                    ce("div",{style:{width:38,height:38,borderRadius:"50%",background:C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}},c.name[0]),
                    ce("div",null,
                      ce("b",{style:{fontSize:13}},c.name),
                      ce("div",{style:{color:C.muted,fontSize:11}},"📞 ",c.phone),
                      c.email&&ce("div",{style:{color:C.muted,fontSize:11}},"✉️ ",c.email),
                      c.bday&&ce("div",{style:{color:C.muted,fontSize:11}},"🎂 ",c.bday)
                    )
                  ),
                  ce("span",{style:S.badge(C.accent)},c.visits||0," visitas")
                ),
                ce("div",{style:{marginTop:4,color:C.muted,fontSize:10}},"Última: ",c.last),
                ce("div",{style:{marginTop:7,display:"flex",gap:6}},
                  ce("button",{type:"button",style:{...S.btn("ghost"),width:"auto",padding:"4px 9px",fontSize:11},onClick:()=>setMdl({type:"client",d:c})},"Editar"),
                  isAdmin&&ce("button",{type:"button",style:{...S.btn("err"),width:"auto",padding:"4px 9px",fontSize:11},onClick:async()=>{await DB.del("clients",c.id);setClients(x=>x.filter(cc=>cc.id!==c.id));}},"Eliminar")
                )
              ))
            ),
            ce("button",{type:"button",style:{position:"fixed",bottom:80,right:18,background:C.accent,color:"#000",border:"none",borderRadius:"50%",width:48,height:48,fontSize:22,cursor:"pointer",fontWeight:900,boxShadow:"0 4px 14px #c9a84c55",zIndex:99},onClick:()=>setMdl({type:"client",d:{}})},"+")),
          // FIDELIDAD
          tab==="fidelidad"&&ce("div",null,
            ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
              ce("b",{style:{fontSize:15,color:C.accent}},"🎫 Fidelidad"),
              isAdmin&&ce("div",{style:{display:"flex",alignItems:"center",gap:7}},ce("span",{style:{fontSize:11,color:C.muted}},"Sellos"),ce(Toggle,{val:stampsOn,onChange:toggleStamps}),ce("span",{style:{fontSize:11,color:stampsOn?C.ok:C.muted,fontWeight:700}},stampsOn?"ON":"OFF"))
            ),
            !stampsOn&&ce("div",{style:{background:"#1a2230",borderRadius:12,padding:"20px",textAlign:"center"}},ce("div",{style:{fontSize:28,marginBottom:7}},"🔒"),ce("div",{style:{color:C.muted,fontSize:13}},"Programa de sellos desactivado")),
            stampsOn&&ce("div",{className:"desktop-2col"},
              visClients.map(c=>{
                const n=c.stamps||0,pts=c.pts||0,has=n>=10;
                return ce("div",{key:c.id,style:{...S.card,border:"1px solid "+(has?C.ok+"55":C.border),marginBottom:9}},
                  ce("div",{style:{display:"flex",alignItems:"center",gap:9,marginBottom:8}},
                    ce("div",{style:{width:34,height:34,borderRadius:"50%",background:has?"linear-gradient(135deg,#2ecc71,#27ae60)":C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:has?"#fff":"#c9a84c",flexShrink:0,fontWeight:900}},c.name[0]),
                    ce("div",{style:{flex:1}},ce("b",{style:{fontSize:12}},c.name),ce("div",{style:{color:C.muted,fontSize:10}},c.phone)),
                    has&&ce("span",{style:S.badge(C.ok)},"🎁 Premio")
                  ),
                  ce("div",{style:{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:2,marginBottom:6}},
                    Array.from({length:10},(_,i)=>ce("div",{key:i,style:{aspectRatio:"1",borderRadius:4,background:i<n?"linear-gradient(135deg,#c9a84c,#f0c040)":C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7}},i<n?"✂":""))
                  ),
                  ce("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
                    ce("button",{type:"button",style:{...S.btn("gold"),padding:"4px 8px",fontSize:11,color:"#000"},onClick:async()=>{
                      const upd={...c,stamps:Math.min(n+1,10),pts:pts+10,visits:(c.visits||0)+1,last:today()};
                      setClients(x=>x.map(cc=>cc.id===c.id?upd:cc));try{await DB.save("clients",c.id,upd);}catch{}
                    }},"+ Sello ✂"),
                    has&&ce("button",{type:"button",style:{...S.btn("cyan"),padding:"4px 8px",fontSize:11,color:"#000"},onClick:async()=>{
                      const upd={...c,stamps:0,pts:pts+50};setClients(x=>x.map(cc=>cc.id===c.id?upd:cc));try{await DB.save("clients",c.id,upd);}catch{}
                    }},"🎁 Canjear"),
                    isAdmin&&ce("button",{type:"button",style:{...S.btn("ghost"),padding:"4px 8px",fontSize:11},onClick:async()=>{
                      const upd={...c,stamps:0,pts:0};setClients(x=>x.map(cc=>cc.id===c.id?upd:cc));try{await DB.save("clients",c.id,upd);}catch{}
                    }},"Reset")
                  )
                );
              })
            )
          ),
          // CATÁLOGO
          tab==="catalogo"&&ce("div",null,
            ce("b",{style:{fontSize:15,color:C.accent,display:"block",marginBottom:10}},"🛒 Catálogo"),
            ce("div",{style:{display:"flex",gap:6,marginBottom:12}},
              [["servicios","Servicios"],["productos","Productos"]].filter(x=>user.role!=="vendedor"||x[0]==="productos").map(([id,lbl])=>
                ce("button",{type:"button",key:id,onClick:()=>setSub(id),style:{...S.btn(sub===id?"gold":"ghost"),padding:"6px 14px",fontSize:12,color:sub===id?"#000":C.muted}},lbl)
              )
            ),
            sub==="servicios"&&ce("div",null,
              ce("div",{style:{position:"relative",marginBottom:12}},
                ce("input",{style:{...S.inp,paddingLeft:12},placeholder:"🔍 Buscar servicio...",value:svcSearch,onChange:e2=>setSvcSearch(e2.target.value),onKeyDown:e2=>{if(e2.key==="Escape")setSvcSearch("");}}),
                svcSearch&&ce("button",{type:"button",onClick:()=>setSvcSearch(""),style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}},"×")
              ),
              ce("div",{className:"desktop-2col"},
              (svcSearch.trim()?svcs.filter(sv=>sv.name.toLowerCase().includes(svcSearch.toLowerCase())):svcs)
              .map(sv=>ce("div",{key:sv.id,style:S.card},
                ce("div",{style:S.row},
                  ce("div",null,ce("span",{style:{fontSize:13,fontWeight:700,color:"#fff",display:"block"}},sv.name),ce("div",{style:{color:C.muted,fontSize:11}},"⏱ ",sv.dur||0," min")),
                  ce("div",{style:{textAlign:"right"}},ce("b",{style:{color:C.accent,fontSize:14}},"$",sv.price),ce("div",null,ce("span",{style:S.badge(CAT[sv.cat]||"#888")},sv.cat)))
                ),
                isAdmin&&ce("div",{style:{marginTop:7,display:"flex",gap:6}},
                  ce("button",{type:"button",style:{...S.btn("ghost"),width:"auto",padding:"4px 9px",fontSize:11},onClick:()=>setMdl({type:"svc",d:sv})},"Editar"),
                  ce("button",{type:"button",style:{...S.btn("err"),width:"auto",padding:"4px 9px",fontSize:11},onClick:async()=>{await DB.del("services",sv.id);setSvcs(x=>x.filter(s=>s.id!==sv.id));}},"Eliminar")
                )
              ))
              ) // close desktop-2col
            ), // close servicios div
            sub==="productos"&&ce("div",null,
              ce("div",{style:{position:"relative",marginBottom:12}},
                ce("input",{style:{...S.inp,paddingLeft:34},placeholder:"🔍 Buscar producto...",value:prodSearch,onChange:e2=>setProdSearch(e2.target.value)}),
                prodSearch&&ce("button",{type:"button",onClick:()=>setProdSearch(""),style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}},"×")
              ),
              ce("div",{className:"desktop-2col"},
                prods.filter(pr=>!prodSearch||pr.name.toLowerCase().includes(prodSearch.toLowerCase())).map(pr=>ce("div",{key:pr.id,style:S.card},
                  ce("div",{style:S.row},
                    ce("div",null,ce("b",{style:{fontSize:13}},pr.name),ce("div",{style:{color:pr.stock<5?C.err:C.muted,fontSize:11}},"📦 ",pr.stock)),
                    ce("b",{style:{color:C.accent,fontSize:14}},"$",pr.price)
                  ),
                  (isAdmin||user.role==="vendedor")&&ce("div",{style:{marginTop:7,display:"flex",gap:6}},
                    ce("button",{type:"button",style:{...S.btn("ghost"),width:"auto",padding:"4px 9px",fontSize:11},onClick:()=>setMdl({type:"prod",d:pr})},"Editar"),
                    ce("button",{type:"button",style:{...S.btn("err"),width:"auto",padding:"4px 9px",fontSize:11},onClick:async()=>{await DB.del("products",pr.id);setProds(x=>x.filter(p=>p.id!==pr.id));}},"Eliminar")
                  )
                ))
              )
            ),
            (isAdmin||(user.role==="vendedor"&&sub==="productos"))&&ce("button",{type:"button",style:{position:"fixed",bottom:80,right:18,background:C.accent,color:"#000",border:"none",borderRadius:"50%",width:48,height:48,fontSize:22,cursor:"pointer",fontWeight:900,boxShadow:"0 4px 14px #c9a84c55",zIndex:99},onClick:()=>setMdl({type:sub==="servicios"?"svc":"prod",d:{}})},"+")),
          // CAJA
          tab==="caja"&&ce("div",null,
            ce("b",{style:{fontSize:15,color:C.accent,display:"block",marginBottom:12}},"💰 Caja & Ventas"),
            ce("div",{style:{display:"flex",gap:6,marginBottom:14}},
              [["servicios","✂️ Servicios"],["productos","📦 Productos"]].map(([id,lbl])=>
                ce("button",{type:"button",key:id,onClick:()=>{setCajSub(id);setCajFilt("todas");},style:{...S.btn(cajSub===id?"gold":"ghost"),padding:"7px 16px",fontSize:12,color:cajSub===id?"#000":C.muted,flex:1}},lbl)
              )
            ),
            cajSub==="servicios"&&ce("div",null,
              ce("div",{style:{fontSize:11,color:C.muted,marginBottom:10,background:C.card,borderRadius:8,padding:"6px 12px"}},"Las ventas de servicios se registran automáticamente al confirmar una cita"),
              visSales.map(s=>ce("div",{key:s.id,style:{...S.card,border:"1px solid "+(s.method==="debe"?C.warn+"55":C.border)}},
                ce("div",{style:S.row},
                  ce("div",{style:{flex:1,minWidth:0}},ce("b",{style:{fontSize:12}},s.client),ce("div",{style:{color:C.muted,fontSize:10,marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}},(s.items||[]).join(", "))),
                  ce("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8}},ce("b",{style:{color:s.method==="debe"?C.warn:C.accent,fontSize:13}},"$",s.total),ce("div",null,ce("span",{style:S.badge(s.method==="debe"?C.warn:C.ok)},s.method==="debe"?"⏳ Debe":s.method)))
                ),
                ce("div",{style:{marginTop:4,color:C.muted,fontSize:10}},"📆 ",s.date)
              ))
            ),
            cajSub==="productos"&&ce("div",null,
              ce("div",{style:{display:"flex",gap:5,marginBottom:12,overflowX:"auto"}},
                [["todas","Todas"],["debe","⏳ Deudas"],["pagadas","✅ Pagadas"]].map(([id,lbl])=>
                  ce("button",{type:"button",key:id,onClick:()=>setCajFilt(id),style:{...S.btn(cajFilt===id?"gold":"ghost"),padding:"5px 11px",fontSize:11,color:cajFilt===id?"#000":C.muted,whiteSpace:"nowrap",flexShrink:0}},lbl)
                )
              ),
              ce("div",{className:"desktop-2col"},
                (cajFilt==="debe"?prodSales.filter(s=>s.method==="debe"):cajFilt==="pagadas"?prodSales.filter(s=>s.method!=="debe"):prodSales).map(s=>{
                  const isDebt=s.method==="debe";
                  const abonos3=s.abonos||[];
                  const totalAb3=abonos3.reduce((a,ab)=>a+(Number(ab.monto)||0),0);
                  const pend2=isDebt?(s.pendiente!==undefined?Number(s.pendiente):Math.max(0,s.total-totalAb3)):0;
                  const isVencida=isDebt&&s.dueDate&&s.dueDate<today();
                  return ce("div",{key:s.id,style:{...S.card,border:"1px solid "+(isVencida?C.err+"66":isDebt?C.warn+"55":C.border)}},
                    ce("div",{style:S.row},
                      ce("div",{style:{flex:1,minWidth:0}},
                        ce("b",{style:{fontSize:12}},s.client),
                        s.phone&&ce("div",{style:{color:C.muted,fontSize:10}},"📞 ",s.phone),
                        ce("div",{style:{color:C.muted,fontSize:10,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}},(s.items||[]).join(", "))
                      ),
                      ce("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8}},
                        // Si hay deuda mostrar pendiente grande y total pequeño
                        isDebt
                          ? ce("div",null,
                              ce("b",{style:{color:isVencida?C.err:C.warn,fontSize:16,display:"block"}},"$",pend2),
                              ce("div",{style:{fontSize:9,color:C.muted}},"de $",s.total," total"),
                              totalAb3>0&&ce("div",{style:{fontSize:9,color:C.ok}},"✓ Abonado: $",totalAb3)
                            )
                          : ce("b",{style:{color:C.accent,fontSize:13}},"$",s.total),
                        ce("div",{style:{marginTop:3}},ce("span",{style:S.badge(isVencida?C.err:isDebt?C.warn:C.ok)},isVencida?"🚨 Vencido":isDebt?"⏳ Debe":s.method))
                      )
                    ),
                    // Barra de progreso de pago
                    isDebt&&totalAb3>0&&ce("div",{style:{margin:"7px 0 4px"}},
                      ce("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,marginBottom:3}},
                        ce("span",null,"Pagado: $",totalAb3),
                        ce("span",null,"Pendiente: ",ce("b",{style:{color:isVencida?C.err:C.warn}},"$",pend2))
                      ),
                      ce("div",{style:{background:C.border,borderRadius:20,height:5,overflow:"hidden"}},
                        ce("div",{style:{width:Math.min(100,s.total>0?Math.round(totalAb3/s.total*100):0)+"%",height:"100%",background:"linear-gradient(90deg,"+C.ok+","+C.accent+")",borderRadius:20}})
                      )
                    ),
                    ce("div",{style:{marginTop:4,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}},
                      ce("span",{style:{color:C.muted,fontSize:10}},"📆 ",s.date),
                      isDebt&&s.dueDate&&ce("span",{style:{color:isVencida?C.err:C.warn,fontSize:10,fontWeight:700}},isVencida?"🚨 Vencido:":"Límite:"," ",s.dueDate)
                    ),
                    (isDebt&&(isAdmin||user.role==="vendedor"))&&ce("div",{style:{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}},
                      ce("button",{type:"button",style:{...S.btn("ghost"),flex:1,padding:"7px",fontSize:11,border:"1px solid "+C.warn+"55",color:C.warn},onClick:()=>setAbonoMdl({...s,_table:"product_sales"})},"💵 Abonar"),
                      ce("button",{type:"button",style:{...S.btn("cyan"),flex:1,padding:"7px",fontSize:11,color:"#000"},onClick:()=>{
                        const upd={...s,method:"efectivo",dueDate:null,paidDate:today(),abonos:[],pendiente:0};
                        setProdSales(x=>x.map(ss=>ss.id===s.id?upd:ss));DB.save("product_sales",upd.id,upd).catch(()=>{});
                      }},"✅ Pago total"),
                      s.phone&&(()=>{
                        const phone=s.phone.replace(/\D/g,"");
                        const waPhone=phone.length===10?"57"+phone:phone;
                        const abonos2=s.abonos||[];
                        const totalAb=abonos2.reduce((a,ab)=>a+ab.monto,0);
                        const pend3=s.pendiente!==undefined?s.pendiente:s.total-totalAb;
                        const msg="Hola "+s.client+" 👋\n\nTe recordamos que tienes un saldo pendiente:\n\n📦 *Productos:* "+(s.items||[]).join(", ")+"\n💰 *Total:* $"+s.total+(totalAb>0?"\n✅ *Abonado:* $"+totalAb:"")+(pend3>0?"\n⏳ *Pendiente:* $"+pend3:"")+(s.dueDate?"\n📅 *Fecha límite:* "+s.dueDate:"")+"\n\n¡Gracias! 🙏";
                        return ce("button",{type:"button",
                          style:{background:"#25D366",border:"none",borderRadius:10,padding:"7px 10px",fontSize:11,color:"#fff",fontWeight:700,cursor:"pointer",flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5},
                          onClick:()=>window.open("https://wa.me/"+waPhone+"?text="+encodeURIComponent(msg),"_blank")
                        },"📱 WA");
                      })()
                    )
                  );
                })
              ),
              ce("button",{type:"button",style:{position:"fixed",bottom:80,right:18,background:C.accent,color:"#000",border:"none",borderRadius:"50%",width:48,height:48,fontSize:22,cursor:"pointer",fontWeight:900,boxShadow:"0 4px 14px #c9a84c55",zIndex:99},onClick:()=>setMdl({type:"sale",d:{}})},"+")),
          ),
          // REPORTES
          tab==="reportes"&&ce(Reportes,{appts:visAppts,sales:visSales,clients:visClients,users,isAdmin,prodSales,prods}),
          // CONFIG
          tab==="config"&&isAdmin&&ce("div",null,
            ce("b",{style:{fontSize:15,color:C.accent,display:"block",marginBottom:12}},"⚙️ Configuración"),
            ce("div",{style:{...S.card,border:"1.5px solid "+C.accent+"44",marginBottom:14}},
              ce("b",{style:{fontSize:13,color:C.accent,display:"block",marginBottom:12}},"🏢 Identidad del negocio"),
              ce("div",{style:{display:"flex",alignItems:"center",gap:14,marginBottom:12}},
                ce("div",{style:{width:72,height:72,borderRadius:14,background:cfg.businessLogo?"transparent":C.border,border:"2px dashed "+C.accent+"66",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,cursor:"pointer"},onClick:()=>document.getElementById("bizLogoInput").click()},
                  cfg.businessLogo?ce("img",{src:cfg.businessLogo,style:{width:"100%",height:"100%",objectFit:"cover"}}):ce("span",{style:{fontSize:28}},"🖼️")
                ),
                ce("div",{style:{flex:1}},
                  ce("div",{style:{fontSize:12,color:C.text,fontWeight:700,marginBottom:3}},cfg.businessName||"Sin nombre"),
                  ce("div",{style:{fontSize:11,color:C.muted,marginBottom:8}},cfg.businessSubtitle||"Sin subtítulo"),
                  ce("button",{type:"button",style:{...S.btn("ghost"),padding:"4px 10px",fontSize:11},onClick:()=>document.getElementById("bizLogoInput").click()},cfg.businessLogo?"✏️ Cambiar logo":"📷 Subir logo")
                )
              ),
              ce("input",{type:"file",id:"bizLogoInput",accept:"image/*",style:{display:"none"},onChange:e2=>{
                if(!e2.target.files[0])return;
                const fr=new FileReader();fr.onload=ev=>{const upd={...cfg,businessLogo:ev.target.result};setCfg(upd);const cfgId=upd.id||(window._companyId?"cfg_"+window._companyId:"cfg");DB.save("config",cfgId,{...upd,id:cfgId}).catch(()=>{});};fr.readAsDataURL(e2.target.files[0]);
              }}),
              ce("div",{style:{marginBottom:8}},ce("label",{style:S.lbl},"Nombre del negocio"),ce("input",{style:S.inp,placeholder:"Ej: Barbería El Rey",value:cfg.businessName||"",onChange:e2=>setCfg({...cfg,businessName:e2.target.value}),onBlur:e2=>{const upd={...cfg,businessName:e2.target.value};DB.save("config",upd.id||"cfg",upd).catch(()=>{});}})),
              ce("div",null,ce("label",{style:S.lbl},"Subtítulo (máx. 40 caracteres)"),ce("input",{style:S.inp,placeholder:"Ej: Barber & Tattoo",maxLength:40,value:cfg.businessSubtitle||"",onChange:e2=>setCfg({...cfg,businessSubtitle:e2.target.value.substring(0,40)}),onBlur:e2=>{const upd={...cfg,businessSubtitle:e2.target.value.substring(0,40)};DB.save("config",upd.id||"cfg",upd).catch(()=>{});}}),ce("div",{style:{fontSize:10,color:C.muted,marginTop:3}},(cfg.businessSubtitle||"").length,"/40 caracteres"))
            ),
            ce("div",{style:{...S.card,border:"1.5px solid "+(stampsOn?C.ok:C.border)}},
              ce("div",{style:S.row},
                ce("div",null,ce("b",{style:{fontSize:13}},"🎫 Programa de Sellos"),ce("div",{style:{fontSize:11,color:C.muted,marginTop:2}},stampsOn?"Activo":"Inactivo")),
                ce(Toggle,{val:stampsOn,onChange:toggleStamps})
              )
            ),
            ce("b",{style:{fontSize:13,color:C.cyan,display:"block",margin:"14px 0 10px"}},"👤 Personal"),
            users.map(u=>ce("div",{key:u.id,style:S.card},
              ce("div",{style:{display:"flex",alignItems:"center",gap:9}},
                ce("div",{style:{width:40,height:40,borderRadius:"50%",background:C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,overflow:"hidden",flexShrink:0}},u.photo?ce("img",{src:u.photo,style:{width:"100%",height:"100%",objectFit:"cover"},alt:""}):u.name[0]),
                ce("div",null,ce("b",{style:{fontSize:13}},u.name),ce("div",{style:{color:C.muted,fontSize:11}},ROLES[u.role]),ce("div",{style:{color:C.muted,fontSize:10}},(u.workDays||[]).map(d=>DY[d]).join("·")," · ",u.wStart||"09:00","-",u.wEnd||"19:00"))
              ),
              ce("div",{style:{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}},
                ce(PhotoBtn,{u}),
                ce("button",{type:"button",style:{...S.btn("ghost"),width:"auto",padding:"4px 9px",fontSize:11},onClick:()=>setMdl({type:"user",d:u})},"Editar"),
                ce("button",{type:"button",style:{...S.btn("cyan"),width:"auto",padding:"4px 9px",fontSize:11,color:"#000"},onClick:()=>setSchUser(u)},"🗓 Patrón"),
                ce("button",{type:"button",style:{...S.btn("err"),width:"auto",padding:"4px 9px",fontSize:11},onClick:async()=>{await DB.del("users",u.id);setUsers(x=>x.filter(uu=>uu.id!==u.id));}},"Eliminar")
              )
            )),
            ce("button",{type:"button",style:{...S.btn(),width:"100%",padding:"10px",marginTop:4},onClick:()=>setMdl({type:"user",d:{}})},"+ Agregar usuario")
          )
        )
      ),
      // Tab bar mobile
      ce("div",{className:"tab-bar-mobile"},
        tabs.map(t=>ce("button",{type:"button",key:t.id,className:"tab-btn-m",style:{color:tab===t.id?C.accent:C.muted},onClick:()=>setTab(t.id)},
          ce("span",{style:{fontSize:17}},t.icon),ce("span",{style:{fontSize:8,fontWeight:tab===t.id?700:400}},t.label)
        ))
      )
    ),
    // Modals
    reschedMdl && ce(RescheduleMdl,null),
    mdl?.type==="svc"    && ce(SvcMdl,null),
    mdl?.type==="prod"   && ce(ProdMdl,null),
    mdl?.type==="client" && ce(CliMdl,null),
    mdl?.type==="user"   && ce(UserMdl,null),
    (mdl?.type==="appt"||mdl?.type==="walkin"||nslot) && ce(ApptMdl,{d:mdl?.d||nslot||{},clients,setClients,svcs,staffL,selSt,appts,setAppts,setMdl,setNslot,checkConflict}),
    mdl?.type==="sale"   && ce(SaleMdl,null),
    abonoMdl && ce(AbonoMdl,null),
    // Appt detail
    adet && ce("div",{style:S.ov,onClick:()=>setAdet(null)},
      ce("div",{style:S.mb,onClick:e2=>e2.stopPropagation()},
        ce("div",{style:{...S.row,marginBottom:12}},ce("b",{style:{fontSize:14,color:SC[adet.status]||C.accent}},SL[adet.status]||adet.status),ce("button",{type:"button",onClick:()=>setAdet(null),style:{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}},"✕")),
        ce("div",{style:{fontSize:18,fontWeight:900,marginBottom:3}},adet.client),
        ce("div",{style:{color:C.muted,fontSize:12,marginBottom:11}},adet.phone),
        [["Servicio",adet.svc],["Fecha",adet.date],["Hora",adet.time],["Duración",(adet.dur||30)+" min"]].map(([k,v])=>
          ce("div",{key:k,style:{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,paddingBottom:6,borderBottom:"1px solid "+C.border}},ce("span",{style:{color:C.muted}},k),ce("b",null,v))
        ),
        ce("div",{style:{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}},
          ce("button",{type:"button",style:{...S.btn("gold"),flex:1,fontSize:11,color:"#000"},onClick:()=>{setReschedMdl(adet);setAdet(null);}},"📅 Reagendar"),
          adet.status!=="confirmado"&&ce("button",{type:"button",style:{...S.btn("cyan"),flex:1,color:"#000",fontSize:11},onClick:()=>confirmAppt(adet)},"✓ Confirmar"),
          (()=>{
            let phone = adet.phone||"";
            if(!phone){ const cli=clients.find(c=>c.name===adet.client); if(cli) phone=cli.phone||""; }
            if(!phone) return null;
            const staffName = users.find(u=>u.id===(adet.stId||adet.st_id))?.name||"Tu profesional";
            const biz = (cfg?.businessName?.trim())||"Taseca";
            const msg = "Hola "+adet.client+" 👋\n\nTe recordamos tu cita en *"+biz+"*:\n\n✂️ *Servicio:* "+adet.svc+"\n👤 *Profesional:* "+staffName+"\n📅 *Fecha:* "+adet.date+"\n⏰ *Hora:* "+adet.time+"\n\n¡Te esperamos! 💈";
            const ph = phone.replace(/\D/g,"");
            const waPhone = ph.length===10?"57"+ph:ph;
            return ce("button",{type:"button",
              style:{background:"#25D366",border:"none",borderRadius:10,padding:"9px 12px",fontSize:11,color:"#fff",fontWeight:700,cursor:"pointer",flex:1},
              onClick:()=>window.open("https://wa.me/"+waPhone+"?text="+encodeURIComponent(msg),"_blank")
            },"📱 WhatsApp");
          })(),
          ce("button",{type:"button",style:{...S.btn("err"),flex:1,fontSize:11},onClick:async()=>{await DB.del("appointments",adet.id);setAppts(x=>x.filter(a=>a.id!==adet.id));setAdet(null);}},"Eliminar")
        )
      )
    ),
    // Schedule modal
    schUser && ce(SchedMdl,{user:schUser,close:()=>setSchUser(null),onSave:async upd=>{await DB.save("users",upd.id,upd);setUsers(x=>x.map(u=>u.id===upd.id?upd:u));setSchUser(null);}})
  );
}
