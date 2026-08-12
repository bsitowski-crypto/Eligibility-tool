(function(){
  "use strict";

  let transportButtonHooked=false;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function textVal(id){return String(document.getElementById(id)?.value||"").trim()}
  function currentDonor(){try{if(typeof cur==="function")return cur()}catch{}try{if(typeof donors!=="undefined"&&typeof activeId!=="undefined")return donors.find(d=>d.id===activeId)||null}catch{}return null}
  function hasHospital(d){return !!(d?.hospitalSnapshot||textVal("referralSource"))}
  function hasFuneral(d){return !!(d?.funeralSnapshot||textVal("funeralHome"))}
  function pickupType(d){const h=hasHospital(d),f=hasFuneral(d);if(h&&!f)return "h";if(f&&!h)return "f";if(h&&f&&(d?.transportPickupType==="h"||d?.transportPickupType==="f"))return d.transportPickupType;return ""}
  function locationLabel(type,d){return type==="h"?(d?.hospitalSnapshot?.name||textVal("referralSource")||"Hospital"):(d?.funeralSnapshot?.name||textVal("funeralHome")||"Funeral Home")}
  function savePickup(type){const d=currentDonor();if(!d)return;d.transportPickupType=type;try{save()}catch{}}

  function addStyles(){
    if(document.getElementById("transportLocationStyle"))return;
    const s=document.createElement("style");s.id="transportLocationStyle";s.textContent=`
#transportLocationWrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;align-self:stretch;min-width:108px;padding:0 4px;box-sizing:border-box;position:relative;z-index:1}
#transportLocationWrap .tl-title{font-size:9px;font-weight:900;letter-spacing:.08em;color:#667;text-align:center;white-space:nowrap}
#transportLocationWrap .tl-switch{display:grid;grid-template-columns:1fr 1fr;background:#e8edf3;border:1px solid #c8d1dc;border-radius:999px;padding:3px;width:104px;box-sizing:border-box;box-shadow:inset 0 1px 2px #0000000d}
#transportLocationWrap button{appearance:none;border:0!important;background:transparent!important;color:#5d6875!important;border-radius:999px!important;padding:7px 5px!important;min-height:34px!important;font-size:10px!important;font-weight:900!important;line-height:1!important;box-shadow:none!important;margin:0!important}
#transportLocationWrap button.on{background:#0b63ce!important;color:#fff!important;box-shadow:0 1px 4px #0002!important}
#transportLocationWrap button:disabled{opacity:.32!important}
#transportLocationWrap.tl-single .tl-switch{grid-template-columns:1fr;width:92px}
#hospitalSugs,#funeralSugs{z-index:6000!important}
#hospitalSugs .sug,#funeralSugs .sug{position:relative;z-index:6001;touch-action:manipulation}
@media(max-width:700px){#transportLocationWrap{width:100%;min-width:0;padding:5px 0;order:2;z-index:1}#transportLocationWrap .tl-title{font-size:10px}#transportLocationWrap .tl-switch{width:190px}#transportLocationWrap.tl-single .tl-switch{width:155px}}
`;
    document.head.appendChild(s);
  }

  function fieldsRow(){const h=document.getElementById("referralSource"),f=document.getElementById("funeralHome");if(!h||!f)return null;const hr=h.closest(".row"),fr=f.closest(".row");return hr&&hr===fr?hr:null}
  function ensureWrap(){const row=fieldsRow();if(!row)return null;let wrap=document.getElementById("transportLocationWrap");if(!wrap){wrap=document.createElement("div");wrap.id="transportLocationWrap";const funeralField=document.getElementById("funeralHome")?.closest(".fg")||document.getElementById("funeralHome")?.parentElement;if(funeralField&&funeralField.parentElement===row)row.insertBefore(wrap,funeralField);else row.appendChild(wrap)}return wrap}

  function refreshSelector(){
    const planner=document.getElementById("plannerView");if(!planner||planner.classList.contains("hidden"))return;const d=currentDonor();if(!d)return;addStyles();const wrap=ensureWrap();if(!wrap)return;
    const h=hasHospital(d),f=hasFuneral(d);let selected=pickupType(d);if(selected&&d.transportPickupType!==selected){d.transportPickupType=selected;try{save()}catch{}}
    if(!(h||f)){wrap.style.display="none";return}wrap.style.display="flex";wrap.classList.toggle("tl-single",!(h&&f));
    if(h&&f)wrap.innerHTML=`<div class="tl-title">CURRENT LOCATION</div><div class="tl-switch"><button type="button" data-pickup="h" class="${selected==="h"?"on":""}">HOSPITAL</button><button type="button" data-pickup="f" class="${selected==="f"?"on":""}">FUNERAL</button></div>`;
    else{const type=h?"h":"f";wrap.innerHTML=`<div class="tl-title">CURRENT LOCATION</div><div class="tl-switch"><button type="button" class="on" disabled>${type==="h"?"HOSPITAL":"FUNERAL HOME"}</button></div>`}
    wrap.querySelectorAll("button[data-pickup]").forEach(b=>b.addEventListener("click",()=>{savePickup(b.dataset.pickup);refreshSelector()}));
  }

  function selectSuggestion(sug){
    if(!sug)return false;
    const type=sug.closest("#hospitalSugs")?"h":sug.closest("#funeralSugs")?"f":"";if(!type)return false;
    const visible=String(sug.querySelector("strong")?.textContent||"").trim();if(!visible)return false;
    try{
      const list=type==="h"?dirs.hospitals:dirs.funerals;
      const rec=list.find(x=>String(x.name||"").trim()===visible)||list.find(x=>String(x.name||"").trim().toLowerCase()===visible.toLowerCase());
      if(!rec)return false;
      const d=currentDonor();if(!d)return false;
      if(type==="h"){
        const input=document.getElementById("referralSource");if(input)input.value=rec.name;
        d.referralSource=rec.name;d.hospitalSnapshot=typeof cloneData==="function"?cloneData(rec):JSON.parse(JSON.stringify(rec));
        document.getElementById("hospitalSugs")?.classList.add("hidden");
      }else{
        const input=document.getElementById("funeralHome");if(input)input.value=rec.name;
        d.funeralHome=rec.name;d.funeralSnapshot=typeof cloneData==="function"?cloneData(rec):JSON.parse(JSON.stringify(rec));
        document.getElementById("funeralSugs")?.classList.add("hidden");
      }
      const h=hasHospital(d),f=hasFuneral(d);if(h&&!f)d.transportPickupType="h";else if(f&&!h)d.transportPickupType="f";
      try{save()}catch{}
      setTimeout(refreshSelector,0);
      return true;
    }catch{return false}
  }

  function installSuggestionTouchFix(){
    if(document.documentElement.dataset.transportSuggestionTouchFix)return;
    document.documentElement.dataset.transportSuggestionTouchFix="1";
    const handler=e=>{
      const sug=e.target.closest?.("#hospitalSugs .sug, #funeralSugs .sug");if(!sug)return;
      if(selectSuggestion(sug)){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}
    };
    document.addEventListener("pointerdown",handler,true);
    document.addEventListener("touchstart",handler,{capture:true,passive:false});
  }

  function installPassiveRefresh(){if(document.documentElement.dataset.transportLocationPassiveHook)return;document.documentElement.dataset.transportLocationPassiveHook="1";document.addEventListener("change",e=>{if(e.target?.id==="referralSource"||e.target?.id==="funeralHome")setTimeout(refreshSelector,30)},false);document.addEventListener("click",e=>{if(e.target.closest?.(".donor-open-btn"))setTimeout(refreshSelector,80)},false)}

  function matchRecord(type,d){try{const list=type==="h"?dirs.hospitals:dirs.funerals;const snap=type==="h"?d?.hospitalSnapshot:d?.funeralSnapshot;if(snap?.id){const byId=list.find(x=>String(x.id)===String(snap.id));if(byId)return byId}const target=String(snap?.name||(type==="h"?textVal("referralSource"):textVal("funeralHome"))||"").trim().toLowerCase();if(!target)return null;return list.find(x=>String(x.name||"").trim().toLowerCase()===target)||null}catch{return null}}
  function syncTransport(){const d=currentDonor();if(!d)return;const type=pickupType(d);if(!type)return;const typeEl=document.getElementById("tpType");if(!typeEl)return;typeEl.value=type;try{typeEl.dispatchEvent(new Event("change",{bubbles:true}))}catch{}setTimeout(()=>{const rec=matchRecord(type,d),loc=document.getElementById("tpLocation");if(rec&&loc&&[...loc.options].some(o=>String(o.value)===String(rec.id)))loc.value=String(rec.id);let note=document.getElementById("tpDonorLocationNote");if(!note){note=document.createElement("div");note.id="tpDonorLocationNote";note.className="tp-note"}note.textContent=`Pickup from donor record: ${type==="h"?"Hospital":"Funeral Home"} — ${locationLabel(type,d)}`;const grid=document.querySelector("#transportModal .tp-grid");if(grid&&!note.isConnected)grid.insertAdjacentElement("afterend",note)},60)}
  function hookTransportButton(){const btn=document.getElementById("transportPlannerBtn");if(!btn||transportButtonHooked)return false;btn.addEventListener("click",()=>setTimeout(syncTransport,80));transportButtonHooked=true;return true}
  function install(){addStyles();installPassiveRefresh();installSuggestionTouchFix();hookTransportButton();refreshSelector()}
  let attempts=0;const timer=setInterval(()=>{attempts++;install();if((document.getElementById("referralSource")&&document.getElementById("funeralHome")&&transportButtonHooked)||attempts>=40)clearInterval(timer)},250);
})();
