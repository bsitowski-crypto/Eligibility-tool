(function(){
  "use strict";

  const STORAGE_KEY="solvita_v9108_transport_companies";
  const ADMIN_EMAIL="bsitowski@gmail.com";
  const SOLVITA_FALLBACK="18111 NE Sandy Blvd, Portland, OR 97230";
  const DISPATCH_MIN=15;
  const FUNERAL_LOAD_MIN=15;
  const HOSPITAL_LOAD_MIN=30;
  let companies=[];

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function isAdmin(){
    try{return !!(window.firebase&&firebase.auth().currentUser&&String(firebase.auth().currentUser.email||"").toLowerCase()===ADMIN_EMAIL)}catch{return false}
  }
  function loadCompanies(){try{companies=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(!Array.isArray(companies))companies=[]}catch{companies=[]}}
  function saveCompanies(){localStorage.setItem(STORAGE_KEY,JSON.stringify(companies))}
  function fmtMin(min){min=Math.max(0,Math.round(Number(min)||0));const h=Math.floor(min/60),m=min%60;return h?`${h} hr${h===1?"":"s"}${m?` ${m} min`:""}`:`${m} min`}
  function fmtClock(d){return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}
  function addMin(d,m){return new Date(d.getTime()+m*60000)}

  function addStyles(){
    if(document.getElementById("transportPlannerStyle"))return;
    const s=document.createElement("style");s.id="transportPlannerStyle";s.textContent=`
#transportModal{position:fixed;inset:0;z-index:2200;background:#071f3eee;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
#transportModal.hidden{display:none!important}.tp-box{width:min(650px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-sizing:border-box;color:#172033;box-shadow:0 20px 60px #0006}.tp-box h2{margin:0 0 5px;color:#071f3e}.tp-box h3{margin:20px 0 8px;color:#071f3e}.tp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tp-field{display:flex;flex-direction:column;gap:5px}.tp-field.full{grid-column:1/-1}.tp-field label{font-size:12px;font-weight:800;color:#556}.tp-field input,.tp-field select{width:100%;box-sizing:border-box;padding:11px;border:1px solid #c9ced6;border-radius:9px;background:#fff;color:#111;font-size:16px}.tp-primary,.tp-secondary,.tp-danger,.tp-close{border:0;border-radius:10px;padding:12px 14px;font-weight:800;min-height:44px}.tp-primary{background:#0b63ce;color:#fff;width:100%;margin-top:12px}.tp-secondary{background:#eaf2fb;color:#0b4f9c}.tp-danger{background:#fff0f0;color:#a11}.tp-close{width:100%;background:#68707a;color:#fff;margin-top:12px}.tp-summary{margin-top:14px;border:1px solid #dbe2ea;border-radius:13px;overflow:hidden}.tp-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid #edf0f3}.tp-row:last-child{border-bottom:0}.tp-row strong{text-align:right}.tp-total{background:#eef6ff;font-size:17px}.tp-timeline{margin-top:12px;padding:12px;border-radius:12px;background:#f7f7fa;line-height:1.65}.tp-note{font-size:12px;color:#667;line-height:1.4;margin-top:8px}.tp-error{display:none;margin-top:12px;padding:10px;border-radius:9px;background:#fff0f0;color:#8a1d1d}.tp-company{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #eee}.tp-company-main{min-width:0}.tp-company-name{font-weight:800}.tp-company-base{font-size:12px;color:#667;overflow-wrap:anywhere}.tp-actions{display:flex;gap:6px;flex-shrink:0}.tp-actions button{padding:7px 9px;min-height:36px}.tp-admin{display:none}.tp-empty{padding:12px;background:#fff7e6;border-radius:10px;color:#6d4c00}.tp-pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#edf2f7;color:#4a5568;font-size:11px;font-weight:800;margin-bottom:8px}
@media(max-width:600px){.tp-grid{grid-template-columns:1fr}.tp-field.full{grid-column:auto}.tp-box{padding:16px;border-radius:15px}}
`;
    document.head.appendChild(s);
  }

  function installUI(){
    if(document.getElementById("transportModal"))return;
    addStyles();
    const modal=document.createElement("div");modal.id="transportModal";modal.className="hidden";
    modal.innerHTML=`<div class="tp-box">
      <h2>Transport Planner</h2>
      <div class="tp-pill">TRAFFIC-FREE ESTIMATE</div>
      <div class="tp-note">Estimate = 15 min driver departure + drive to donor + loading + drive to Solvita. Hospital loading: 30 min. Funeral-home loading: 15 min.</div>
      <div class="tp-grid" style="margin-top:14px">
        <div class="tp-field full"><label>TRANSPORT COMPANY</label><select id="tpCompany"></select></div>
        <div class="tp-field"><label>DONOR LOCATION TYPE</label><select id="tpType"><option value="h">Hospital</option><option value="f">Funeral Home</option></select></div>
        <div class="tp-field"><label>DONOR LOCATION</label><select id="tpLocation"></select></div>
      </div>
      <button id="tpCalculate" class="tp-primary" type="button">CALCULATE TRANSPORT ESTIMATE</button>
      <div id="tpError" class="tp-error"></div>
      <div id="tpResult"></div>

      <div id="tpAdminSection" class="tp-admin">
        <h3>Transport Companies</h3>
        <div class="tp-note">The base location is where the driver is assumed to start. Use a full street address when possible.</div>
        <div id="tpCompanyList"></div>
        <div class="tp-grid" style="margin-top:10px">
          <div class="tp-field"><label>COMPANY NAME</label><input id="tpNewName" placeholder="Company name"></div>
          <div class="tp-field"><label>DISPATCH PHONE (OPTIONAL)</label><input id="tpNewPhone" placeholder="Phone"></div>
          <div class="tp-field full"><label>BASE / STARTING ADDRESS</label><input id="tpNewBase" placeholder="Street address, city, state ZIP"></div>
        </div>
        <input id="tpEditId" type="hidden">
        <button id="tpSaveCompany" class="tp-secondary" style="width:100%;margin-top:10px" type="button">ADD TRANSPORT COMPANY</button>
      </div>
      <button id="tpClose" class="tp-close" type="button">CLOSE</button>
    </div>`;
    document.body.appendChild(modal);

    const head=document.querySelector("header .head")||document.querySelector("header");
    if(head){const b=document.createElement("button");b.id="transportPlannerBtn";b.type="button";b.textContent="TRANSPORT";b.className="collab-btn";b.onclick=openPlanner;head.appendChild(b)}

    document.getElementById("tpClose").onclick=()=>modal.classList.add("hidden");
    document.getElementById("tpType").onchange=populateLocations;
    document.getElementById("tpCalculate").onclick=calculate;
    document.getElementById("tpSaveCompany").onclick=saveCompanyFromForm;
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
    loadCompanies();renderCompanies();populateCompanySelect();populateLocations();
  }

  function getDirs(){try{return dirs&&dirs.hospitals&&dirs.funerals?dirs:{hospitals:[],funerals:[]}}catch{return {hospitals:[],funerals:[]}}}
  function populateCompanySelect(){
    const el=document.getElementById("tpCompany");if(!el)return;const old=el.value;
    el.innerHTML='<option value="">Select transport company…</option>'+companies.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    if([...el.options].some(o=>o.value===old))el.value=old;
  }
  function populateLocations(){
    const type=document.getElementById("tpType")?.value||"h",d=getDirs(),list=type==="h"?d.hospitals:d.funerals,el=document.getElementById("tpLocation");if(!el)return;const old=el.value;
    el.innerHTML='<option value="">Select '+(type==="h"?'hospital':'funeral home')+'…</option>'+list.slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""))).map(r=>`<option value="${esc(r.id)}">${esc(r.name||"Unnamed")}</option>`).join("");
    if([...el.options].some(o=>o.value===old))el.value=old;
  }
  function openPlanner(){
    loadCompanies();populateCompanySelect();populateLocations();renderCompanies();
    document.getElementById("tpAdminSection").style.display=isAdmin()?"block":"none";
    document.getElementById("transportModal").classList.remove("hidden");
  }

  function renderCompanies(){
    const box=document.getElementById("tpCompanyList");if(!box)return;
    if(!companies.length){box.innerHTML='<div class="tp-empty">No transport companies have been added yet.</div>';return}
    box.innerHTML="";
    companies.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
      const row=document.createElement("div");row.className="tp-company";
      row.innerHTML=`<div class="tp-company-main"><div class="tp-company-name">${esc(c.name)}</div><div class="tp-company-base">${esc(c.base)}</div>${c.phone?`<div class="tp-company-base">${esc(c.phone)}</div>`:""}</div><div class="tp-actions"><button class="tp-secondary" type="button">EDIT</button><button class="tp-danger" type="button">DELETE</button></div>`;
      const [edit,del]=row.querySelectorAll("button");edit.onclick=()=>editCompany(c.id);del.onclick=()=>deleteCompany(c.id);box.appendChild(row);
    });
  }
  function editCompany(id){const c=companies.find(x=>x.id===id);if(!c)return;document.getElementById("tpEditId").value=id;document.getElementById("tpNewName").value=c.name||"";document.getElementById("tpNewPhone").value=c.phone||"";document.getElementById("tpNewBase").value=c.base||"";document.getElementById("tpSaveCompany").textContent="SAVE TRANSPORT COMPANY"}
  function deleteCompany(id){if(!isAdmin())return;const c=companies.find(x=>x.id===id);if(!c||!confirm(`Delete ${c.name}?`))return;companies=companies.filter(x=>x.id!==id);saveCompanies();renderCompanies();populateCompanySelect()}
  function saveCompanyFromForm(){
    if(!isAdmin())return;
    const id=document.getElementById("tpEditId").value,name=document.getElementById("tpNewName").value.trim(),phone=document.getElementById("tpNewPhone").value.trim(),base=document.getElementById("tpNewBase").value.trim();
    if(!name||!base){alert("Enter the company name and its base/starting address.");return}
    if(id){const c=companies.find(x=>x.id===id);if(c)Object.assign(c,{name,phone,base})}else companies.push({id:"tc"+Date.now(),name,phone,base});
    saveCompanies();document.getElementById("tpEditId").value="";document.getElementById("tpNewName").value="";document.getElementById("tpNewPhone").value="";document.getElementById("tpNewBase").value="";document.getElementById("tpSaveCompany").textContent="ADD TRANSPORT COMPANY";renderCompanies();populateCompanySelect();
  }

  async function route(origin,destination){
    const url=`https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&steps=false`;
    const r=await fetch(url);if(!r.ok)throw new Error("Routing request failed: "+r.status);const data=await r.json();if(data.code!=="Ok"||!data.routes?.length)throw new Error("No driving route found");const x=data.routes[0];return {miles:Math.round((x.distance/1609.344)*10)/10,minutes:Math.max(1,Math.round(x.duration/60))};
  }
  async function geo(query){
    try{return await geocodePlace(query)}catch{
      const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q="+encodeURIComponent(query);const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Unable to locate "+query);const d=await r.json();if(!d.length)throw new Error("No map match for "+query);return {lat:Number(d[0].lat),lon:Number(d[0].lon),displayName:d[0].display_name||query};
    }
  }
  function locationQuery(type,record){
    try{return facilityQuery(type,record)}catch{return type==="h"?[record.name,record.cityCounty].filter(Boolean).join(", "):[record.name,record.location].filter(Boolean).join(", ")}
  }

  async function calculate(){
    const company=companies.find(c=>c.id===document.getElementById("tpCompany").value),type=document.getElementById("tpType").value,id=document.getElementById("tpLocation").value,d=getDirs(),record=(type==="h"?d.hospitals:d.funerals).find(x=>String(x.id)===String(id));
    const err=document.getElementById("tpError"),out=document.getElementById("tpResult"),btn=document.getElementById("tpCalculate");err.style.display="none";out.innerHTML="";
    if(!company){err.textContent="Select a transport company.";err.style.display="block";return}if(!record){err.textContent="Select the donor's hospital or funeral home.";err.style.display="block";return}
    btn.disabled=true;btn.textContent="CALCULATING ROUTE…";
    try{
      const solvitaQuery=(typeof SOLVITA_ORIGIN_QUERY!=="undefined"&&SOLVITA_ORIGIN_QUERY)||SOLVITA_FALLBACK;
      const donorQuery=locationQuery(type,record);
      const [basePt,donorPt,solvitaPt]=await Promise.all([geo(company.base),geo(donorQuery),geo(solvitaQuery)]);
      const [leg1,leg2]=await Promise.all([route(basePt,donorPt),route(donorPt,solvitaPt)]);
      const load=type==="h"?HOSPITAL_LOAD_MIN:FUNERAL_LOAD_MIN,total=DISPATCH_MIN+leg1.minutes+load+leg2.minutes,totalMiles=Math.round((leg1.miles+leg2.miles)*10)/10;
      const now=new Date(),leave=addMin(now,DISPATCH_MIN),pickup=addMin(leave,leg1.minutes),depart=addMin(pickup,load),arrive=addMin(depart,leg2.minutes);
      out.innerHTML=`<div class="tp-summary">
        <div class="tp-row"><span>Driver departure allowance</span><strong>${DISPATCH_MIN} min</strong></div>
        <div class="tp-row"><span>${esc(company.name)} → ${esc(record.name)}</span><strong>${fmtMin(leg1.minutes)} · ${leg1.miles} mi</strong></div>
        <div class="tp-row"><span>${type==="h"?"Hospital":"Funeral home"} loading allowance</span><strong>${load} min</strong></div>
        <div class="tp-row"><span>${esc(record.name)} → Solvita</span><strong>${fmtMin(leg2.minutes)} · ${leg2.miles} mi</strong></div>
        <div class="tp-row tp-total"><span>Estimated total</span><strong>${fmtMin(total)} · ${totalMiles} mi</strong></div>
      </div><div class="tp-timeline"><strong>Estimated timeline if dispatched now</strong><br>Driver leaves base: ${fmtClock(leave)}<br>Arrives at donor: ${fmtClock(pickup)}<br>Leaves with donor: ${fmtClock(depart)}<br><strong>Arrives at Solvita: ${fmtClock(arrive)}</strong></div><div class="tp-note">This is a traffic-free routing estimate. It does not account for congestion, weather, closures, dispatch delays beyond 15 minutes, or unusually long facility release/loading times.</div>`;
    }catch(e){err.textContent="Unable to calculate this route: "+(e.message||e);err.style.display="block"}
    finally{btn.disabled=false;btn.textContent="CALCULATE TRANSPORT ESTIMATE"}
  }

  const timer=setInterval(()=>{if(document.body&&document.querySelector("header")){clearInterval(timer);installUI()}},200);setTimeout(()=>clearInterval(timer),15000);
})();
