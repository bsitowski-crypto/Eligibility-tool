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

  function selectedIds(recovery){
    const values=Array.isArray(recovery)?recovery:recovery?.selected;
    return new Set((values||[]).map(value=>String(value||"").trim()).filter(Boolean));
  }

  function leMaitreLrQuantity(recovery){
    const selected=selectedIds(recovery);
    return (selected.has("heartLeMaitre")?3:0)+
      (selected.has("saphLeMaitre")?1:0)+
      (selected.has("femVeinLeMaitre")?1:0)+
      (selected.has("aiLeMaitre")?2:0);
  }

  function splitProcessorFluids(items,recovery){
    const output=(items||[]).map(item=>Object.assign({},item));
    const leMaitreQuantity=leMaitreLrQuantity(recovery);
    const existingLeMaitre=output.find(item=>
      String(item?.n||"").trim().toLowerCase()==="lemaitre lr"
    );

    if(leMaitreQuantity&&existingLeMaitre){
      existingLeMaitre.c="LeMaitre";
      existingLeMaitre.q=leMaitreQuantity;
    }else if(leMaitreQuantity){
      const lrIndex=output.findIndex(item=>{
        const name=String(item?.n||"").trim().toLowerCase();
        return name==="lactated ringers (lr)"||name==="lactated ringers"||name==="lr";
      });
      if(lrIndex>=0){
        const lr=output[lrIndex];
        const total=number(lr.q);
        if(total!==null){
          const remaining=Math.max(0,total-leMaitreQuantity);
          if(remaining)lr.q=remaining;
          else output.splice(lrIndex,1);
        }
      }
      output.push({c:"LeMaitre",n:"LeMaitre LR",q:leMaitreQuantity});
    }

    for(const item of output){
      const name=String(item?.n||"").trim().toLowerCase();
      const category=String(item?.c||"").trim().toLowerCase();
      if(category==="artivion"&&(name==="nacl"||name==="sodium chloride")){
        item.n="Artivion NaCl";
      }
    }
    return output;
  }

  function normalizeItems(items,recovery){
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

    return splitProcessorFluids(output,recovery);
  }

  function html(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalizeCurrentList(recovery){
    if(typeof latestSupplyItems==="undefined"||!Array.isArray(latestSupplyItems))return;
    const normalized=normalizeItems(latestSupplyItems,recovery);
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

    const wrapped=function(recovery){
      const result=original.apply(this,arguments);
      normalizeCurrentList(recovery);
      return result;
    };
    wrapped.__pdxSupplyNameFix=true;
    window.buildSupplies=wrapped;
    normalizeCurrentList();
    return true;
  }

  const api={normalizeItems,splitProcessorFluids,leMaitreLrQuantity};
  if(typeof window!=="undefined")window.PDXSupplyNameFix=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof window!=="undefined"&&!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
