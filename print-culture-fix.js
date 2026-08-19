(function(){
  "use strict";
  const BILATERAL_RE=/achilles|tibialis|gracilis|semitendinosus|peroneus|femur|tibia|fibula|humerus|radius|ulna|pelvis|knee block|ankle block|arm block|elbow block/i;
  const EXCLUDED_RE=/lemaitre|artivion|axogen/i;
  function txt(el){return (el?.textContent||"").replace(/\s+/g," ").trim()}
  function checked(el){return !!el && (!el.matches("input") || !!el.checked)}
  function labelFor(el){if(!el)return "";let l=null;try{if(el.id)l=document.querySelector('label[for="'+CSS.escape(el.id)+'"]')}catch{}return txt(l)||txt(el.closest("label"))||String(el.value||"")}
  function selected(){
    const gs=Array.isArray(window.grafts)?window.grafts:[];
    const out=[];
    for(const g of gs){
      const id=String(g?.id||""); if(!id)continue;
      const l=document.getElementById(id+"_left"),r=document.getElementById(id+"_right"),gen=document.getElementById("recover_"+id)||document.getElementById(id);
      let units=0;
      if(l||r)units=(checked(l)?1:0)+(checked(r)?1:0);
      else if(checked(gen))units=BILATERAL_RE.test(String(g?.name||""))?2:1;
      if(!units)continue;
      const scope=gen?.closest(".proc,.check,.radio,.graft,.row")||l?.closest(".proc,.check,.radio,.graft,.row")||r?.closest(".proc,.check,.radio,.graft,.row");
      let processor=[String(g?.processor||""),String(g?.name||""),txt(scope)].join(" ");
      scope?.querySelectorAll("input:checked,option:checked").forEach(x=>processor+=" "+labelFor(x)+" "+String(x.value||""));
      out.push({name:String(g?.name||""),units,processor});
    }
    return out;
  }
  function total(){
    let n=0;
    for(const x of selected()){
      if(/adipose/i.test(x.name)){n+=3;continue}
      if(EXCLUDED_RE.test(x.processor))continue;
      n+=x.units;
    }
    return n;
  }
  function replaceRow(label,value){
    const re=new RegExp("^"+label+"\\s*[:\\-]?\\s*(?:\\d+(?:\\s*\\/\\s*\\d+){0,3})\\s*$","i");
    const countRe=/\d+(?:\s*\/\s*\d+){0,3}\s*$/;
    document.querySelectorAll("div,span,li,td,p").forEach(el=>{
      if(el.children.length>2)return;
      const t=txt(el); if(!re.test(t))return;
      const next=t.replace(countRe,String(value));

      // Stay idempotent. Rewriting identical text retriggers the MutationObserver
      // forever and can leave iOS Safari too busy to respond to the print tap.
      if(next===t)return;

      // Preserve the supply-row markup when the quantity has its own element.
      // This also limits the mutation to the value that actually changed.
      const leaves=[...el.querySelectorAll("strong,.qty,span,div")]
        .filter(node=>!node.children.length&&/^\d+(?:\s*\/\s*\d+){0,3}$/.test(txt(node)));
      const quantity=leaves[leaves.length-1];
      if(quantity){
        if(txt(quantity)!==String(value))quantity.textContent=String(value);
        return;
      }

      el.textContent=next;
    });
  }
  function fix(){const n=total(); if(!n)return; replaceRow("TSB",n);replaceRow("Thio(?:glycollate)?",n)}
  const originalPrint=window.print;
  if(typeof originalPrint==="function"&&!originalPrint.__culturePrintFix){
    const wrapped=function(){fix();return originalPrint.apply(this,arguments)};
    wrapped.__culturePrintFix=true;window.print=wrapped;
  }
  window.addEventListener("beforeprint",fix);
  document.addEventListener("click",()=>{fix();setTimeout(fix,0);setTimeout(fix,50)},true);
  const mo=new MutationObserver(()=>fix());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  fix();
})();
