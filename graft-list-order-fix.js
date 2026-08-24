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
    [/anterior trunk adipose/,120],
    [/posterior trunk adipose/,121],
    [/left thigh adipose/,122],
    [/right thigh adipose/,123],
    [/anterior thigh adipose|thigh adipose/,124],
    [/adipose/,125],
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

  function displayKey(value){
    return String(value||"")
      .toLowerCase()
      .replace(/[\u2013\u2014]/g,"-")
      .replace(/\s+/g," ")
      .trim();
  }

  function displayName(value){
    const original=String(value||"").trim();
    const sideMatch=original.match(/^(left|right)\s+/i);
    const side=sideMatch?sideMatch[1][0].toUpperCase()+sideMatch[1].slice(1).toLowerCase():"";
    let name=sideMatch?original.slice(sideMatch[0].length).trim():original;

    const alias=name.toLowerCase().replace(/[^a-z0-9]+/g,"");
    if(alias==="anttib"||alias==="anteriortibialis")name="Anterior Tibialis";
    if(alias==="posttib"||alias==="posteriortibialis")name="Posterior Tibialis";

    // The core data already includes processor names on PFO grafts and also
    // appends the processor while printing. Collapse the repeated suffix.
    name=name.replace(
      /\s*[-\u2013\u2014]\s*(Artivion|LeMaitre|Axogen|RegenTX)\s*[-\u2013\u2014]\s*\1\s*$/i,
      " — $1"
    );
    return side?`${side} ${name}`:name;
  }

  function uniqueDisplayNames(values){
    const output=[];
    const seen=new Set();
    for(const value of values||[]){
      const name=displayName(value);
      const side=name.match(/^(left|right)\s+/i)?.[1]?.toLowerCase()||"middle";
      const key=side+"|"+normalizedName(name);
      if(!name||seen.has(key))continue;
      seen.add(key);
      output.push(name);
    }
    return output;
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
    return uniqueDisplayNames(expandTendons(items))
      .map((value,index)=>({value,index,rank:zoneRank(value),side:sideRank(value)}))
      .sort((a,b)=>a.rank-b.rank||a.side-b.side||a.index-b.index||
        String(a.value).localeCompare(String(b.value)))
      .map(entry=>entry.value);
  }

  function graftColumns(groups){
    const source=groups&&typeof groups==="object"?groups:{};
    function place(values){
      const columns={left:[],middle:[],right:[]};
      const names=uniqueDisplayNames(values);
      const explicitSides=new Set();

      for(const value of names){
        const match=value.match(/^(Left|Right)\s+(.+)$/i);
        if(match)explicitSides.add(normalizedName(match[2]));
      }

      function add(column,value){
        const name=displayName(value);
        // Preserve the written side for items intentionally placed in the
        // middle column, such as Left Thigh and Right Thigh Adipose.
        if(name&&!columns[column].some(item=>displayKey(item)===displayKey(name))){
          columns[column].push(name);
        }
      }

      for(const value of names){
        if(/^(Left|Right)\s+Thigh Adipose\b/i.test(value)){
          add("middle",value);
          continue;
        }
        const sideMatch=value.match(/^(Left|Right)\s+(.+)$/i);
        if(sideMatch){
          add(sideMatch[1].toLowerCase(),sideMatch[2]);
          continue;
        }

        const name=displayName(value);
        const key=normalizedName(name);
        if(explicitSides.has(key))continue;

        if(/^adipose(?:\s*[-\u2013\u2014]\s*RegenTX)?$/i.test(name)){
          const processor=/RegenTX/i.test(name)?" — RegenTX":"";
          add("middle","Anterior Trunk Adipose"+processor);
          add("middle","Posterior Trunk Adipose"+processor);
          add("middle","Left Thigh Adipose"+processor);
          add("middle","Right Thigh Adipose"+processor);
          continue;
        }

        if(/^nerves(?:\s*[-\u2013\u2014]\s*Axogen)?$/i.test(name)){
          const processor=/Axogen/i.test(name)?" — Axogen":"";
          add("left","Upper Nerves"+processor);
          add("left","Lower Nerves"+processor);
          add("right","Upper Nerves"+processor);
          add("right","Lower Nerves"+processor);
          continue;
        }

        if(/^(saphenous|femoral) vein\b/i.test(name)){
          add("left",name);
          add("right",name);
          continue;
        }

        add("middle",name);
      }

      columns.left=orderItems(columns.left);
      columns.middle=orderItems(columns.middle);
      columns.right=orderItems(columns.right);
      return columns;
    }

    const standard=place([...(source.solvita||[]),...(source.oca||[])]);
    const pfo=place(source.pfo||[]);
    const columns={left:[],middle:[],right:[]};
    for(const column of ["left","middle","right"]){
      columns[column].push(...standard[column]);
      if(pfo[column].length)columns[column].push("PFO",...pfo[column]);
    }
    return columns;
  }

  function cultureColumns(totals){
    const source=totals||{};
    const values={
      left:Number(source.left)||0,
      middle:Number(source.middle)||0,
      right:Number(source.right)||0
    };
    return {
      left:[`TSB: ${values.left}`,`Thio: ${values.left}`],
      middle:[`TSB: ${values.middle}`,`Thio: ${values.middle}`],
      right:[`TSB: ${values.right}`,`Thio: ${values.right}`]
    };
  }

  function currentColumns(){
    try{
      const groups=typeof root.currentPrintableGraftGroups==="function"
        ?root.currentPrintableGraftGroups():{solvita:[],pfo:[],oca:[]};
      return graftColumns(groups);
    }catch{return {left:[],middle:[],right:[]}}
  }

  function currentCultureColumns(){
    try{
      const recovery=typeof getRecovery==="function"?getRecovery():null;
      const totals=root.PDXBladeCultureFix?.cultureTotals?.(recovery)||{};
      return cultureColumns(totals);
    }catch{return cultureColumns({})}
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

  const api={
    normalizedName,displayKey,displayName,zoneRank,orderItems,orderGroups,expandTendons,
    graftColumns,cultureColumns,currentColumns,currentCultureColumns
  };
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
