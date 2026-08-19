(function(){
  "use strict";

  const COVER_NAMES=new Map([
    ["mayo stand cover",{one:"Mayo Stand Cover",many:"Mayo Stand Covers"}],
    ["mayo stand covers",{one:"Mayo Stand Cover",many:"Mayo Stand Covers"}],
    ["back table cover",{one:"Back Table Cover",many:"Back Table Covers"}],
    ["back table covers",{one:"Back Table Cover",many:"Back Table Covers"}]
  ]);

  function number(value){
    if(typeof value==="number"&&Number.isFinite(value))return value;
    if(typeof value==="string"&&/^\d+(?:\.\d+)?$/.test(value.trim()))return Number(value);
    return null;
  }

  function coverName(value){
    return COVER_NAMES.get(String(value||"").trim().toLowerCase())||null;
  }

  function displayName(names,quantity){
    return quantity===1?names.one:names.many;
  }

  function normalizeItems(items){
    const output=[];
    const positions=new Map();

    for(const source of items||[]){
      const item=Object.assign({},source);
      const names=coverName(item.n);
      if(!names){
        output.push(item);
        continue;
      }

      const key=names.one.toLowerCase();
      if(!positions.has(key)){
        const quantity=number(item.q);
        item.n=displayName(names,quantity);
        positions.set(key,output.length);
        output.push(item);
        continue;
      }

      const previous=output[positions.get(key)];
      const a=number(previous.q);
      const b=number(item.q);
      if(a!==null&&b!==null)previous.q=a+b;
      else if((previous.q===null||previous.q==="")&&item.q!==null&&item.q!=="")previous.q=item.q;

      if(previous.c==="Core"&&item.c!=="Core")previous.c=item.c;
      const notes=[previous.note,item.note].filter(Boolean);
      previous.note=[...new Set(notes)].join(" • ");
      previous.n=displayName(names,number(previous.q));
    }

    return output;
  }

  function html(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalizeCurrentList(){
    if(typeof latestSupplyItems==="undefined"||!Array.isArray(latestSupplyItems))return;
    const normalized=normalizeItems(latestSupplyItems);
    latestSupplyItems.splice(0,latestSupplyItems.length,...normalized);

    const host=document.getElementById("supplies");
    if(!host||!normalized.length)return;
    host.innerHTML=`<div class="supply">${
      normalized.map(item=>`<div class="srow">
        <div><strong>${html(item.n)}</strong>${item.note?`<div class="small">${html(item.note)}</div>`:""}</div>
        <strong>${html(item.q)}</strong>
      </div>`).join("")
    }</div>`;
  }

  function install(){
    const original=window.buildSupplies;
    if(typeof original!=="function"||original.__pdxSupplyNameFix)return false;

    const wrapped=function(){
      const result=original.apply(this,arguments);
      normalizeCurrentList();
      return result;
    };
    wrapped.__pdxSupplyNameFix=true;
    window.buildSupplies=wrapped;
    normalizeCurrentList();
    return true;
  }

  window.PDXSupplyNameFix={normalizeItems};
  if(!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
