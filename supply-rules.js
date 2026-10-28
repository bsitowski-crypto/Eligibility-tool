// Supply rules and finalization live here. The loader must not also load the
// legacy supply-name, blade-culture, glove-quantity, or supply-order wrappers.

(function(){
  "use strict";
  const root=typeof window!=="undefined"?window:globalThis;
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

  root.PDXSupplyNameFix={normalizeItems,splitProcessorFluids,leMaitreLrQuantity};
})();

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
    let countedAdipose=false;
    for(const graft of recoveredGrafts(recovery)){
      // Recovery lists four adipose zones, but cultures use three tubes total.
      if(graft.id==="adipose"){
        if(!countedAdipose){totals.middle+=3;totals.total+=3;countedAdipose=true;}
        continue;
      }
      if(CULTURE_EXCLUSIONS.has(graft.processor.toLowerCase()))continue;
      const position=["left","middle","right"].includes(graft.position)?graft.position:"middle";
      totals[position]++;
      totals.total++;
    }
    totals.quantity=`${totals.left}/${totals.middle}/${totals.right}`;
    return totals;
  }

  function cultureSwabCount(recovery){
    const grafts=recoveredGrafts(recovery);
    const hasSkin=grafts.some(graft=>SKIN_IDS.has(graft.id));
    const hasAdipose=grafts.some(graft=>graft.id==="adipose");
    // Preserve the existing four-swab skin/adipose requirement in combined cases.
    return hasSkin&&hasAdipose?4:0;
  }

  function correctedItems(items,recovery){
    if(!Array.isArray(items))return items;
    const blades=bladeTotals(recovery);
    const cultures=cultureTotals(recovery);
    const output=items
      .filter(item=>{
        const name=String(item?.n||"").trim().toLowerCase();
        return name!=="scalpel blade"&&name!=="scalpel blades"&&name!=="tsb"&&
          name!=="thio"&&name!=="thioglycollate"&&name!=="culture swab"&&
          name!=="culture swabs";
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
      const note="Left / Middle / Right; one tube per cultured graft; adipose three tubes total";
      output.push({c:"Culture Tubes",n:"TSB",q:cultures.quantity,note});
      output.push({c:"Culture Tubes",n:"Thio",q:cultures.quantity,note});
    }
    const swabs=cultureSwabCount(recovery);
    if(swabs){
      output.push({
        c:"Culture Supplies",n:"Culture Swabs",q:swabs,
        note:"Skin + adipose recovery, including combined bone/tendon cases"
      });
    }

    output.sort((a,b)=>String(a.n||"").localeCompare(String(b.n||"")));
    return output;
  }

  root.PDXBladeCultureFix={recoveredGrafts,bladeTotals,cultureTotals,cultureSwabCount,correctedItems,regionsFor};
})();

