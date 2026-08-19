(function(){
  "use strict";

  const root=typeof window!=="undefined"?window:globalThis;
  const TENDON_NAMES=[
    "Gracilis",
    "Semitendinosus",
    "Anterior Tibialis",
    "Posterior Tibialis",
    "Peroneus Longus",
    "Achilles"
  ];

  const ZONE_RULES=[
    // Zone A - skin and adipose.
    [/posterior trunk.*skin|posterior trunk$/,100],
    [/leg skin|posterior legs|anterior legs/,110],
    [/anterior thigh adipose|thigh adipose/,500],
    [/adipose/,120],
    [/anterior trunk.*skin|anterior trunk$/,130],

    // Zone B - chest.
    [/cartilage.*sternum/,200],
    [/pericardium/,210],
    [/\bheart\b/,220],
    [/\bdta\b/,230],

    // Zone C - arms.
    [/fresh proximal humerus|fresh humerus|shoulder block/,340],
    [/\bhumerus\b/,300],
    [/\bradius\b/,310],
    [/\bulna\b/,320],
    [/arm (?:en )?block/,330],
    [/elbow block/,350],
    [/upper.*nerves|^nerves(?:\s|$)/,360],

    // Zone D - vessels.
    [/saphenous vein/,400],
    [/femoral vein|femoral artery/,410],

    // Zone E - legs.
    [/\bfascia\b/,510],
    [/\bgracilis\b/,520],
    [/\bsemitendinosus\b/,530],
    [/anterior tibialis/,540],
    [/posterior tibialis/,550],
    [/peroneus longus/,560],
    [/\bplantaris\b/,570],
    [/knee block/,580],
    [/ankle block/,590],
    [/fresh proximal femur|proximal femur|distal femur/,600],
    [/\bfemur\b/,610],
    [/proximal tibia|distal tibia/,620],
    [/\btibia\b/,630],
    [/proximal fibula|distal fibula/,640],
    [/\bfibula\b/,650],
    [/\bachilles\b/,660],
    [/hemi[ -]?pelvis/,670],
    [/lower.*nerves/,680],

    // Zone F - AI. Zone G items are not part of the current app.
    [/\bai\b/,700]
  ];

  function normalizedName(value){
    return String(value||"")
      .toLowerCase()
      .replace(/^[\s]*(left|right)[\s]+/,"")
      .replace(/[\u2013\u2014]/g,"-")
      .replace(/\s+/g," ")
      .trim();
  }

  function zoneRank(value){
    const name=normalizedName(value);
    for(const [pattern,rank] of ZONE_RULES){
      if(pattern.test(name))return rank;
    }
    return 9000;
  }

  function sideRank(value){
    const name=String(value||"").trim().toLowerCase();
    if(name.startsWith("left "))return 0;
    if(name.startsWith("right "))return 1;
    return 2;
  }

  function expandTendons(items){
    const expanded=[];
    for(const value of items||[]){
      if(/^all(?: other)? tendons$/i.test(String(value||"").trim())){
        expanded.push(...TENDON_NAMES);
      }else{
        expanded.push(value);
      }
    }
    return [...new Set(expanded.filter(Boolean))];
  }

  function orderItems(items){
    return expandTendons(items)
      .map((value,index)=>({value,index,rank:zoneRank(value),side:sideRank(value)}))
      .sort((a,b)=>a.rank-b.rank||a.side-b.side||a.index-b.index||
        String(a.value).localeCompare(String(b.value)))
      .map(entry=>entry.value);
  }

  function orderGroups(groups){
    const source=groups&&typeof groups==="object"?groups:{};
    return {
      solvita:orderItems(source.solvita),
      pfo:orderItems(source.pfo),
      oca:orderItems(source.oca)
    };
  }

  function install(){
    const original=root.currentPrintableGraftGroups;
    if(typeof original!=="function"||original.__pdxGraftZoneOrder)return false;

    const wrapped=function(){
      return orderGroups(original.apply(this,arguments));
    };
    wrapped.__pdxGraftZoneOrder=true;
    root.currentPrintableGraftGroups=wrapped;
    return true;
  }

  const api={normalizedName,zoneRank,orderItems,orderGroups,expandTendons};
  root.PDXGraftListOrder=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;

  if(typeof window!=="undefined"&&!install()){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(install()||tries>80)clearInterval(timer);
    },200);
  }
})();
