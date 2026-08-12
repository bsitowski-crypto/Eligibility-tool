(function(){
  "use strict";

  const COMPANY_KEY="solvita_v9108_transport_companies";
  const SOLVITA_FALLBACK="18111 NE Sandy Blvd, Portland, OR 97230";
  const DISPATCH_MIN=15,HOSPITAL_LOAD_MIN=30,FUNERAL_LOAD_MIN=15;
  let pendingDonorId=null;

  function donorById(id){try{return donors.find(d=>String(d.id)===String(id))||null}catch{return null}}
  function clean(s){return String(s||"").replace(/\s+/g," ").trim()}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function companies(){try{const x=JSON.parse(localStorage.getItem(COMPANY_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return []}}
  function fmtMin(min){min=Math.max(0,Math.round(Number(min)||0));const h=Math.floor(min/60),m=min%60;return h?`${h} hr${h===1?"":"s"}${m?` ${m} min`:""}`:`${m} min`}
  function fmtClock(d){return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}
  function addMin(d,m){return new Date(d.getTime()+m*60000)}

  function pickupType(d){if(d?.transportPickupType==="h"||d?.transportPickupType==="f")return d.transportPickupType;const h=!!(d?.hospitalSnapshot||clean(d?.referralSource)),f=!!(d?.funeralSnapshot||clean(d?.funeralHome));if(h&&!f)return"h";if(f&&!h)return"f";return""}
  function matchRecord(type,d){try{const list=type==="h"?dirs.hospitals:dirs.funerals;const snap=type==="h"?d?.hospitalSnapshot:d?.funeralSnapshot;if(snap?.id){const byId=list.find(x=>String(x.id)===String(snap.id));if(byId)return byId}const name=clean(snap?.name||(type==="h"?d?.referralSource:d?.funeralHome)).toLowerCase();return list.find(x=>clean(x.name).toLowerCase()===name)||null}catch{return null}}

  function addStyles(){
    if(document.getElementById("transportCardStyle"))return;
    const s=document.createElement("style");s.id="transportCardStyle";s.textContent=`
.transport-card-eta{margin-top:8px;padding:9px 10px;border-radius:9px;background:#eef6ff;color:#0b4f9c;font-size:12px;line-height:1.35;border:1px solid #d4e7fb}.transport-card-eta strong{color:#071f3e}.transport-card-eta .tce-sub{color:#5b6877;font-size:11px;margin-top:2px}.transport-card-btn{width:100%;margin-top:7px!important;background:#eaf2fb!important;color:#0b4f9c!important;border:1px solid #cfe0f2!important}.transport-card-btn:disabled{opacity:.55}
#transportCardModal{position:fixed;inset:0;z-index:8000;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box}#transportCardModal.hidden{display:none!important}.tcm-box{width:min(520px,100%);background:#fff;border-radius:18px;padding:20px;box-sizing:border-box;color:#172033;box-shadow:0 20px 60px #0006}.tcm-box h2{margin:0 0 6px;color:#071f3e}.tcm-note{font-size:12px;color:#667;line-height:1.4;margin:6px 0 12px}.tcm-field{display:flex;flex-direction:column;gap:5px}.tcm-field label{font-size:12px;font-weight:800;color:#556}.tcm-field select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #c9ced6;border-radius:10px;background:#fff;font-size:16px}.tcm-primary,.tcm-close{width:100%;border:0;border-radius:10px;padding:12px 14px;min-height:44px;font-weight:850;margin-top:10px}.tcm-primary{background:#0b63ce;color:#fff}.tcm-close{background:#68707a;color:#fff}.tcm-error{display:none;margin-top:10px;padding:10px;border-radius:9px;background:#fff0f0;color:#8a1d1d;font-size:12px}
`;
    document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById("transportCardModal"))return;
    const m=document.createElement("div");m.id="transportCardModal";m.className="hidden";m.innerHTML=`<div class="tcm-box"><h2>Calculate Transport</h2><div id="tcmLocation" class="tcm-note"></div><div class="tcm-field"><label>TRANSPORT COMPANY</label><select id="tcmCompany"></select></div><div id="tcmError" class="tcm-error"></div><button id="tcmCalc" class="tcm-primary" type="button">CALCULATE TRANSPORT TIME</button><button id="tcmClose" class="tcm-close" type="button">CANCEL</button></div>`;document.body.appendChild(m);
    document.getElementById("tcmClose").onclick=()=>m.classList.add("hidden");
    document.getElementById("tcmCalc").onclick=calculatePending;
    m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")});
  }

  function openCardCalculator(id){
    const d=donorById(id);if(!d)return;const type=pickupType(d);const err=document.getElementById("tcmError");
    if(!type){alert("Select the donor's current location — Hospital or Funeral Home — before calculating transport.");return}
    const rec=matchRecord(type,d);if(!rec){alert("The donor's current hospital or funeral home could not be matched to the directory. Re-select the facility on the donor record first.");return}
    const list=companies();if(!list.length){alert("No transport companies have been added yet. Add them once under MENU → TRANSPORT, then you can calculate directly from donor cards.");return}
    pendingDonorId=id;ensureModal();
    const sel=document.getElementById("tcmCompany");sel.innerHTML='<option value="">Select transport company…</option>'+list.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    if(d.transportEstimate?.companyId&&[...sel.options].some(o=>o.value===d.transportEstimate.companyId))sel.value=d.transportEstimate.companyId;
    document.getElementById("tcmLocation").innerHTML=`Pickup: <strong>${type==="h"?"Hospital":"Funeral Home"}</strong> — ${esc(rec.name)}<br>${type==="h"?"30":"15"} min loading + 15 min driver departure allowance`;
    err.style.display="none";err.textContent="";document.getElementById("transportCardModal").classList.remove("hidden");
  }

  async function geo(query){if(typeof geocodePlace==="function"){try{return await geocodePlace(query)}catch{}}const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q="+encodeURIComponent(query);const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Unable to locate "+query);const data=await r.json();if(!data.length)throw new Error("No map match for "+query);return{lat:Number(data[0].lat),lon:Number(data[0].lon)}}
  async function route(a,b){const url=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&steps=false`;const r=await fetch(url);if(!r.ok)throw new Error("Routing request failed");const data=await r.json();if(data.code!=="Ok"||!data.routes?.length)throw new Error("No driving route found");const x=data.routes[0];return{miles:Math.round(x.distance/1609.344*10)/10,minutes:Math.max(1,Math.round(x.duration/60))}}
  function locationQuery(type,record){if(typeof facilityQuery==="function"){try{return facilityQuery(type,record)}catch{}}return type==="h"?[record.name,record.cityCounty].filter(Boolean).join(", "):[record.name,record.location].filter(Boolean).join(", ")}

  async function calculatePending(){
    const d=donorById(pendingDonorId);if(!d)return;const type=pickupType(d),rec=matchRecord(type,d),list=companies(),company=list.find(c=>String(c.id)===String(document.getElementById("tcmCompany").value));const err=document.getElementById("tcmError"),btn=document.getElementById("tcmCalc");
    if(!company){err.textContent="Select a transport company.";err.style.display="block";return}if(!rec){err.textContent="Current donor location is missing.";err.style.display="block";return}
    err.style.display="none";btn.disabled=true;btn.textContent="CALCULATING…";
    try{
      const donorQuery=locationQuery(type,rec),solvitaQuery=(typeof SOLVITA_ORIGIN_QUERY!=="undefined"&&SOLVITA_ORIGIN_QUERY)||SOLVITA_FALLBACK;
      const basePt=await geo(company.base);const donorPt=await geo(donorQuery);const solvitaPt=await geo(solvitaQuery);
      const [leg1,leg2]=await Promise.all([route(basePt,donorPt),route(donorPt,solvitaPt)]);
      const load=type==="h"?HOSPITAL_LOAD_MIN:FUNERAL_LOAD_MIN,total=DISPATCH_MIN+leg1.minutes+load+leg2.minutes,totalMiles=Math.round((leg1.miles+leg2.miles)*10)/10,arrival=addMin(new Date(),total);
      d.transportEstimate={totalMinutes:total,totalText:fmtMin(total),totalMiles,arrivalClock:fmtClock(arrival),arrivalAt:arrival.toISOString(),companyId:company.id,companyName:company.name,locationId:rec.id,locationName:rec.name,pickupType:type,calculatedAt:new Date().toISOString(),leg1Minutes:leg1.minutes,leg2Minutes:leg2.minutes};
      try{save()}catch{};document.getElementById("transportCardModal").classList.add("hidden");
      try{renderBoard()}catch{};setTimeout(decorateBoard,0);
    }catch(e){err.textContent="Unable to calculate route: "+(e.message||e);err.style.display="block"}
    finally{btn.disabled=false;btn.textContent="CALCULATE TRANSPORT TIME"}
  }

  function decorateBoard(){
    addStyles();ensureModal();
    document.querySelectorAll(".donor").forEach(card=>{
      const open=card.querySelector(".donor-open-btn[data-donor-id]");if(!open)return;const d=donorById(open.dataset.donorId);if(!d)return;let box=card.querySelector(".transport-card-eta");if(!box){box=document.createElement("div");box.className="transport-card-eta";const actions=card.querySelector(".actions");if(actions)card.insertBefore(box,actions);else card.appendChild(box)}
      const e=d.transportEstimate;
      box.innerHTML=e?`<strong>Transport: ${esc(e.totalText||fmtMin(e.totalMinutes))}</strong>${e.arrivalClock?` · ETA Solvita ${esc(e.arrivalClock)}`:""}<div class="tce-sub">${esc(e.companyName||"Transport")}${e.locationName?` · pickup ${esc(e.locationName)}`:""}</div><button type="button" class="transport-card-btn" data-transport-donor="${esc(d.id)}">RECALCULATE TRANSPORT</button>`:`<strong>Transport: Not calculated</strong><div class="tce-sub">Uses the donor's current location and selected transport company.</div><button type="button" class="transport-card-btn" data-transport-donor="${esc(d.id)}">CALCULATE TRANSPORT</button>`;
    });
  }

  if(!document.documentElement.dataset.transportCardDelegated){document.documentElement.dataset.transportCardDelegated="1";document.addEventListener("click",e=>{const b=e.target.closest?.(".transport-card-btn[data-transport-donor]");if(!b)return;e.preventDefault();e.stopPropagation();openCardCalculator(b.dataset.transportDonor)},true)}
  function hookBoard(){const board=document.getElementById("board");if(!board||board.dataset.transportCardHook)return false;board.dataset.transportCardHook="1";new MutationObserver(()=>setTimeout(decorateBoard,0)).observe(board,{childList:true,subtree:true});return true}
  let tries=0;const timer=setInterval(()=>{tries++;hookBoard();decorateBoard();if(document.getElementById("board")||tries>60)clearInterval(timer)},250);
})();
