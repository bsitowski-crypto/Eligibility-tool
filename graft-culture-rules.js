(function(){
  "use strict";

  const BILATERAL_RE=/achilles|tibialis|gracilis|semitendinosus|peroneus|femur|tibia|fibula|humerus|radius|ulna|pelvis|fascia|knee block|ankle block|arm block|elbow block/i;
  const BLADE_GRAFT_RE=/achilles|tibialis|gracilis|semitendinosus|peroneus|femur|tibia|fibula|humerus|radius|ulna|pelvis|fascia|knee block|ankle block|arm block|elbow block/i;
  const EXCLUDED_PROCESSOR_RE=/lemaitre|artivion|axogen/i;

  function text(el){return (el?.textContent||"").replace(/\s+/g," ").trim()}
  function graftsList(){try{return Array.isArray(window.grafts)?window.grafts:[]}catch{return []}}
  function checked(el){return !!el && (!el.matches("input") || !!el.checked)}

  function labelFor(input){
    if(!input)return "";
    let explicit=null;
    try{if(input.id)explicit=document.querySelector('label[for="'+CSS.escape(input.id)+'"]')}catch{}
    return text(explicit)||text(input.closest("label"))||String(input.value||"");
  }

  function processorText(g,probes){
    const bits=[String(g?.processor||""),String(g?.name||"")];
    for(const p of probes){
      const scope=p?.closest(".proc,.check,.radio,.graft,.row")||p?.parentElement;
      if(!scope)continue;
      bits.push(text(scope));
      scope.querySelectorAll("input:checked,option:checked").forEach(x=>bits.push(labelFor(x),String(x.value||"")));
    }
    return bits.join(" ");
  }

  function selectedUnits(){
    const out=[];
    for(const g of graftsList()){
      const id=String(g?.id||""); if(!id)continue;
      const left=document.getElementById(id+"_left");
      const right=document.getElementById(id+"_right");
      const generic=document.getElementById("recover_"+id)||document.getElementById(id);
      const sideInputs=[left,right].filter(Boolean);
      let units=0;
      if(sideInputs.length){units=(checked(left)?1:0)+(checked(right)?1:0)}
      else if(checked(generic)){units=BILATERAL_RE.test(String(g?.name||""))?2:1}
      if(units)out.push({g,units,processor:processorText(g,[...sideInputs,generic].filter(Boolean))});
    }
    return out;
  }

  function cultureTotals(){
    let tsb=0,thio=0;
    for(const x of selectedUnits()){
      const name=String(x.g?.name||"");
      if(/adipose/i.test(name)){tsb+=3;thio+=3;continue}
      if(EXCLUDED_PROCESSOR_RE.test(x.processor))continue;
      tsb+=x.units;thio+=x.units;
    }
    return {tsb,thio};
  }

  function hasSelectedSkin(){return selectedUnits().some(x=>!!x.g?.skin||/skin/i.test(String(x.g?.name||"")))}
  function bladeCount(){
    if(!hasSelectedSkin())return null;
    const msUnits=selectedUnits().reduce((n,x)=>n+(BLADE_GRAFT_RE.test(String(x.g?.name||""))?x.units:0),0);
    if(msUnits>0)return 6+(2*msUnits);
    const zones=[...document.querySelectorAll('input[type="checkbox"]:checked')].filter(x=>/anterior trunk|posterior trunk|leg skin|skin zone/i.test(labelFor(x)));
    return Math.max(1,zones.length)*2;
  }

  function replaceSimpleCount(root,re,value){root.querySelectorAll("div,span,li,td,p").forEach(el=>{if(el.children.length>2)return;const t=text(el);if(!re.test(t))return;const m=t.match(/^(.*?)(\d+)\s*$/);if(m)el.textContent=m[1]+value})}
  function cultureHost(){const els=[...document.querySelectorAll("h1,h2,h3,h4,strong,.title,.section-title,div")];const h=els.find(el=>/culture tubes?|culture tube summary/i.test(text(el)));if(h)return h.closest(".card,.section,.result")||h.parentElement;return els.find(el=>/\bTSB\b/i.test(text(el))&&/\bthio\b/i.test(text(el)))?.closest(".card,.section,.result")||null}
  function supplyHost(){const els=[...document.querySelectorAll("h1,h2,h3,h4,strong,.title,.section-title,div")];const h=els.find(el=>/suppl(?:y|ies)|pull list/i.test(text(el)));return h?.closest(".card,.section,.result")||h?.parentElement||document}
  function renderCulture(){const host=cultureHost();if(!host)return;const {tsb,thio}=cultureTotals();replaceSimpleCount(host,/^TSB\s*[:\-]?\s*\d+$/i,tsb);replaceSimpleCount(host,/^Thio(?:glycollate)?\s*[:\-]?\s*\d+$/i,thio);let box=document.getElementById("correctCultureTubeTotals");if(!box){box=document.createElement("div");box.id="correctCultureTubeTotals";box.style.cssText="margin-top:8px;padding:8px 10px;border-radius:9px;background:#f2f7ff;font-size:13px";host.appendChild(box)}box.innerHTML='<strong>Culture tubes:</strong> '+tsb+' TSB + '+thio+' Thio'}
  function renderBlades(){const count=bladeCount();if(count==null)return;const host=supplyHost();host.querySelectorAll("div,span,li,td,p").forEach(el=>{if(el.children.length>3)return;const t=text(el);if(!/scalpel blade/i.test(t))return;const m=t.match(/^(.*?scalpel blades?\s*[:x×\-]?\s*)(\d+)(.*)$/i);if(m)el.textContent=m[1]+count+m[3]})}
  function compactTendons(){document.querySelectorAll("div,span,li,td,p").forEach(el=>{if(el.children.length)return;if(!/^all tendons$/i.test(text(el)))return;const context=text(el.closest(".card,.section,.result")||el.parentElement);if(!/valid|recover|graft|print/i.test(context))return;el.innerHTML="Achilles<br>All Other Tendons"})}
  let queued=false;function refresh(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;compactTendons();renderCulture();renderBlades()})}
  function wrap(name){const fn=window[name];if(typeof fn!=="function"||fn.__bilateralSupplyPatch)return;const wrapped=function(){const out=fn.apply(this,arguments);setTimeout(refresh,0);return out};wrapped.__bilateralSupplyPatch=true;window[name]=wrapped}
  function install(){["screenDonor","loadDonor","renderRecovery","renderSupplies","renderCultureTubes","renderValidatedGrafts"].forEach(wrap);document.addEventListener("change",refresh,true);document.addEventListener("click",()=>setTimeout(refresh,0),true);refresh()}
  let tries=0;const timer=setInterval(()=>{tries++;if(graftsList().length||tries>50){clearInterval(timer);install()}},120);
})();