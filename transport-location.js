(function(){
  "use strict";

  let openDonorHooked=false;
  let transportButtonHooked=false;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function textVal(id){return String(document.getElementById(id)?.value||"").trim()}

  function currentDonor(){
    try{if(typeof cur==="function")return cur()}catch{}
    try{if(typeof donors!=="undefined"&&typeof activeId!=="undefined")return donors.find(d=>d.id===activeId)||null}catch{}
    return null;
  }

  function hasHospital(d){return !!(d?.hospitalSnapshot||textVal("referralSource"))}
  function hasFuneral(d){return !!(d?.funeralSnapshot||textVal("funeralHome"))}
  function pickupType(d){
    if(d?.transportPickupType==="h"||d?.transportPickupType==="f")return d.transportPickupType;
    const h=hasHospital(d),f=hasFuneral(d);
    if(h&&!f)return "h";
    if(f&&!h)return "f";
    return "";
  }
  function locationLabel(type,d){
    return type==="h"
      ? (d?.hospitalSnapshot?.name||textVal("referralSource")||"Hospital")
      : (d?.funeralSnapshot?.name||textVal("funeralHome")||"Funeral Home");
  }

  function savePickup(type){
    const d=currentDonor();if(!d)return;
    d.transportPickupType=type;
    try{save()}catch{}
  }

  function addStyles(){
    if(document.getElementById("transportLocationStyle"))return;
    const s=document.createElement("style");
    s.id="transportLocationStyle";
    s.textContent=`
#transportLocationWrap{margin:12px 0;padding:12px;border:1px solid #d7dee8;border-radius:12px;background:#f8fbff;box-sizing:border-box}
#transportLocationWrap .tl-title{font-size:12px;font-weight:900;color:#071f3e;margin-bottom:8px;letter-spacing:.02em}
#transportLocationWrap .tl-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#transportLocationWrap label{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-size:13px;font-weight:750;line-height:1.25;cursor:pointer}
#transportLocationWrap label.selected{border-color:#0b63ce;background:#edf6ff;color:#0b4f9c}
#transportLocationWrap input{margin-top:2px}.tl-note{font-size:11px;color:#667;margin-top:8px;line-height:1.35}
@media(max-width:520px){#transportLocationWrap .tl-options{grid-template-columns:1fr}}
`;
    document.head.appendChild(s);
  }

  function hostElement(){
    const fh=document.getElementById("funeralHome");
    const h=document.getElementById("referralSource");
    return fh?.closest(".field,.form-field,.input-group,.row")
      ||h?.closest(".field,.form-field,.input-group,.row")
      ||fh?.parentElement||h?.parentElement||null;
  }

  function refreshSelector(){
    const planner=document.getElementById("plannerView");
    if(!planner||planner.classList.contains("hidden"))return;
    const d=currentDonor();if(!d)return;
    addStyles();

    let wrap=document.getElementById("transportLocationWrap");
    if(!wrap){
      const host=hostElement();if(!host)return;
      wrap=document.createElement("div");
      wrap.id="transportLocationWrap";
      host.insertAdjacentElement("afterend",wrap);
    }

    const h=hasHospital(d),f=hasFuneral(d);
    let selected=pickupType(d);
    if(selected==="h"&&!h)selected=f?"f":"";
    if(selected==="f"&&!f)selected=h?"h":"";
    if(selected&&d.transportPickupType!==selected){d.transportPickupType=selected;try{save()}catch{}}

    if(!(h||f)){wrap.style.display="none";return}
    wrap.style.display="block";
    wrap.innerHTML=`<div class="tl-title">CURRENT DONOR LOCATION</div><div class="tl-options">
      ${h?`<label class="${selected==="h"?"selected":""}"><input type="radio" name="transportCurrentLocation" value="h" ${selected==="h"?"checked":""}><span><strong>Hospital</strong><br>${esc(locationLabel("h",d))}</span></label>`:""}
      ${f?`<label class="${selected==="f"?"selected":""}"><input type="radio" name="transportCurrentLocation" value="f" ${selected==="f"?"checked":""}><span><strong>Funeral Home</strong><br>${esc(locationLabel("f",d))}</span></label>`:""}
    </div><div class="tl-note">Transport uses this as the pickup point. Hospital loading adds 30 minutes; funeral-home loading adds 15 minutes.</div>`;

    wrap.querySelectorAll('input[name="transportCurrentLocation"]').forEach(r=>{
      r.addEventListener("change",()=>{savePickup(r.value);refreshSelector()},{once:true});
    });
  }

  function matchRecord(type,d){
    try{
      const list=type==="h"?dirs.hospitals:dirs.funerals;
      const snap=type==="h"?d?.hospitalSnapshot:d?.funeralSnapshot;
      if(snap?.id){const byId=list.find(x=>String(x.id)===String(snap.id));if(byId)return byId}
      const target=String(snap?.name||(type==="h"?textVal("referralSource"):textVal("funeralHome"))||"").trim().toLowerCase();
      if(!target)return null;
      return list.find(x=>String(x.name||"").trim().toLowerCase()===target)
        ||list.find(x=>String(x.name||"").toLowerCase().includes(target)||target.includes(String(x.name||"").toLowerCase()))
        ||null;
    }catch{return null}
  }

  function syncTransport(){
    const d=currentDonor();if(!d)return;
    const type=pickupType(d);if(!type)return;
    const typeEl=document.getElementById("tpType");if(!typeEl)return;
    typeEl.value=type;
    try{typeEl.dispatchEvent(new Event("change",{bubbles:true}))}catch{}
    setTimeout(()=>{
      const rec=matchRecord(type,d),loc=document.getElementById("tpLocation");
      if(rec&&loc&&[...loc.options].some(o=>String(o.value)===String(rec.id)))loc.value=String(rec.id);
      let note=document.getElementById("tpDonorLocationNote");
      if(!note){note=document.createElement("div");note.id="tpDonorLocationNote";note.className="tp-note"}
      note.textContent=`Pickup from donor record: ${type==="h"?"Hospital":"Funeral Home"} — ${locationLabel(type,d)}`;
      const grid=document.querySelector("#transportModal .tp-grid");
      if(grid&&!note.isConnected)grid.insertAdjacentElement("afterend",note);
    },60);
  }

  function hookInputs(){
    ["referralSource","funeralHome"].forEach(id=>{
      const el=document.getElementById(id);
      if(!el||el.dataset.transportLocationSafeHook)return;
      el.dataset.transportLocationSafeHook="1";
      el.addEventListener("change",()=>setTimeout(refreshSelector,0));
      el.addEventListener("blur",()=>setTimeout(refreshSelector,0));
    });
  }

  function hookOpenDonor(){
    if(openDonorHooked||typeof window.openDonor!=="function")return;
    const original=window.openDonor;
    window.openDonor=function(){
      const result=original.apply(this,arguments);
      setTimeout(()=>{hookInputs();refreshSelector()},0);
      return result;
    };
    openDonorHooked=true;
  }

  function hookTransportButton(){
    const btn=document.getElementById("transportPlannerBtn");
    if(!btn||transportButtonHooked)return;
    btn.addEventListener("click",()=>setTimeout(syncTransport,80));
    transportButtonHooked=true;
  }

  function install(){
    hookOpenDonor();
    hookTransportButton();
    hookInputs();
    refreshSelector();
    return openDonorHooked&&transportButtonHooked;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(install()||attempts>=40)clearInterval(timer);
  },250);
})();
