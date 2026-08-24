(function(){
  "use strict";

  const root=typeof window!=="undefined"?window:globalThis;
  const SIDE_SPECIFIC_IDS=new Set([
    "freshKnee","freshAnkle","silvieElbow","freshHumerus",
    "freshProxHumerus","freshProxFemur"
  ]);
  const BILATERAL_IDS=new Set([
    "humerus","radius","ulna","femur","tibia","fibula","achilles",
    "hemi","antTib","postTib","gracilis","semitendinosus","peroneus",
    "kneeBlock","armBlock","fascia"
  ]);
  const PROCESSORS={
    heartArtivion:"Artivion",dta:"Artivion",saphArtivion:"Artivion",
    femVeinArtivion:"Artivion",aiArtivion:"Artivion",
    heartLeMaitre:"LeMaitre",saphLeMaitre:"LeMaitre",
    femVeinLeMaitre:"LeMaitre",aiLeMaitre:"LeMaitre",
    nerves:"Axogen",adipose:"RegenTX"
  };
  const CULTURE_EXCLUSIONS=new Set(["artivion","lemaitre","axogen"]);

  const SKIN_IDS=new Set(["anteriorSkin","posteriorSkin","legSkin"]);
  const BONE_TENDON_IDS=new Set([
    "humerus","radius","ulna","femur","tibia","fibula","achilles",
    "hemi","antTib","postTib","gracilis","semitendinosus","peroneus",
    "kneeBlock","armBlock","freshHumerus","freshProxHumerus",
    "freshProxFemur","freshKnee","freshAnkle","silvieElbow"
  ]);

  const ARM_IDS=new Set([
    "humerus","radius","ulna","armBlock","freshHumerus",
    "freshProxHumerus","silvieElbow","nerves"
  ]);
  const LEG_IDS=new Set([
    "femur","tibia","fibula","achilles","hemi","antTib",
    "postTib","gracilis","semitendinosus","peroneus","kneeBlock",
    "fascia","freshProxFemur","freshKnee","freshAnkle","nerves"
  ]);
  const CHEST_IDS=new Set([
    "cartilage","pericardium","heartArtivion","heartLeMaitre","dta",
    "aiArtivion","aiLeMaitre"
  ]);

  function uniqueStrings(values){
    return [...new Set((values||[]).map(value=>String(value||"").trim()).filter(Boolean))];
  }

  function normalizeRecovery(recovery){
    if(Array.isArray(recovery))return {selected:uniqueStrings(recovery),sides:[]};
    return {
      selected:uniqueStrings(recovery?.selected),
      sides:uniqueStrings(recovery?.sides)
    };
  }

  function graftDetails(id){
    try{
      if(typeof G==="function")return G(id)||null;
      if(typeof root.G==="function")return root.G(id)||null;
    }catch{}
    return null;
  }

  function regionsFor(id){
    const regions=[];
    if(ARM_IDS.has(id))regions.push("arms");
    if(LEG_IDS.has(id))regions.push("legs");
    if(CHEST_IDS.has(id))regions.push("chest");
    return regions;
  }

  function processorFor(id,graft){
    return String(graft?.processor||PROCESSORS[id]||"").trim();
  }

  function positionsFor(id,graft){
    // All four adipose zones belong in the middle column, including the
    // left- and right-thigh zones. Their culture tubes follow that same
    // placement so the graft list and culture counts stay aligned.
    if(id==="adipose")return ["middle","middle","middle","middle"];
    if(BILATERAL_IDS.has(id)||String(graft?.culture||"").toUpperCase()==="LR"){
      return ["left","right"];
    }
    return ["middle"];
  }

  function sideSelection(value){
    let match=String(value||"").match(/^bilateral_(.+)_(left|right)$/);
    if(match)return {id:match[1],position:match[2],standard:true};
    match=String(value||"").match(/^ocaStd_(.+)_(left|right)$/);
    if(match)return {id:match[1],position:match[2],standard:true};
    match=String(value||"").match(/^(.+)_(left|right)$/);
    if(match&&SIDE_SPECIFIC_IDS.has(match[1])){
      return {id:match[1],position:match[2],standard:false};
    }
    return null;
  }

  function recoveredGrafts(recovery){
    const current=normalizeRecovery(recovery);
    const instances=[];
    const representedBySide=new Set();

    for(const value of current.sides){
      const side=sideSelection(value);
      if(!side)continue;
      representedBySide.add(side.id);
      const graft=graftDetails(side.id);
      instances.push({
        id:side.id,
        position:side.position,
        processor:processorFor(side.id,graft),
        regions:regionsFor(side.id),
        source:value
      });
    }

    for(const id of current.selected){
      if(SIDE_SPECIFIC_IDS.has(id)||representedBySide.has(id))continue;
      const graft=graftDetails(id);
      for(const position of positionsFor(id,graft)){
        instances.push({
          id,
          position,
          processor:processorFor(id,graft),
          regions:regionsFor(id),
          source:id
        });
      }
    }

    return instances;
  }

  function bladeTotals(recovery){
    const grafts=recoveredGrafts(recovery);
    const incisionRegions=new Set();
    for(const graft of grafts){
      for(const region of graft.regions)incisionRegions.add(region);
    }
    const incisionByRegion={
      arms:incisionRegions.has("arms")?2:0,
      legs:incisionRegions.has("legs")?2:0,
      chest:incisionRegions.has("chest")?1:0
    };
    const incisionBlades=Object.values(incisionByRegion)
      .reduce((sum,value)=>sum+value,0);

    let boneTendonGrafts=0;
    let fasciaGrafts=0;
    let skinZones=0;
    let adiposeZones=0;
    let cartilageGrafts=0;
    for(const graft of grafts){
      if(BONE_TENDON_IDS.has(graft.id))boneTendonGrafts++;
      else if(graft.id==="fascia")fasciaGrafts++;
      else if(SKIN_IDS.has(graft.id))skinZones++;
      else if(graft.id==="adipose")adiposeZones++;
      else if(graft.id==="cartilage")cartilageGrafts++;
    }

    const recoveryBlades=boneTendonGrafts+fasciaGrafts+(skinZones*4)+
      (adiposeZones*2)+(cartilageGrafts*3);
    return {
      count:recoveryBlades+incisionBlades,
      graftCount:grafts.length,
      graftBlades:recoveryBlades,
      recoveryBlades,
      incisionBlades,
      incisionByRegion,
      boneTendonGrafts,
      fasciaGrafts,
      skinZones,
      adiposeZones,
      cartilageGrafts,
      incisionRegions:[...incisionRegions].sort()
    };
  }

  function cultureTotals(recovery){
    const totals={left:0,middle:0,right:0,total:0};
    for(const graft of recoveredGrafts(recovery)){
      if(CULTURE_EXCLUSIONS.has(graft.processor.toLowerCase()))continue;
      const position=["left","middle","right"].includes(graft.position)?graft.position:"middle";
      totals[position]++;
      totals.total++;
    }
    totals.quantity=`${totals.left}/${totals.middle}/${totals.right}`;
    return totals;
  }

  function correctedItems(items,recovery){
    if(!Array.isArray(items))return items;
    const blades=bladeTotals(recovery);
    const cultures=cultureTotals(recovery);
    const output=items
      .filter(item=>{
        const name=String(item?.n||"").trim().toLowerCase();
        return name!=="scalpel blade"&&name!=="scalpel blades"&&name!=="tsb"&&
          name!=="thio"&&name!=="thioglycollate";
      })
      .map(item=>Object.assign({},item));

    if(blades.count){
      const details=[];
      if(blades.incisionByRegion.arms)details.push("2 arm-incision blades");
      if(blades.incisionByRegion.legs)details.push("2 leg-incision blades");
      if(blades.incisionByRegion.chest)details.push("1 chest-incision blade");
      if(blades.boneTendonGrafts)details.push(`${blades.boneTendonGrafts} bone/tendon graft blade${blades.boneTendonGrafts===1?"":"s"}`);
      if(blades.fasciaGrafts)details.push(`${blades.fasciaGrafts} fascia blade${blades.fasciaGrafts===1?"":"s"}`);
      if(blades.skinZones)details.push(`${blades.skinZones*4} blades for ${blades.skinZones} skin zone${blades.skinZones===1?"":"s"}`);
      if(blades.adiposeZones)details.push(`${blades.adiposeZones*2} blades for ${blades.adiposeZones} adipose zones`);
      if(blades.cartilageGrafts)details.push("3 cartilage/sternum recovery blades");
      output.push({
        c:"Core",n:"Scalpel Blades",q:blades.count,
        note:details.join(" + ")
      });
    }
    if(cultures.total){
      const note="Left / Middle / Right; one tube per cultured graft";
      output.push({c:"Culture Tubes",n:"TSB",q:cultures.quantity,note});
      output.push({c:"Culture Tubes",n:"Thio",q:cultures.quantity,note});
    }

    output.sort((a,b)=>String(a.n||"").localeCompare(String(b.n||"")));
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

  function renderCurrent(items){
    const host=document.getElementById("supplies");
    if(!host||!items.length)return;
    host.innerHTML=`<div class="supply">${items.map(item=>`<div class="srow">
      <div><strong>${html(item.n)}</strong>${item.note?`<div class="small">${html(item.note)}</div>`:""}</div>
      <strong>${html(item.q)}</strong>
    </div>`).join("")}</div>`;
  }

  function applyRules(recovery){
    let items;
    try{items=latestSupplyItems}catch{return}
    if(!Array.isArray(items))return;
    const corrected=correctedItems(items,recovery);
    items.splice(0,items.length,...corrected);
    renderCurrent(items);
  }

  function install(){
    const original=root.buildSupplies;
    if(typeof original!=="function"||original.__pdxBladeCultureQuantityFix)return false;
    const wrapped=function(recovery){
      const result=original.apply(this,arguments);
      let current=recovery;
      if(!current){
        try{current=typeof getRecovery==="function"?getRecovery():null}catch{}
      }
      applyRules(current);
      return result;
    };
    wrapped.__pdxBladeCultureQuantityFix=true;
    root.buildSupplies=wrapped;
    return true;
  }

  const api={
    recoveredGrafts,bladeTotals,cultureTotals,correctedItems,regionsFor
  };
  root.PDXBladeCultureFix=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;

  if(typeof window!=="undefined"&&!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
