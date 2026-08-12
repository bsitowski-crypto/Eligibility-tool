(function(){
"use strict";
window.SOLVITA_HOSPITAL_SUPPLEMENT_VERSION="1";
const additions=[
  {
    name:"Portland Adventist Medical Center",
    code:"",
    morgue:"",
    main:"503-257-2500",
    contact:"",
    systemAccess:"Adventist Health",
    recordsEmail:"",
    mrFax:"",
    cityCounty:"Portland - Multnomah",
    ems:"",
    notes:"Currently Adventist Health Portland.",
    address:"10123 SE Market St, Portland, OR 97216"
  }
];
function key(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim()}
function blank(v){return v==null||String(v).trim()===""}
function merge(list){
  if(!Array.isArray(list))return list;
  for(const src of additions){
    let dst=list.find(x=>key(x&&x.name)===key(src.name));
    if(!dst){
      dst={id:"hsupp-"+key(src.name).replace(/ /g,"-"),name:src.name,code:"",morgue:"",main:"",contact:"",systemAccess:"",recordsEmail:"",mrFax:"",cityCounty:"",ems:"",notes:""};
      list.push(dst);
    }
    for(const [field,val] of Object.entries(src)){
      if(field==="name"||blank(val))continue;
      if(blank(dst[field])||field==="address")dst[field]=val;
    }
  }
  return list;
}
function apply(){
  try{
    if(typeof dirs==="undefined"||!dirs)return false;
    dirs.hospitals=merge(Array.isArray(dirs.hospitals)?dirs.hospitals:[]);
    if(typeof hospitalSeed!=="undefined"&&Array.isArray(hospitalSeed))merge(hospitalSeed);
    try{localStorage.setItem(typeof DIRKEY!=="undefined"?DIRKEY:"solvita_v952_dirs",JSON.stringify(dirs))}catch{}
    try{if(typeof renderHospitals==="function")renderHospitals()}catch{}
    return true;
  }catch{return false}
}
let tries=0;const t=setInterval(()=>{tries++;if(apply()||tries>=40)clearInterval(t)},250);
setTimeout(apply,2500);
setTimeout(apply,7000);
})();
