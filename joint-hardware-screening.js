(function(){
  "use strict";

  const STYLE_ID="jointHardwareScreeningStyle";
  const CARD_ID="jointHardwareScreening";
  const BANNER_ID="jointHardwareResult";

  function donor(){
    try{return typeof cur==="function"?cur():null}catch{return null}
  }
  function years(){
    try{return typeof donorAgeYears==="function"?donorAgeYears():null}catch{return null}
  }
  function state(d){
    const x=d?.jointHardware&&typeof d.jointHardware==="object"?d.jointHardware:{};
    return {
      has:x.has==="yes"?"yes":"no",
      hips:Math.max(0,Math.min(2,Number(x.hips)||0)),
      knees:Math.max(0,Math.min(2,Number(x.knees)||0)),
      ankle:!!x.ankle,
      shoulder:!!x.shoulder,
      hardware:Array.isArray(x.hardware)?x.hardware:[]
    };
  }
  function saveState(){
    const d=donor(); if(!d)return;
    const el=id=>document.getElementById(id);
    d.jointHardware={
      has:el("jhHas")?.value||"no",
      hips:Number(el("jhHips")?.value||0),
      knees:Number(el("jhKnees")?.value||0),
      ankle:!!el("jhAnkle")?.checked,
      shoulder:!!el("jhShoulder")?.checked,
      hardware:[...document.querySelectorAll("[data-jh-hardware]:checked")].map(x=>x.value)
    };
    try{save()}catch{}
    refreshVisibility();
  }
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement("style"); s.id=STYLE_ID;
    s.textContent=`
      #${CARD_ID}{margin-top:14px;padding:14px;border:1px solid #d6d6dc;border-radius:12px;background:#f8fbff}
      #${CARD_ID} .jh-title{font-weight:850;color:#071f3e;margin-bottom:8px}
      #${CARD_ID} .jh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${CARD_ID} .jh-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;margin-top:8px}
      #${CARD_ID} .jh-check{display:flex;align-items:center;gap:7px;padding:5px 0;font-size:13px}
      #${CARD_ID} .jh-check input{width:18px;height:18px;flex:0 0 18px;margin:0}
      #${CARD_ID} .jh-check label{margin:0;font-weight:600}
      #${BANNER_ID}{margin:10px 0 0;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.4}
      #${BANNER_ID}.accept{background:#edf8ef;border-left:5px solid #2e8b57}
      #${BANNER_ID}.consult{background:#fff7dc;border-left:5px solid #d89b00}
      #${BANNER_ID}.defer{background:#fff0f0;border-left:5px solid #c93535}
      @media(max-width:600px){#${CARD_ID} .jh-grid,#${CARD_ID} .jh-checks{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }
  function inject(){
    if(document.getElementById(CARD_ID))return true;
    const organ=document.getElementById("organDonor");
    if(!organ)return false;
    const screeningCard=organ.closest(".card");
    const screenBtn=[...screeningCard.querySelectorAll("button")].find(b=>/SCREEN \/ REFRESH RECOVERY PLAN/i.test(b.textContent||""));
    if(!screenBtn)return false;
    injectStyle();
    const box=document.createElement("div"); box.id=CARD_ID;
    box.innerHTML=`
      <div class="jh-title">Joint Replacement / Hardware</div>
      <div class="fg"><label>Any joint replacements or orthopedic hardware?</label>
        <select id="jhHas"><option value="no">No</option><option value="yes">Yes</option></select>
      </div>
      <div id="jhDetails" class="hidden">
        <div class="small" style="margin-bottom:8px">Select everything known. Screening follows the 06/25/2026 MS joint replacement / hardware work aid.</div>
        <div class="jh-grid">
          <div class="fg"><label>Hip replacements</label><select id="jhHips"><option value="0">None</option><option value="1">1 hip</option><option value="2">2 hips</option></select></div>
          <div class="fg"><label>Knee replacements</label><select id="jhKnees"><option value="0">None</option><option value="1">1 knee</option><option value="2">2 knees</option></select></div>
        </div>
        <div class="jh-checks">
          <div class="jh-check"><input id="jhAnkle" type="checkbox"><label for="jhAnkle">Ankle replacement</label></div>
          <div class="jh-check"><input id="jhShoulder" type="checkbox"><label for="jhShoulder">Shoulder replacement</label></div>
        </div>
        <div style="font-weight:800;margin-top:12px">Hardware</div>
        <div class="jh-checks">
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="externalLower" id="jhExt"><label for="jhExt">External fixator — lower extremity</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="pins" id="jhPins"><label for="jhPins">Pins</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="plates" id="jhPlates"><label for="jhPlates">Plates</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="orifAnkle" id="jhOrifA"><label for="jhOrifA">ORIF — ankle</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="orifFemur" id="jhOrifF"><label for="jhOrifF">ORIF — femur</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="orifTibFib" id="jhOrifT"><label for="jhOrifT">ORIF — tibia/fibula</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="rodUpper" id="jhRodU"><label for="jhRodU">Rod — upper extremity</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="rodLower" id="jhRodL"><label for="jhRodL">Rod — lower extremity</label></div>
          <div class="jh-check"><input data-jh-hardware type="checkbox" value="screws" id="jhScrews"><label for="jhScrews">Screws</label></div>
        </div>
      </div>
      <div id="${BANNER_ID}" class="hidden"></div>
    `;
    screeningCard.insertBefore(box,screenBtn);
    box.addEventListener("change",saveState);
    loadState(donor());
    return true;
  }
  function loadState(d){
    if(!document.getElementById(CARD_ID))return;
    const x=state(d), el=id=>document.getElementById(id);
    el("jhHas").value=x.has; el("jhHips").value=String(x.hips); el("jhKnees").value=String(x.knees);
    el("jhAnkle").checked=x.ankle; el("jhShoulder").checked=x.shoulder;
    document.querySelectorAll("[data-jh-hardware]").forEach(c=>c.checked=x.hardware.includes(c.value));
    refreshVisibility();
  }
  function evaluate(){
    const d=donor(),x=state(d),a=years();
    if(x.has!=="yes")return{level:"accept",text:"No joint replacement / hardware restriction selected."};
    if(a==null)return{level:"consult",text:"Enter donor age to evaluate the joint replacement / hardware rule."};
    const s=(document.getElementById("sex")?.value||d?.sex||"").toLowerCase();
    const deferHardware=new Set(["externalLower","orifFemur","orifTibFib","rodLower"]);
    const bad=x.hardware.filter(v=>deferHardware.has(v));
    if(bad.length){
      const names={externalLower:"lower-extremity external fixator",orifFemur:"femur ORIF",orifTibFib:"tibia/fibula ORIF",rodLower:"lower-extremity rod"};
      return{level:"defer",text:`Defer MS tissue because of ${bad.map(v=>names[v]).join(", ")}. Donors age 40 and under may still be evaluated for OCA.`};
    }
    if(x.hips>0){
      if(s==="female"){
        if(a<=40)return{level:"consult",text:"Female age 40 or under with a hip replacement: CONSULT for MS tissue."};
        return{level:"defer",text:"Female age 41 or over with a hip replacement: DEFER MS tissue."};
      }
      if(s==="male"){
        if(a>=66)return{level:"defer",text:"Male age 66 or over with any hip replacement: DEFER MS tissue."};
        if(x.hips>=2 || (x.hips>=1&&x.knees>=1)){
          if(a<=40)return{level:"consult",text:"Male age 40 or under with 2 hip replacements or a hip + knee replacement: CONSULT for MS tissue."};
          return{level:"defer",text:"Male age 41–65 with 2 hip replacements or a hip + knee replacement: DEFER MS tissue."};
        }
      }
    }
    return{level:"accept",text:"Selected joint replacement / hardware is acceptable under the programmed work-aid rules."};
  }
  function refreshVisibility(){
    const has=document.getElementById("jhHas")?.value==="yes";
    document.getElementById("jhDetails")?.classList.toggle("hidden",!has);
    showBanner(evaluate());
  }
  function showBanner(r){
    const b=document.getElementById(BANNER_ID); if(!b)return;
    if(document.getElementById("jhHas")?.value!=="yes"){b.className="hidden";b.textContent="";return}
    b.className=r.level; b.innerHTML=`<strong>${r.level==="defer"?"DEFER MS":r.level==="consult"?"CONSULT MS":"ACCEPT"}</strong><br>${r.text}`;
  }
  function applyRestriction(){
    const r=evaluate(); showBanner(r);
    const old=document.getElementById("jhRecoveryBanner"); if(old)old.remove();
    if(r.level==="accept")return;
    const recovery=document.getElementById("recoveryCard"); if(!recovery)return;
    const banner=document.createElement("div"); banner.id="jhRecoveryBanner";
    banner.className="result "+(r.level==="defer"?"bad":"warn");
    banner.innerHTML=`<strong>${r.level==="defer"?"JOINT/HARDWARE — DEFER MS":"JOINT/HARDWARE — CONSULT MS"}</strong><div class="small" style="margin-top:4px">${r.text}</div>`;
    recovery.insertBefore(banner,recovery.children[1]||null);
    if(r.level!=="defer")return;
    const a=years();
    try{
      const deferred=grafts.filter(g=>g.group==="internal"&&!g.skin && !(a<=40&&g.oca));
      for(const g of deferred){
        const probes=[document.getElementById("recover_"+g.id),document.getElementById(g.id+"_left"),document.getElementById(g.id+"_right")].filter(Boolean);
        probes.forEach(p=>{const row=p.closest(".proc,.check,.radio"); if(row){const proc=p.closest(".proc");(proc||row).remove()}});
        if(typeof lastRuledOut!=="undefined"&&!lastRuledOut.some(x=>x.id===g.id))lastRuledOut.push({id:g.id,name:g.name,reasons:["Joint replacement / hardware rule: defer MS tissue."]});
      }
      if(typeof renderRuledOut==="function")renderRuledOut();
    }catch(err){console.warn("Joint/hardware restriction display warning",err)}
  }
  function installWrappers(){
    if(typeof window.loadDonor==="function"&&!window.loadDonor.__jhWrapped){
      const orig=window.loadDonor;
      const wrapped=function(d){const out=orig.apply(this,arguments);loadState(d);setTimeout(applyRestriction,0);return out};
      wrapped.__jhWrapped=true; window.loadDonor=wrapped;
    }
    if(typeof window.screenDonor==="function"&&!window.screenDonor.__jhWrapped){
      const orig=window.screenDonor;
      const wrapped=function(){const out=orig.apply(this,arguments);applyRestriction();return out};
      wrapped.__jhWrapped=true; window.screenDonor=wrapped;
    }
  }
  function boot(){
    if(!inject())return false;
    installWrappers();
    const sex=document.getElementById("sex"),age=document.getElementById("age");
    sex?.addEventListener("change",()=>{showBanner(evaluate())});
    age?.addEventListener("input",()=>{showBanner(evaluate())});
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(boot()||tries>40)clearInterval(timer)},150);
})();