(function(){
  "use strict";
  const root=typeof window!=="undefined"?window:globalThis;
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

  root.PDXGloveQuantityFix={extraPairs,adjustItems};
})();

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
  const SKIN_IDS=new Set(["anteriorSkin","posteriorSkin","legSkin"]);
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
    return category==="me specimens"||(category!=="recovery blood"&&ME_NAMES.has(name));
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

  function applyBoneTrayRule(items,recovery){
    if(!Array.isArray(items))return items;
    const ids=recoveryIds(recovery);
    const hasBoneOrTendon=ids.some(id=>BONE_TENDON_IDS.has(id));
    const hasNerves=ids.includes("nerves");
    const hasVein=ids.some(id=>[
      "saphArtivion","saphLeMaitre","femVeinArtivion","femVeinLeMaitre"
    ].includes(id));
    const output=items
      .filter(item=>!["bone tray","bone kit"].includes(key(item?.n)))
      .map(item=>Object.assign({},item));

    // Skin never determines which setup is pulled. A combined nerve-and-vein
    // recovery uses the tray; every other bone or bone/tendon recovery uses
    // the kit. Vein-only and nerve-only cases use neither.
    if(hasNerves&&hasVein){
      output.push({c:"Recovery Kits",n:"Bone Tray",q:1,note:"Nerves plus vein recovery"});
    }else if(hasBoneOrTendon){
      output.push({c:"Recovery Kits",n:"Bone Kit",q:1,note:"Bone or bone/tendon recovery"});
    }
    return output;
  }

  const applyBoneKitTrayRule=applyBoneTrayRule;

  // Kept for compatibility with any code that used the earlier rule name.
  const applyAdiposeBoneTrayRule=applyBoneTrayRule;

  function applyNonBoneSupplyRules(items,recovery){
    if(!Array.isArray(items))return items;
    const ids=recoveryIds(recovery);
    const hasBoneOrTendon=ids.some(id=>BONE_TENDON_IDS.has(id));
    const needsSkinBags=!hasBoneOrTendon&&[...SKIN_IDS].every(id=>ids.includes(id));
    const hasSolvitaGraft=hasBoneOrTendon||ids.some(id=>SKIN_IDS.has(id)||id==="fascia"||id==="pericardium");
    const needsHeartSetup=!hasSolvitaGraft&&ids.some(id=>HEART_IDS.has(id));
    const output=items.filter(item=>{
      const name=key(item?.n);
      if(!hasBoneOrTendon&&(/^(gown|gowns)( sterile)?$/.test(name)||/^or towels?$/.test(name)))return false;
      if(needsSkinBags&&/^sterile bags?$/.test(name))return false;
      if(needsHeartSetup&&/^(u drapes?|sterile trays?)$/.test(name))return false;
      return true;
    }).map(item=>Object.assign({},item));
    if(needsSkinBags)output.push({c:"Solvita",n:"Sterile Bags",q:1,note:"1 pack; all three skin zones without bone or tendon recovery"});
    if(needsHeartSetup){
      const note="Heart recovery without Solvita grafts";
      output.push({c:"Supplies",n:"Gown",q:1,note},
        {c:"Supplies",n:"U-Drapes",q:2,note},
        {c:"Supplies",n:"Sterile Tray",q:1,note});
    }
    return output;
  }

  function rank(item){
    const name=key(item?.n);
    const category=key(item?.c);

    // Matches the photographed Pull / Log sheet from top to bottom.
    if(name.includes("pid label"))return 10;
    if(name==="rpmi"||name.includes("rpmi with antibiotics"))return 20;
    if(name.includes("lactated ringers")||name==="lr"||name==="lemaitre lr")return 30;
    if(name.includes("amalgatome blade")||name.includes("amelgatome blade"))return 50;
    if(name.includes("amalgatome instrument")||name.includes("amelgatome instrument"))return 60;
    if(name==="amalgatome"||name==="amelgatome")return 40;
    if(name.includes("full thickness skin")||name.includes("ft skin kit"))return 70;
    if(name.includes("thioglycollate")||name==="thio")return 80;
    if(name.includes("trypticase soy broth")||name==="tsb")return 90;
    if(name.includes("culture swab"))return 100;

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
    if(name==="nacl"||name==="artivion nacl"||name.includes("sodium chloride"))return 480;
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

  function cultureQuantity(item){
    const name=key(item?.n);
    if(name!=="tsb"&&name!=="thio"&&!name.includes("thioglycollate")&&
      !name.includes("trypticase soy broth"))return null;
    const match=String(item?.q??"").trim().match(/^(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)$/);
    return match?{left:match[1],middle:match[2],right:match[3]}:null;
  }

  function ensureCultureStyles(){
    if(typeof document==="undefined"||document.getElementById("pdxCultureSupplyStyles"))return;
    const style=document.createElement("style");
    style.id="pdxCultureSupplyStyles";
    style.textContent=`
      #supplies .pdx-culture-qty{display:grid;grid-template-columns:repeat(3,minmax(34px,1fr));min-width:132px;border:1px solid #d4d8df;border-radius:8px;overflow:hidden;background:#fff}
      #supplies .pdx-culture-cell{display:grid;grid-template-rows:auto auto;text-align:center;padding:3px 5px;line-height:1.1}
      #supplies .pdx-culture-cell+.pdx-culture-cell{border-left:1px solid #d4d8df}
      #supplies .pdx-culture-label{font-size:10px;color:#687386;text-transform:uppercase}
      #supplies .pdx-culture-value{font-size:14px;color:#071f3e}
      @media(max-width:520px){
        #supplies .pdx-culture-qty{min-width:120px}
        #supplies .pdx-culture-cell{padding:3px}
      }
    `;
    document.head.appendChild(style);
  }

  function quantityHtml(item){
    const culture=cultureQuantity(item);
    if(!culture)return '<strong>'+escapeHtml(item.q)+'</strong>';
    return '<div class="pdx-culture-qty" aria-label="Culture tubes by graft column">'+
      [["L",culture.left],["M",culture.middle],["R",culture.right]].map(entry=>
        '<span class="pdx-culture-cell"><span class="pdx-culture-label">'+entry[0]+
        '</span><strong class="pdx-culture-value">'+escapeHtml(entry[1])+'</strong></span>'
      ).join("")+'</div>';
  }

  function render(items){
    const host=document.getElementById("supplies");
    if(!host||!items.length)return;
    ensureCultureStyles();
    host.innerHTML='<div class="supply">'+items.map(item=>
      '<div class="srow"><div><strong>'+escapeHtml(item.n)+'</strong>'+
      (item.note?'<div class="small">'+escapeHtml(item.note)+'</div>':"")+
      '</div>'+quantityHtml(item)+'</div>'
    ).join("")+'</div>';
  }

  root.PDXSupplyOrder={key,isMeSupply,rank,orderItems,recoveryIds,cordClampCount,applyCordClampRule,applyBoneTrayRule,applyBoneKitTrayRule,applyAdiposeBoneTrayRule,applyNonBoneSupplyRules,cultureQuantity,render};
})();

