(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.PDXBilateralRecovery=api;
  api.install(root,root.document);
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const BILATERAL_IDS=new Set([
    "humerus","radius","ulna","femur","tibia","fibula","achilles",
    "hemi","antTib","postTib","gracilis","semitendinosus","peroneus",
    "kneeBlock","armBlock","fascia"
  ]);
  const STANDARD_OPT_IN_IDS=new Set(["kneeBlock","armBlock"]);
  const OCA_SIDE_IDS=[
    "freshHumerus","freshProxFemur","freshKnee","freshAnkle","silvieElbow"
  ];
  const OCA_DEFAULT_IDS=new Set([
    "freshHumerus","freshProxFemur","freshKnee","freshAnkle"
  ]);
  const ARM_BONE_IDS=["humerus","radius","ulna"];
  const SIDE_LABEL={left:"Left",right:"Right"};

  function unique(values){
    return [...new Set((values||[]).map(value=>String(value||"").trim()).filter(Boolean))];
  }

  function sideId(id,side){
    return `bilateral_${id}_${side}`;
  }

  function parseSideId(value){
    const match=String(value||"").match(/^bilateral_(.+)_(left|right)$/);
    return match?{id:match[1],side:match[2]}:null;
  }

  function savedSideState(restore,id,side,fallbackChecked){
    if(!restore?.initialized)return !!fallbackChecked;
    const sides=unique(restore.sides);
    const markers=sides.filter(value=>parseSideId(value)?.id===id);
    if(markers.length)return markers.includes(sideId(id,side));
    return unique(restore.selected).includes(id);
  }

  function ocaSideState(restore,id,side,isNewPlan,currentChecked){
    if(!restore?.initialized)return isNewPlan&&OCA_DEFAULT_IDS.has(id)?true:!!currentChecked;
    const sides=unique(restore.sides);
    const markers=sides.filter(value=>value===`${id}_left`||value===`${id}_right`);
    if(markers.length)return markers.includes(`${id}_${side}`);
    return unique(restore.selected).includes(id);
  }

  function displayName(id,side,recovery,graftName){
    const kneeOn=unique(recovery?.sides).includes(sideId("kneeBlock",side));
    if(id==="femur"&&kneeOn)return "Proximal Femur";
    if(id==="tibia"&&kneeOn)return "Distal Tibia";
    if(id==="kneeBlock")return "Solvita Knee Block";
    if(id==="armBlock")return "Solvita Arm Block";
    return graftName||id;
  }

  function combinedName(id,graftName){
    if(id==="kneeBlock")return "Solvita Knee Blocks";
    if(id==="armBlock")return "Solvita Arm Blocks";
    return graftName||id;
  }

  function armConflictState(recovery){
    const sides=new Set(unique(recovery?.sides));
    const blockSides=["left","right"].filter(side=>sides.has(sideId("armBlock",side)));
    const boneSides=["left","right"].filter(side=>
      ARM_BONE_IDS.some(id=>sides.has(sideId(id,side)))
    );
    const sameSide=blockSides.some(side=>boneSides.includes(side));
    const crossSideOnly=!sameSide&&blockSides.length>0&&boneSides.length>0;
    return {sameSide,crossSideOnly,blockSides,boneSides};
  }

  function armConflictClearTargets(inputId,isChecked){
    if(!isChecked)return [];
    const targets=[];
    const parsed=parseSideId(inputId);
    if(parsed?.id==="armBlock"){
      ARM_BONE_IDS.forEach(id=>targets.push(sideId(id,parsed.side)));
      targets.push(`silvieElbow_${parsed.side}`);
    }else if(parsed&&ARM_BONE_IDS.includes(parsed.id)){
      targets.push(sideId("armBlock",parsed.side),`silvieElbow_${parsed.side}`);
    }

    const elbow=String(inputId||"").match(/^silvieElbow_(left|right)$/);
    if(elbow){
      ARM_BONE_IDS.forEach(id=>targets.push(sideId(id,elbow[1])));
      targets.push(sideId("armBlock",elbow[1]));
    }
    return unique(targets);
  }

  function install(root,document){
    let installed=false;

    function graft(id){
      try{return typeof root.G==="function"?root.G(id):null}catch{return null}
    }

    function addStyles(){
      if(document.getElementById("bilateralRecoveryStyles"))return;
      const style=document.createElement("style");
      style.id="bilateralRecoveryStyles";
      style.textContent=`
        #recoveryOptions .bilateral-graft-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(164px,210px);gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #e7e7eb}
        #recoveryOptions .bilateral-graft-name{font-size:16px;font-weight:760;line-height:1.2}
        #recoveryOptions .bilateral-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        #recoveryOptions .bilateral-choice{display:flex;align-items:center;gap:6px;min-width:0;min-height:42px;padding:7px 8px;border:1px solid #d6d6dc;border-radius:10px;background:#fff}
        #recoveryOptions .bilateral-choice input{appearance:auto;-webkit-appearance:checkbox;width:22px;height:22px;min-width:22px;margin:0;padding:0;accent-color:#0b84f3}
        #recoveryOptions .bilateral-choice label{display:block;min-width:0;margin:0;font-size:14px;font-weight:720;line-height:1.15}
        #recoveryOptions .bilateral-oca-row{padding:11px;margin:9px 0;border:1px solid #dfe2e7;border-radius:11px;background:#f8f8fa}
        #recoveryOptions .bilateral-oca-title{margin-top:20px;color:#0b4f9c;border-bottom-color:#9ebfe4}
        #recoveryOptions .bilateral-oca-note{margin:5px 0 9px;color:#5e6c7c}
        @media(max-width:520px){
          #recoveryOptions .bilateral-graft-row{grid-template-columns:minmax(0,1fr) minmax(150px,174px);gap:8px}
          #recoveryOptions .bilateral-choice{padding:6px;min-height:40px}
          #recoveryOptions .bilateral-choice input{width:21px;height:21px;min-width:21px}
          #recoveryOptions .bilateral-choice label{font-size:13px}
        }
      `;
      document.head.appendChild(style);
    }

    function choice(input,side){
      const wrap=document.createElement("div");
      wrap.className="bilateral-choice";
      const label=document.createElement("label");
      label.htmlFor=input.id;
      label.textContent=SIDE_LABEL[side];
      wrap.append(input,label);
      return wrap;
    }

    function rowShell(id,title,extraClass){
      const row=document.createElement("div");
      row.className=`bilateral-graft-row${extraClass?` ${extraClass}`:""}`;
      row.dataset.bilateralGraft=id;
      const name=document.createElement("div");
      name.className="bilateral-graft-name";
      name.textContent=title;
      const pair=document.createElement("div");
      pair.className="bilateral-pair";
      row.append(name,pair);
      return {row,pair,name};
    }

    function bindNewInput(input){
      input.addEventListener("change",event=>{
        if(typeof root.recChanged==="function")root.recChanged(event);
      });
    }

    function transformStandard(id,restore){
      const generic=document.getElementById("recover_"+id);
      const oldRow=generic?.closest(".check");
      if(!generic||!oldRow)return null;
      const oldLabel=document.querySelector(`label[for="recover_${id}"]`)||oldRow.querySelector("label");
      const title=String(oldLabel?.textContent||graft(id)?.name||id).trim();
      const oldChecked=generic.checked;
      const built=rowShell(id,title,"");

      for(const side of ["left","right"]){
        const input=document.createElement("input");
        input.type="checkbox";
        input.id=sideId(id,side);
        input.className="recovery-side bilateral-side";
        input.dataset.graftId=id;
        input.dataset.side=side;
        input.checked=savedSideState(restore,id,side,oldChecked&&!STANDARD_OPT_IN_IDS.has(id));
        bindNewInput(input);
        built.pair.appendChild(choice(input,side));
      }

      oldRow.replaceWith(built.row);
      return built.row;
    }

    function transformOca(id,restore,isNewPlan){
      const left=document.getElementById(`${id}_left`);
      const right=document.getElementById(`${id}_right`);
      const oldRow=left?.closest(".proc")||right?.closest(".proc");
      if(!left||!right||!oldRow)return null;
      if(oldRow.dataset.bilateralGraft)return oldRow;

      left.checked=ocaSideState(restore,id,"left",isNewPlan,left.checked);
      right.checked=ocaSideState(restore,id,"right",isNewPlan,right.checked);
      const title=String(oldRow.querySelector("strong")?.textContent||graft(id)?.name||id).trim();
      const built=rowShell(id,title,"proc bilateral-oca-row");
      built.pair.append(choice(left,"left"),choice(right,"right"));
      oldRow.replaceWith(built.row);
      return built.row;
    }

    function groupOcaRows(rows){
      const valid=rows.filter(Boolean);
      if(!valid.length)return;
      const pfoTitle=[...document.querySelectorAll("#recoveryOptions .rec-title")]
        .find(node=>String(node.textContent||"").trim()==="PFO");
      if(!pfoTitle)return;

      let title=document.getElementById("bilateralOcaTitle");
      if(!title){
        title=document.createElement("div");
        title.id="bilateralOcaTitle";
        title.className="rec-title bilateral-oca-title";
        title.textContent="OCA / JRF";
        pfoTitle.before(title);
        const note=document.createElement("div");
        note.className="small bilateral-oca-note";
        note.textContent="Eligible OCA/JRF grafts are selected automatically. Silvie’s List remains optional.";
        title.after(note);
      }
      for(const row of valid)pfoTitle.before(row);
    }

    function enhanceRecovery(restore){
      const host=document.getElementById("recoveryOptions");
      if(!host)return;
      const isNewPlan=!restore?.initialized;

      for(const id of BILATERAL_IDS)transformStandard(id,restore);
      const ocaRows=OCA_SIDE_IDS.map(id=>transformOca(id,restore,isNewPlan));
      groupOcaRows(ocaRows);

      try{if(typeof root.syncSilvieHumerus==="function")root.syncSilvieHumerus()}catch{}
      try{if(typeof root.syncSilvieNerves==="function")root.syncSilvieNerves()}catch{}
      try{if(typeof root.syncFreshKneeProxFemur==="function")root.syncFreshKneeProxFemur()}catch{}
      try{if(typeof root.syncSingleFreshKneeOppositeLeg==="function")root.syncSingleFreshKneeOppositeLeg(false)}catch{}
      refreshSideLabels();
    }

    function checked(id,side){
      return !!document.getElementById(sideId(id,side))?.checked;
    }

    function setChecked(id,side,value){
      const input=document.getElementById(sideId(id,side));
      if(input)input.checked=!!value;
    }

    function beforeChange(input){
      for(const targetId of armConflictClearTargets(input?.id,input?.checked)){
        const target=document.getElementById(targetId);
        if(target)target.checked=false;
      }
    }

    function refreshSideLabels(){
      for(const side of ["left","right"]){
        for(const id of ["femur","tibia"]){
          const input=document.getElementById(sideId(id,side));
          const label=input?document.querySelector(`label[for="${input.id}"]`):null;
          if(!label)continue;
          const knee=checked("kneeBlock",side);
          label.textContent=knee
            ? `${SIDE_LABEL[side]} — ${id==="femur"?"Proximal":"Distal"}`
            : SIDE_LABEL[side];
        }
      }
    }

    function wrapBuildRecovery(){
      const original=root.buildRecovery;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(list,restore){
        const result=original.apply(this,arguments);
        enhanceRecovery(restore);
        return result;
      };
      wrapped.__pdxBilateralRecovery=true;
      root.buildRecovery=wrapped;
    }

    function wrapGetRecovery(){
      const original=root.getRecovery;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(){
        const result=original.apply(this,arguments)||{selected:[],sides:[]};
        const selected=unique(result.selected);
        const sides=unique(result.sides);
        document.querySelectorAll(".bilateral-side:checked").forEach(input=>{
          const parsed=parseSideId(input.id);
          if(!parsed)return;
          sides.push(input.id);
          selected.push(parsed.id);
        });
        return {selected:unique(selected),sides:unique(sides)};
      };
      wrapped.__pdxBilateralRecovery=true;
      root.getRecovery=wrapped;
    }

    function wrapRecChanged(){
      const original=root.recChanged;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(event){
        beforeChange(event?.target);
        const result=original.apply(this,arguments);
        refreshSideLabels();
        return result;
      };
      wrapped.__pdxBilateralRecovery=true;
      root.recChanged=wrapped;
    }

    function wrapKneeLabels(){
      const original=root.kneeLabels;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        refreshSideLabels();
        return result;
      };
      wrapped.__pdxBilateralRecovery=true;
      root.kneeLabels=wrapped;
    }

    function wrapValidateRecovery(){
      const original=root.validateRecovery;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(){
        const liveGet=root.getRecovery;
        const full=typeof liveGet==="function"?liveGet():{selected:[],sides:[]};
        const conflict=armConflictState(full);
        if(!conflict.crossSideOnly)return original.apply(this,arguments);

        // The legacy validator treats an arm block and any standard arm bone as
        // a global conflict. During validation only, hide the arm-block base ID
        // when the selections are exclusively on opposite sides. Side markers
        // remain intact, so printable grafts and all supply calculations retain
        // the complete recovery plan.
        root.getRecovery=function(){
          const current=liveGet();
          return Object.assign({},current,{
            selected:unique(current.selected).filter(id=>id!=="armBlock")
          });
        };

        let result;
        try{
          result=original.apply(this,arguments);
        }finally{
          root.getRecovery=liveGet;
        }

        try{if(typeof root.buildSupplies==="function")root.buildSupplies(full)}catch{}
        try{if(typeof root.snapshot==="function")root.snapshot()}catch{}
        return result;
      };
      wrapped.__pdxBilateralRecovery=true;
      root.validateRecovery=wrapped;
    }

    function replaceSilvieSync(){
      if(typeof root.syncSilvieHumerus!=="function"||root.syncSilvieHumerus.__pdxBilateralRecovery)return;
      const wrapped=function(onlySide){
        const sides=onlySide?[onlySide]:["left","right"];
        for(const side of sides){
          const elbow=document.getElementById(`silvieElbow_${side}`);
          const hum=document.getElementById(`freshHumerus_${side}`);
          const prox=document.getElementById(`freshProxHumerus_${side}`);
          if(elbow?.checked){
            if(hum&&hum.dataset.beforeSilvie===undefined)hum.dataset.beforeSilvie=hum.checked?"1":"0";
            if(hum)hum.checked=false;
            if(prox)prox.checked=true;
          }else{
            if(prox)prox.checked=false;
            if(hum&&hum.dataset.beforeSilvie!==undefined){
              hum.checked=hum.dataset.beforeSilvie==="1";
              delete hum.dataset.beforeSilvie;
            }
          }
          const label=document.querySelector(`label[for="freshHumerus_${side}"]`);
          if(label)label.textContent=elbow?.checked
            ? `${SIDE_LABEL[side]} — Proximal (automatic)`
            : SIDE_LABEL[side];
        }
      };
      wrapped.__pdxBilateralRecovery=true;
      root.syncSilvieHumerus=wrapped;
    }

    function removeBilateralNames(items,id,names){
      const probes=new Set(names.map(name=>String(name||"").trim()).filter(Boolean));
      return (items||[]).filter(value=>{
        const text=String(value||"").trim();
        if(probes.has(text))return false;
        return ![...probes].some(name=>text===`Left ${name}`||text===`Right ${name}`);
      });
    }

    function wrapPrintableGroups(){
      const original=root.currentPrintableGraftGroups;
      if(typeof original!=="function"||original.__pdxBilateralRecovery)return;
      const wrapped=function(){
        const groups=original.apply(this,arguments)||{solvita:[],pfo:[],oca:[]};
        const output={
          solvita:[...(groups.solvita||[])],
          pfo:[...(groups.pfo||[])],
          oca:[...(groups.oca||[])]
        };
        const recovery=typeof root.getRecovery==="function"?root.getRecovery():{selected:[],sides:[]};
        const sideValues=unique(recovery.sides);

        output.solvita=output.solvita.filter(value=>!/^all(?: other)? tendons$/i.test(String(value||"").trim()));
        for(const id of BILATERAL_IDS){
          const graftName=String(graft(id)?.name||id);
          const aliases=[graftName];
          if(id==="femur")aliases.push("Proximal Femur");
          if(id==="tibia")aliases.push("Distal Tibia");
          if(id==="kneeBlock")aliases.push("Solvita Knee Block","Solvita Knee Blocks");
          if(id==="armBlock")aliases.push("Solvita Arm Block","Solvita Arm Blocks");
          output.solvita=removeBilateralNames(output.solvita,id,aliases);
          const chosen=["left","right"].filter(side=>sideValues.includes(sideId(id,side)));
          if(!chosen.length)continue;
          const names=chosen.map(side=>displayName(id,side,recovery,graftName));
          if(chosen.length===2&&names[0]===names[1]){
            output.solvita.push(combinedName(id,names[0]));
          }else{
            chosen.forEach((side,index)=>output.solvita.push(`${SIDE_LABEL[side]} ${names[index]}`));
          }
        }

        const ocaNames={
          freshHumerus:"Fresh Humerus",
          freshProxHumerus:"Fresh Proximal Humerus",
          freshProxFemur:"Fresh Proximal Femur",
          freshKnee:"Fresh Knee Block",
          freshAnkle:"Fresh Ankle Block",
          silvieElbow:"Silvie's List Elbow Block"
        };
        for(const [id,name] of Object.entries(ocaNames)){
          output.oca=removeBilateralNames(output.oca,id,[name]);
          const chosen=["left","right"].filter(side=>sideValues.includes(`${id}_${side}`));
          if(chosen.length===2)output.oca.push(name);
          else if(chosen.length===1)output.oca.push(`${SIDE_LABEL[chosen[0]]} ${name}`);
        }
        return output;
      };
      wrapped.__pdxBilateralRecovery=true;
      root.currentPrintableGraftGroups=wrapped;
    }

    function boot(){
      if(installed)return true;
      if(!document.getElementById("recoveryOptions")||typeof root.buildRecovery!=="function")return false;
      installed=true;
      addStyles();
      replaceSilvieSync();
      wrapGetRecovery();
      wrapRecChanged();
      wrapKneeLabels();
      wrapValidateRecovery();
      wrapBuildRecovery();
      wrapPrintableGroups();
      return true;
    }

    if(boot())return true;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(boot()||attempts>80)clearInterval(timer);
    },150);
    return false;
  }

  return {
    BILATERAL_IDS,
    OCA_SIDE_IDS,
    OCA_DEFAULT_IDS,
    sideId,
    parseSideId,
    savedSideState,
    ocaSideState,
    displayName,
    combinedName,
    armConflictState,
    armConflictClearTargets,
    install
  };
});
