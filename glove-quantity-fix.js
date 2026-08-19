(function(){
  "use strict";

  const HEART_IDS=new Set(["heartArtivion","heartLeMaitre"]);

  function selectedIds(recovery){
    if(Array.isArray(recovery))return recovery;
    return Array.isArray(recovery?.selected)?recovery.selected:[];
  }

  function extraPairs(recovery){
    const selected=selectedIds(recovery);
    let extra=0;
    if(selected.includes("nerves"))extra+=10;
    if(selected.some(id=>HEART_IDS.has(id)))extra+=5;
    return extra;
  }

  function extraNote(recovery){
    const selected=selectedIds(recovery);
    const parts=[];
    if(selected.includes("nerves"))parts.push("10 extra pairs for nerves");
    if(selected.some(id=>HEART_IDS.has(id)))parts.push("5 extra pairs for heart recovery");
    return parts.length?"Includes "+parts.join(" + "):"";
  }

  function adjustItems(items,recovery,techInitials,lookupGloves){
    if(!Array.isArray(items))return items;
    const extra=extraPairs(recovery);
    if(!extra)return items;

    const note=extraNote(recovery);
    const uniqueTechs=[...new Set((techInitials||[]).map(value=>String(value||"").trim()).filter(Boolean))];
    for(const initials of uniqueTechs){
      const info=typeof lookupGloves==="function"?lookupGloves(initials):null;
      const surgical=String(info?.surgical||"").trim();
      if(!surgical||surgical==="Not recorded")continue;

      // Match on technician and surgical size without depending on the dash
      // character used by the core pull-list label. This remains reliable if
      // a browser or CDN decodes that punctuation differently.
      const row=items.find(item=>{
        const name=String(item?.n||"").trim();
        return name.startsWith(initials+" ")&&name.endsWith("Size "+surgical);
      });
      if(!row||!Number.isFinite(Number(row.q)))continue;

      row.q=Number(row.q)+extra;
      const notes=[row.note,note].filter(Boolean);
      row.note=[...new Set(notes)].join(" / ");
    }
    return items;
  }

  function html(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function renderCurrent(items){
    const host=document.getElementById("supplies");
    if(!host||!items.length)return;
    host.innerHTML=`<div class="supply">${items.map(item=>`<div class="srow">
      <div><strong>${html(item.n)}</strong>${item.note?`<div class="small">${html(item.note)}</div>`:""}</div>
      <strong>${html(item.q)}</strong>
    </div>`).join("")}</div>`;
  }

  function applyExtras(recovery){
    let items;
    try{items=latestSupplyItems}catch{return}
    if(!Array.isArray(items)||!extraPairs(recovery))return;

    const techs=[
      document.getElementById("tech1")?.value,
      document.getElementById("tech2")?.value
    ];
    const lookup=typeof techGloveInfo==="function"?techGloveInfo:null;
    adjustItems(items,recovery,techs,lookup);
    renderCurrent(items);
  }

  function install(){
    const original=window.buildSupplies;
    if(typeof original!=="function"||original.__pdxGloveQuantityFix)return false;

    const wrapped=function(recovery){
      const result=original.apply(this,arguments);
      let current=recovery;
      if(!current){
        try{current=typeof getRecovery==="function"?getRecovery():null}catch{}
      }
      applyExtras(current);
      return result;
    };
    wrapped.__pdxGloveQuantityFix=true;
    window.buildSupplies=wrapped;
    return true;
  }

  window.PDXGloveQuantityFix={extraPairs,adjustItems};
  if(!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
