(function(){
  "use strict";
  const root=typeof window!=="undefined"?window:globalThis;
  let installed=false,lastActiveId=null;
  function clean(v){return String(v||"").trim()}
  function key(v){return clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’'`´]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function donor(){try{return typeof cur==="function"?cur():null}catch{return null}}
  function getDirs(){try{return dirs||{hospitals:[],funerals:[]}}catch{return {hospitals:[],funerals:[]}}}
  function clone(x){try{return typeof cloneData==="function"?cloneData(x):JSON.parse(JSON.stringify(x))}catch{return x}}
  function persist(){try{if(typeof save==="function")save()}catch{}}
  function currentDisplay(d){
    if(!d)return {text:"",type:""};
    const h=clean(d.referralSource),f=clean(d.funeralHome),t=d.transportPickupType;
    if(t==="h"&&h)return {text:h,type:"h"};
    if(t==="f"&&f)return {text:f,type:"f"};
    if(h&&!f)return {text:h,type:"h"};
    if(f&&!h)return {text:f,type:"f"};
    return {text:"",type:""};
  }
  function syncFromDonor(force){
    const input=document.getElementById("pickupLocation");
    if(!input)return;
    let id=null;try{id=activeId}catch{}
    if(!force&&id===lastActiveId&&document.activeElement===input)return;
    lastActiveId=id;
    const d=donor(),v=currentDisplay(d);
    input.value=v.text;
    input.dataset.pickupType=v.type;
    const hint=document.getElementById("pickupLocationHint");
    if(hint)hint.textContent=v.type==="h"?"Hospital":v.type==="f"?"Funeral Home":"Search hospitals and funeral homes";
  }
  function findRecord(list,id,name){
    const records=Array.isArray(list)?list:[];
    if(String(id||"").trim()){
      const byId=records.find(record=>String(record.id||"")===String(id));
      if(byId)return byId;
    }
    const target=key(name);
    return target?records.find(record=>key(record.name)===target)||null:null;
  }
  function selectLocation(type,id,name){
    const d=donor(),all=getDirs(),list=type==="h"?(all.hospitals||[]):(all.funerals||[]),x=findRecord(list,id,name);
    if(!d||!x)return;
    const h=document.getElementById("referralSource"),f=document.getElementById("funeralHome");
    if(type==="h"){
      if(h)h.value=x.name||""; if(f)f.value="";
      d.referralSource=x.name||""; d.hospitalSnapshot=clone(x);
      d.funeralHome=""; d.funeralSnapshot=null; d.transportPickupType="h";
    }else{
      if(f)f.value=x.name||""; if(h)h.value="";
      d.funeralHome=x.name||""; d.funeralSnapshot=clone(x);
      d.referralSource=""; d.hospitalSnapshot=null; d.transportPickupType="f";
    }
    const input=document.getElementById("pickupLocation");if(input){input.value=x.name||"";input.dataset.pickupType=type}
    const hint=document.getElementById("pickupLocationHint");if(hint)hint.textContent=type==="h"?"Hospital":"Funeral Home";
    const box=document.getElementById("pickupLocationSugs");if(box)box.classList.add("hidden");
    persist();
  }
  function suggestions(){
    const input=document.getElementById("pickupLocation"),box=document.getElementById("pickupLocationSugs");if(!input||!box)return;
    const q=key(input.value);if(!q){box.classList.add("hidden");box.innerHTML="";return}
    const all=getDirs(),rows=[];
    for(const x of (all.hospitals||[])){
      const hay=key([x.name,x.code,x.cityCounty,x.address].join(" "));if(hay.includes(q))rows.push({type:"h",x,where:x.cityCounty||x.address||""});
    }
    for(const x of (all.funerals||[])){
      const hay=key([x.name,x.location,x.ctms,x.address].join(" "));if(hay.includes(q))rows.push({type:"f",x,where:x.location||x.address||""});
    }
    rows.sort((a,b)=>String(a.x.name||"").localeCompare(String(b.x.name||"")));
    const hits=rows.slice(0,18);
    box.innerHTML=hits.map(r=>`<div class="sug pickup-sug" data-pickup-type="${r.type}" data-pickup-id="${esc(r.x.id)}" data-pickup-name="${esc(r.x.name)}"><strong>${esc(r.x.name)}</strong><span><b>${r.type==="h"?"HOSPITAL":"FUNERAL HOME"}</b>${r.where?` · ${esc(r.where)}`:""}${r.type==="f"&&r.x.ctms?` · CTMS ${esc(r.x.ctms)}`:""}</span></div>`).join("");
    box.classList.toggle("hidden",!hits.length);
  }
  function install(){
    if(installed)return true;
    const h=document.getElementById("referralSource"),f=document.getElementById("funeralHome");if(!h||!f)return false;
    const hw=h.closest(".fg"),fw=f.closest(".fg"),row=hw&&hw.parentElement;if(!hw||!fw||!row)return false;
    const style=document.createElement("style");style.id="pickupLocationStyle";style.textContent=`#pickupLocationWrap{grid-column:1/-1;position:relative}#pickupLocationHint{margin-top:4px}.pickup-sug span b{font-size:10px;letter-spacing:.04em;color:#0b63ce}.legacy-location-field{display:none!important}`;document.head.appendChild(style);
    hw.classList.add("legacy-location-field");fw.classList.add("legacy-location-field");
    const wrap=document.createElement("div");wrap.id="pickupLocationWrap";wrap.className="fg auto";wrap.innerHTML='<label>Pickup Location</label><input id="pickupLocation" autocomplete="off" placeholder="Search hospital or funeral home..."><div id="pickupLocationHint" class="small">Search hospitals and funeral homes</div><div id="pickupLocationSugs" class="sugs hidden"></div>';
    row.insertBefore(wrap,hw);
    const input=document.getElementById("pickupLocation"),box=document.getElementById("pickupLocationSugs");
    input.addEventListener("input",()=>{input.dataset.pickupType="";suggestions()});
    input.addEventListener("focus",()=>{if(input.value.trim())suggestions()});
    input.addEventListener("blur",()=>setTimeout(()=>box.classList.add("hidden"),180));
    box.addEventListener("pointerdown",e=>{const item=e.target.closest("[data-pickup-type][data-pickup-name]");if(!item)return;e.preventDefault();selectLocation(item.dataset.pickupType,item.dataset.pickupId,item.dataset.pickupName)});
    box.addEventListener("click",e=>{const item=e.target.closest("[data-pickup-type][data-pickup-name]");if(!item)return;e.preventDefault();selectLocation(item.dataset.pickupType,item.dataset.pickupId,item.dataset.pickupName)});
    installed=true;syncFromDonor(true);
    return true;
  }
  const api={key,findRecord};
  root.PDXPickupLocation=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof window!=="undefined"&&typeof document!=="undefined"){
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>60)clearInterval(timer)},200);
    setInterval(()=>{if(!installed)return;let id=null;try{id=activeId}catch{};if(id!==lastActiveId)syncFromDonor(true)},500);
  }
})();
