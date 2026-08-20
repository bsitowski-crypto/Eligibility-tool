(function(){
  "use strict";

  const root=typeof window!=="undefined"?window:globalThis;
  const ME_NAMES=new Set([
    "red tube urine",
    "grey top blood tube",
    "tiger top blood tube",
    "purple top blood tube",
    "green top blood tube"
  ]);
  const BONE_TENDON_IDS=new Set([
    "humerus","radius","ulna","femur","tibia","fibula",
    "achilles","hemi","antTib","postTib","gracilis",
    "semitendinosus","peroneus","kneeBlock","armBlock",
    "freshHumerus","freshProxHumerus","freshProxFemur",
    "freshKnee","freshAnkle","silvieElbow","cartilage","calvarium"
  ]);
  const HEART_IDS=new Set(["heartArtivion","heartLeMaitre"]);

  function key(value){
    return String(value||"")
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g," ")
      .replace(/[^a-z0-9.]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function isMeSupply(item){
    const category=key(item?.c);
    const name=key(item?.n);
    return category==="me specimens"||ME_NAMES.has(name);
  }

  function recoveryIds(recovery){
    const values=Array.isArray(recovery)?recovery:
      [...(Array.isArray(recovery?.selected)?recovery.selected:[]),
        ...(Array.isArray(recovery?.sides)?recovery.sides:[])];
    return [...new Set(values.map(value=>String(value||"").trim())
      .filter(Boolean)
      .map(value=>value.replace(/^bilateral_/,"").replace(/^ocaStd_/,"").replace(/_(left|right)$/,"")))];
  }

  function cordClampCount(recovery){
    const ids=recoveryIds(recovery);
    const hasBoneOrTendon=ids.some(id=>BONE_TENDON_IDS.has(id));
    const hasHeart=ids.some(id=>HEART_IDS.has(id));
    return (hasBoneOrTendon?4:0)+(hasHeart?1:0);
  }

  function applyCordClampRule(items,recovery){
    if(!Array.isArray(items))return items;
    const count=cordClampCount(recovery);
    const output=items
      .filter(item=>!key(item?.n).startsWith("cord clamp"))
      .map(item=>Object.assign({},item));
    if(count){
      const ids=recoveryIds(recovery);
      const hasBoneOrTendon=ids.some(id=>BONE_TENDON_IDS.has(id));
      const hasHeart=ids.some(id=>HEART_IDS.has(id));
      const note=[
        hasBoneOrTendon?"4 for bone/tendon recovery":"",
        hasHeart?"1 for heart recovery":""
      ].filter(Boolean).join(" + ");
      output.push({c:"Supplies",n:"Cord Clamps",q:count,note});
    }
    return output;
  }

  function rank(item){
    const name=key(item?.n);
    const category=key(item?.c);

    // Matches the photographed Pull / Log sheet from top to bottom.
    if(name.includes("pid label"))return 10;
    if(name==="rpmi"||name.includes("rpmi with antibiotics"))return 20;
    if(name.includes("lactated ringers")||name==="lr")return 30;
    if(name.includes("amalgatome blade")||name.includes("amelgatome blade"))return 50;
    if(name.includes("amalgatome instrument")||name.includes("amelgatome instrument"))return 60;
    if(name==="amalgatome"||name==="amelgatome")return 40;
    if(name.includes("full thickness skin")||name.includes("ft skin kit"))return 70;
    if(name.includes("thioglycollate")||name==="thio")return 80;
    if(name.includes("trypticase soy broth")||name==="tsb")return 90;

    if(name.includes("bone skin recovery")||name.includes("skin bone recovery")||
      name==="skin recovery kit")return 130;
    if(name==="chg")return 140;
    if(name.includes("70 isopropyl alcohol")||name.includes("isopropyl alcohol"))return 160;
    if(name.includes("bone instrument")||name==="bone tray"||name==="bone kit")return 170;
    if(name.includes("safety")||category==="safety gloves")return 180;
    if(name.includes("gigli handle"))return 200;
    if(name.includes("gigli blade"))return 210;
    if(name.includes("scalpel blade"))return 220;
    if(name.includes("sterile skin jar"))return 230;
    if(name.includes("gloves sterile")||
      (category==="gloves"&&name.includes("size")))return 240;

    if(name.includes("back table cover"))return 300;
    if(name.includes("chg scrub brush"))return 310;
    if(name.includes("mayo stand cover"))return 320;
    if(name.includes("cord clamp"))return 330;
    if(name==="gown"||name.includes("gowns sterile"))return 340;
    if(name.includes("or towel"))return 360;
    if(name.includes("cleaning solution"))return 370;
    if(name.includes("bleach spray"))return 380;
    if(name.includes("blood specimen shipper"))return 390;
    if(name.includes("heart instrument")||name==="heart tray")return 400;
    if(name.includes("universal recovery kit")||name==="universal kit")return 410;
    if(name.includes("cardiovascular recovery kit"))return 420;
    if(name.includes("vascular sterile kit"))return 430;
    if(name.includes("vein instrument kit"))return 440;
    if(name==="vein kit")return 441;
    if(name.includes("vein cannula"))return 450;
    if(name.includes("2.0 silk"))return 460;
    if(name.includes("artivion shipping box")||name.includes("cardiovascular shipping box"))return 470;
    if(name.includes("lemaitre shipping box"))return 471;
    if(name==="nacl"||name.includes("sodium chloride"))return 480;
    if(name.includes("adipose recovery kit"))return 490;

    if(name.includes("pathology container"))return 500;
    if(name.includes("syringe"))return 510;
    if(name.includes("needle"))return 520;
    if(name.includes("cotton tip applicator"))return 530;
    if(name.includes("lap sponge"))return 540;
    if(name.includes("zip tie"))return 550;
    if(name.includes("suction tubing"))return 560;
    if(name.includes("ergo blade handle"))return 570;
    if(name.includes("rib cutter"))return 580;
    if(name.includes("chest pericardium kit")||name==="chest kit")return 590;
    if(name.includes("stryker saw")||name.includes("stryker blade"))return 600;
    if(name.includes("axogen recovery set up")||name==="axogen box")return 610;
    if(name.includes("axogen s a 3"))return 620;

    // Pull-only Axogen shipper: it has no lot-log line.
    if(name.includes("eurofins"))return 630;

    // These are written into the blank lines at the end of the lot log.
    if(name.includes("sterile bag"))return 10000;
    if(name.includes("syntel catheter"))return 10010;

    return 900;
  }

  function orderItems(items){
    return (items||[])
      .map((item,index)=>({item:Object.assign({},item),index}))
      .filter(entry=>!isMeSupply(entry.item))
      .sort((a,b)=>rank(a.item)-rank(b.item)||
        a.index-b.index||
        String(a.item.n||"").localeCompare(String(b.item.n||"")))
      .map(entry=>entry.item);
  }

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function render(items){
    const host=document.getElementById("supplies");
    if(!host||!items.length)return;
    host.innerHTML='<div class="supply">'+items.map(item=>
      '<div class="srow"><div><strong>'+escapeHtml(item.n)+'</strong>'+
      (item.note?'<div class="small">'+escapeHtml(item.note)+'</div>':"")+
      '</div><strong>'+escapeHtml(item.q)+'</strong></div>'
    ).join("")+'</div>';
  }

  function reorderCurrent(recovery,applyClampRule){
    let items;
    try{items=latestSupplyItems}catch{return []}
    if(!Array.isArray(items))return [];
    const corrected=applyClampRule?applyCordClampRule(items,recovery):items;
    const ordered=orderItems(corrected);
    items.splice(0,items.length,...ordered);
    render(items);
    return items;
  }

  function install(){
    const original=root.buildSupplies;
    if(typeof original!=="function"||original.__pdxSupplyOrderFix)return false;

    const wrapped=function(recovery){
      const result=original.apply(this,arguments);
      let current=recovery;
      if(!current){
        try{current=typeof getRecovery==="function"?getRecovery():null}catch{}
      }
      reorderCurrent(current,Boolean(current));
      return result;
    };
    wrapped.__pdxSupplyOrderFix=true;
    root.buildSupplies=wrapped;

    // The core print builders call these globals directly.
    root.supplySheetOrder=rank;
    root.orderedPrintableSupplies=function(){
      let items;
      try{items=latestSupplyItems}catch{return []}
      return orderItems(items);
    };

    reorderCurrent();
    return true;
  }

  const api={key,isMeSupply,rank,orderItems,recoveryIds,cordClampCount,applyCordClampRule};
  root.PDXSupplyOrder=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;

  if(typeof window!=="undefined"&&!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
