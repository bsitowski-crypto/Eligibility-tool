(function(){
  "use strict";
  const FIELD_ID="transportCurrentLocation";
  let observer=null;

  function currentDonor(){
    try{if(typeof cur==="function")return cur()}catch{}
    try{if(typeof donors!=="undefined"&&typeof activeId!=="undefined")return donors.find(d=>d.id===activeId)||null}catch{}
    return null;
  }
  function textVal(id){return String(document.getElementById(id)?.value||"").trim()}
  function donorHasHospital(d){return !!(d?.hospitalSnapshot||textVal("referralSource"))}
  function donorHasFuneral(d){return !!(d?.funeralSnapshot||textVal("funeralHome"))}
  function inferredType(d){
    if(d?.transportPickupType==="h"||d?.transportPickupType==="f")return d.transportPickupType;
    const h=donorHasHospital(d),f=donorHasFuneral(d);
    if(h&&!f)return "h";
    if(f&&!h)return "f";
    return "";
  }
  function saveChoice(type){
    const d=currentDonor();if(!d)return;
    d.transportPickupType=type;
    try{save()}catch{}
  }
  function labelText(type,d){
    if(type==="h")return d?.hospitalSnapshot?.name||textVal("referralSource")||"Hospital";
    return d?.funeralSnapshot?.name||textVal("funeralHome")||"Funeral Home";
  }
  function addStyles(){
    if(document.getElementById("transportLocationStyle"))return;
    const s=document.createElement("style");s.id="transportLocationStyle";s.textContent=`
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
  function preferredHost(){
    const fh=document.getElementById("funeralHome");
    const hosp=document.getElementById("referralSource");
    if(fh){let x=fh.closest(".field,.form-field,.input-group,.row");if(x)return x}
    if(hosp){let x=hosp.closest(".field,.form-field,.input-group,.row");if(x)return x}
    return fh?.parentElement||hosp?.parentElement||document.getElementById("plannerView");
  }
  function installSelector(){
    const planner=document.getElementById("plannerView");if(!planner)return;
    const d=currentDonor();if(!d)return;
    addStyles();
    let wrap=document.getElementById("transportLocationWrap");
    if(!wrap){
      wrap=document.createElement("div");wrap.id="transportLocationWrap";
      const host=preferredHost();if(!host)return;
      host.insertAdjacentElement("afterend",wrap);
    }
    const h=donorHasHospital(d),f=donorHasFuneral(d),selected=inferredType(d);
    if(selected&&!d.transportPickupType){d.transportPickupType=selected;try{save()}catch{}}
    wrap.style.display=(h||f)?"block":"none";
    if(!(h||f))return;
    wrap.innerHTML=`<div class="tl-title">CURRENT DONOR LOCATION</div><div class="tl-options">
      ${h?`<label class="${selected==="h"?"selected":""}"><input type="radio" name="transportCurrentLocation" value="h" ${selected==="h"?"checked":""}><span><strong>Hospital</strong><br>${escapeHtml(labelText("h",d))}</span></label>`:""}
      ${f?`<label class="${selected==="f"?"selected":""}"><input type="radio" name="transportCurrentLocation" value="f" ${selected==="f"?"checked":""}><span><strong>Funeral Home</strong><br>${escapeHtml(labelText("f",d))}</span></label>`:""}
    </div><div class="tl-note">Transport will use this location as the pickup point. Hospital pickup adds 30 minutes for loading; funeral-home pickup adds 15 minutes.</div>`;
    wrap.querySelectorAll('input[name="transportCurrentLocation"]').forEach(r=>r.onchange=()=>{saveChoice(r.value);installSelector()});
  }
  function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function matchRecord(type,d){
    try{
      const list=type==="h"?dirs.hospitals:dirs.funerals;
      const snap=type==="h"?d?.hospitalSnapshot:d?.funeralSnapshot;
      if(snap?.id){const byId=list.find(x=>String(x.id)===String(snap.id));if(byId)return byId}
      const target=String(snap?.name||(type==="h"?textVal("referralSource"):textVal("funeralHome"))||"").trim().toLowerCase();
      if(!target)return null;
      return list.find(x=>String(x.name||"").trim().toLowerCase()===target)||list.find(x=>String(x.name||"").toLowerCase().includes(target)||target.includes(String(x.name||"").toLowerCase()))||null;
    }catch{return null}
  }
  function syncTransportModal(){
    const d=currentDonor();if(!d)return;
    const type=inferredType(d);if(!type)return;
    const typeEl=document.getElementById("tpType");if(!typeEl)return;
    typeEl.value=type;
    try{typeEl.dispatchEvent(new Event("change",{bubbles:true}))}catch{}
    setTimeout(()=>{
      const rec=matchRecord(type,d),loc=document.getElementById("tpLocation");
      if(rec&&loc&&[...loc.options].some(o=>String(o.value)===String(rec.id)))loc.value=String(rec.id);
      const note=document.getElementById("tpDonorLocationNote")||document.createElement("div");
      note.id="tpDonorLocationNote";note.className="tp-note";
      note.textContent=`Pickup location from donor record: ${type==="h"?"Hospital":"Funeral Home"} — ${labelText(type,d)}`;
      const grid=document.querySelector("#transportModal .tp-grid");if(grid&&!note.isConnected)grid.insertAdjacentElement("afterend",note);
    },50);
  }
  function hook(){
    const planner=document.getElementById("plannerView");if(!planner)return false;
    installSelector();
    ["referralSource","funeralHome"].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.transportLocationHook){el.dataset.transportLocationHook="1";el.addEventListener("input",()=>setTimeout(installSelector,0));el.addEventListener("change",()=>setTimeout(installSelector,0))}});
    const btn=document.getElementById("transportPlannerBtn");if(btn&&!btn.dataset.transportLocationHook){btn.dataset.transportLocationHook="1";btn.addEventListener("click",()=>setTimeout(syncTransportModal,30))}
    return true;
  }
  const timer=setInterval(()=>{hook()},400);
  setTimeout(()=>clearInterval(timer),30000);
  observer=new MutationObserver(()=>{hook();installSelector()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