(function(){
  "use strict";
  const root=typeof window!=="undefined"?window:globalThis;

  // One ordered calculation shared by the displayed list and printable list.
  // Start with fresh core items on every build; never accumulate glove extras.
  function applyEyeDonorBlood(items,selection="yes_eye_bank",organDonor="no"){
    // Replace recovery-draw rows rather than accumulating them. ME specimen
    // requests remain separate and never satisfy these recovery quantities.
    const output=(items||[]).filter(item=>!item.eyeDonorBlood);
    if(organDonor==="yes")return output;
    const sending=selection==="yes_we_send"||selection==="no_we_send";
    const note="Recovery blood — additional to any ME specimen requirements";
    output.push(
      {c:"Recovery Blood",n:"30 mL Sterile Syringe",q:1,note,eyeDonorBlood:true},
      {c:"Recovery Blood",n:"16G Sterile Needle",q:1,note,eyeDonorBlood:true},
      {c:"Recovery Blood",n:"Tiger-Top Blood Tube",q:sending?2:1,note,eyeDonorBlood:true}
    );
    if(sending)output.push({c:"Recovery Blood",n:"Red-Top Blood Tube",q:1,note,eyeDonorBlood:true});
    return output;
  }

  function calculate(items,recovery,staff={},eyeDonor="yes_eye_bank",organDonor="no"){
    let output=root.PDXSupplyNameFix.normalizeItems(items,recovery);
    output=root.PDXBladeCultureFix.correctedItems(output,recovery);
    output=root.PDXSupplyOrder.applyBoneTrayRule(output,recovery);
    output=root.PDXSupplyOrder.applyCordClampRule(output,recovery);
    output=root.PDXSupplyOrder.applyNonBoneSupplyRules(output,recovery);
    output=root.PDXGloveQuantityFix.adjustItems(output,recovery,staff.techs,staff.lookup);
    output=applyEyeDonorBlood(output,eyeDonor,organDonor);
    return root.PDXSupplyOrder.orderItems(output);
  }

  function staffContext(){
    const additional=root.CasePersonnel?.personnel()||[];
    return {
      techs:[document.getElementById("tech1")?.value,
        document.getElementById("tech2")?.value,
        ...additional.filter(p=>p.role==="tech").map(p=>p.initials||p.name)],
      lookup:key=>{
        const person=additional.find(p=>(p.initials||p.name)===key);
        return person?root.CasePersonnel.info(person):techGloveInfo(key);
      }
    };
  }

  function finalize(recovery){
    if(typeof latestSupplyItems==="undefined"||!Array.isArray(latestSupplyItems))return;
    const output=calculate(latestSupplyItems,recovery,staffContext(),document.getElementById("eyeDonor")?.value,document.getElementById("organDonor")?.value);
    latestSupplyItems.splice(0,latestSupplyItems.length,...output);
    root.PDXSupplyOrder.render(output);
  }

  function install(){
    const original=root.buildSupplies;
    if(typeof original!=="function")return false;
    if(original.__pdxSupplyRules)return true;
    const wrapped=function(recovery){
      const result=original.apply(this,arguments);
      const current=recovery||(typeof getRecovery==="function"?getRecovery():null);
      finalize(current);
      return result;
    };
    wrapped.__pdxSupplyRules=true;
    root.buildSupplies=wrapped;
    root.supplySheetOrder=root.PDXSupplyOrder.rank;
    root.orderedPrintableSupplies=function(){
      return typeof latestSupplyItems==="undefined"?[]:
        root.PDXSupplyOrder.orderItems(latestSupplyItems);
    };
    if(typeof latestSupplyItems!=="undefined"&&latestSupplyItems.length&&typeof getRecovery==="function"){
      finalize(getRecovery());
    }
    return true;
  }

  root.PDXSupplyRules={calculate,applyEyeDonorBlood,install};
  if(typeof module!=="undefined"&&module.exports)module.exports={
    ...root.PDXSupplyRules,quantities:root.PDXBladeCultureFix,
    order:root.PDXSupplyOrder,names:root.PDXSupplyNameFix,gloves:root.PDXGloveQuantityFix
  };
  if(typeof window!=="undefined"&&!install()){
    let tries=0;
    const timer=setInterval(function(){
      if(install()||++tries>80)clearInterval(timer);
    },200);
  }
})();
