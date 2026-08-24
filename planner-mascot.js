(function(root,factory){
  const api=factory(root);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.PDXPlannerMascot=api;
  api.install();
})(typeof window!=="undefined"?window:null,function(root){
  "use strict";

  const ANIMALS=Object.freeze([
    {key:"red-fox",label:"Red Fox"},
    {key:"sea-otter",label:"Sea Otter"},
    {key:"snowy-owl",label:"Snowy Owl"},
    {key:"tiger",label:"Tiger"},
    {key:"giant-panda",label:"Giant Panda"},
    {key:"giraffe",label:"Giraffe"},
    {key:"elephant",label:"Elephant"},
    {key:"emperor-penguin",label:"Emperor Penguin"},
    {key:"raccoon",label:"Raccoon"},
    {key:"koala",label:"Koala"},
    {key:"zebra",label:"Zebra"},
    {key:"polar-bear",label:"Polar Bear"}
  ]);
  const BY_KEY=new Map(ANIMALS.map(animal=>[animal.key,animal]));

  function hash32(value,seed){
    let hash=seed>>>0;
    for(const character of String(value??"")){
      hash^=character.charCodeAt(0);
      hash=Math.imul(hash,16777619)>>>0;
    }
    return hash>>>0;
  }

  function fingerprint(value){
    const text=String(value??"");
    const first=hash32(text,2166136261);
    const second=hash32(text.split("").reverse().join(""),2246822519);
    return first.toString(16).padStart(8,"0")+
      second.toString(16).padStart(8,"0");
  }

  function signatureFor(data){
    const printable={
      donor:String(data?.donor??""),
      sections:Array.isArray(data?.sections)?data.sections:[],
      supplies:Array.isArray(data?.supplies)?data.supplies:[]
    };
    return fingerprint(JSON.stringify(printable));
  }

  function chooseAnimalKey(donorId,usedKeys){
    const used=new Set(usedKeys||[]);
    const start=hash32(donorId||"PDX donor",2166136261)%ANIMALS.length;
    for(let offset=0;offset<ANIMALS.length;offset++){
      const animal=ANIMALS[(start+offset)%ANIMALS.length];
      if(!used.has(animal.key))return animal.key;
    }
    return ANIMALS[start].key;
  }

  function markerFromState(donor){
    const animal=BY_KEY.get(donor?.plannerMascotKey)||ANIMALS[0];
    const revision=Math.max(1,Number.parseInt(donor?.plannerRevision,10)||1);
    return {
      key:animal.key,
      label:animal.label,
      revision,
      imageUrl:`./assets/animals/${animal.key}.png`
    };
  }

  function applyMarkerState(donor,signature,usedKeys){
    if(!donor||typeof donor!=="object"){
      const fallback={
        plannerMascotKey:chooseAnimalKey(String(signature||"case"),usedKeys),
        plannerRevision:1
      };
      return {changed:false,marker:markerFromState(fallback)};
    }

    let changed=false;
    if(!BY_KEY.has(donor.plannerMascotKey)){
      donor.plannerMascotKey=chooseAnimalKey(donor.id||signature,usedKeys);
      changed=true;
    }

    let revision=Number.parseInt(donor.plannerRevision,10);
    if(!Number.isFinite(revision)||revision<1){
      revision=1;
      donor.plannerRevision=revision;
      changed=true;
    }

    if(signature&&donor.plannerRevisionSignature&&
      donor.plannerRevisionSignature!==signature){
      donor.plannerRevision=revision+1;
      revision=donor.plannerRevision;
      changed=true;
    }
    if(signature&&donor.plannerRevisionSignature!==signature){
      donor.plannerRevisionSignature=signature;
      donor.plannerRevisionUpdatedAt=new Date().toISOString();
      changed=true;
    }

    return {changed,marker:markerFromState(donor)};
  }

  function donorList(){
    try{
      if(typeof donors!=="undefined"&&Array.isArray(donors))return donors;
    }catch{}
    return [];
  }

  function currentDonor(){
    try{if(typeof cur==="function")return cur()||null}catch{}
    try{
      if(typeof activeId!=="undefined"){
        return donorList().find(donor=>donor.id===activeId)||null;
      }
    }catch{}
    return null;
  }

  function usedAnimalKeys(current){
    return donorList()
      .filter(donor=>donor&&donor.id!==current?.id&&!donor.archivedAt)
      .map(donor=>donor.plannerMascotKey)
      .filter(key=>BY_KEY.has(key));
  }

  function persist(){
    try{if(typeof save==="function")save()}catch(err){
      console.warn("Planner mascot save",err);
    }
  }

  function markerForCurrent(data){
    const signature=signatureFor(data);
    const donor=currentDonor();
    const state=applyMarkerState(donor,signature,usedAnimalKeys(donor));
    if(state.changed&&donor)persist();
    return state.marker;
  }

  function install(){
    const version=root.document.querySelector(".ver");
    if(version)version.textContent="Version 9.10.13 - Case Mascots + Supply Correction";
  }

  return {
    ANIMALS,hash32,fingerprint,signatureFor,chooseAnimalKey,
    markerFromState,applyMarkerState,markerForCurrent,install
  };
});
