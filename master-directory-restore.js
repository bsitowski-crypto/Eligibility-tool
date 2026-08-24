(function(){
"use strict";

window.SOLVITA_MASTER_DIRECTORY_RESTORE_VERSION="1";

// These rows complete the portions of the Funeral Homes worksheet that were
// missing from the split recovery/supplement files. Source: saved photos of the
// Portland Master Contact List, visible filtered rows 115-236.
const funeralAdditions=[
  {name:"Gethsemani Cemetery & FH",location:"Happy Valley, Oregon",ctms:"4354",phone:"503-659-1350"},
  {name:"Gray's West & Co Pioneer Chapel",location:"Baker City, Oregon",ctms:"4132",phone:"541-523-3677"},
  {name:"Greenhills Crematory & Cascade NW Chapel",location:"Kelso, Washington",ctms:"4322",phone:"360-636-0540",email:"greenhills1939@yahoo.com"},
  {name:"Gresham Memorial Chapel",location:"Gresham, Oregon",ctms:"4077",phone:"503-618-8176",email:"greshammemorialchapel@frontier.com",afterHours:"Yes",notes:"Two people live on premises and can provide after-hours access. PCC has keys."},
  {name:"Groulx Family Mortuary",location:"Rainier, Oregon",phone:"503-556-2323",notes:"Usually goes to Dahl-McVicker."},
  {name:"Hamilton-Mylan Funeral",location:"Vancouver, Washington",ctms:"4081",phone:"360-694-2537",email:"services@hamilton-mylanfuneralhome.com"},
  {name:"Heritage Memorial",location:"Portland, Oregon",ctms:"4084",phone:"503-231-1400",notes:"Goes to Crown."},
  {name:"Herring-Gloseclose",location:"Walla Walla, Washington",phone:"509-525-1150",afterHours:"No",difficulty:"4",director:"Matthew FD"},
  {name:"Hillcrest Memorial Park & Mortuary",location:"Medford, Oregon",ctms:"4085",phone:"541-773-6162",notes:"Sister location is Memory Gardens; funeral-home follow-up: 541-773-7338."},

  {name:"Keizer Funeral Chapel",location:"Keizer, Oregon",ctms:"4097",phone:"503-393-7037"},
  {name:"Killingsworth Little Chapel of the Chimes",location:"Portland, Oregon",ctms:"4098",phone:"503-283-1976"},
  {name:"LaFollette's Chapel",location:"Burns, Oregon",ctms:"4099",phone:"541-573-2731"},
  {name:"Lane Memorial Gardens & Funeral Home",location:"Eugene, Oregon",ctms:"4180",phone:"541-343-1684",notes:"Affiliated with Alpha Cremation."},
  {name:"Laynes Funeral Home",location:"Battle Ground, Washington",ctms:"4100",phone:"360-687-3143",afterHours:"Yes",notes:"Funeral director will meet transport with advance notice."},
  {name:"Lienkaemper-Thomason Chapel",location:"Ontario, Oregon",ctms:"4101",phone:"541-889-5353"},
  {name:"Lincoln Memorial Park & Funeral Home",location:"Portland, Oregon",ctms:"4102",phone:"503-771-1117",afterHours:"No",holding:"PFS"},

  {name:"Litwiller-Simonsen Funeral Home",location:"Ashland, Oregon",ctms:"4103",phone:"541-482-2816",email:"office@litwiller-simonsen.com"},
  {name:"Loveland Funeral Chapel",location:"La Grande, Oregon",ctms:"4147",phone:"541-963-5022",email:"lfc@lovelandfuneralchapel.com",afterHours:"Yes",holding:"No",notes:"Enterprise location uses the same number. After-hours access may be available for a fee; they may also provide PCC access."},
  {name:"Macy & Son",location:"McMinnville, Oregon",ctms:"4149",phone:"503-472-6151",email:"macy@macyandson.com"},
  {name:"Major Family Funeral Home",location:"Springfield, Oregon",ctms:"4239",phone:"541-746-9667",email:"majorfamilyfh@msn.com"},
  {name:"McHenry Funeral Home",location:"Corvallis, Oregon",ctms:"4176",phone:"541-757-8141",director:"Drew Lundgren - FD/Manager"},
  {name:"Memory Gardens (Memorial Gardens)",location:"Medford, Oregon",ctms:"4150",phone:"541-773-7338"},
  {name:"Molalla Funeral Chapel",location:"Molalla, Oregon",ctms:"4312",phone:"503-829-2379",notes:"Connected with Canby Funeral Chapel."},
  {name:"Monarch Crematory",location:"Tualatin, Oregon",phone:"503-445-9510",notes:"Holding facility for Wilhelm. Same location as Crown; deliver to the door marked Tulip."},
  {name:"Mountain View Memorial Chapel",location:"Myrtle Creek, Oregon",phone:"541-863-3148"},

  {name:"Munselle-Rhodes Funeral Home",location:"Milton-Freewater, Oregon",ctms:"4200",phone:"541-938-3433"},
  {name:"Murphy-Musgrove Funeral Home",location:"Junction City, Oregon",ctms:"4192",phone:"541-998-2152"},
  {name:"Musgrove Family Mortuary",location:"Eugene, Oregon",ctms:"4141",phone:"541-205-9366",notes:"Affiliated with West Lawn/Alpha."},
  {name:"Myrtle Creek Family Funeral Home",location:"Myrtle Creek, Oregon",ctms:"4206",phone:"541-863-5122"},
  {name:"Myrtle Grove Funeral Service",location:"Coquille, Oregon",ctms:"4137",phone:"541-396-3158",notes:"Same as Amling-Schroeder."},
  {name:"Myrtle Grove Funeral Service-Bay Area",location:"Coos Bay, Oregon",phone:"541-269-2851"},
  {name:"National Cremation",location:"Portland, Oregon",ctms:"4250",phone:"503-286-0965",email:"loc5291@sci-us.com",afterHours:"No",holding:"PFS"},
  {name:"Nelson's Bay Area Mortuary",location:"Coos Bay, Oregon",ctms:"4175",phone:"541-267-4216",email:"nelsonsbam@msn.com",notes:"Email facesheet to funeral home."},

  {name:"Omega Funeral & Cremation Services",location:"Portland, Oregon",ctms:"4109/4216",phone:"503-231-6030",email:"inquiry@omegaservices.com",afterHours:"No"},
  {name:"Oregon Cremation & Burial Company",location:"Portland, Oregon",ctms:"4217",phone:"503-235-3104",afterHours:"No",holding:"Crown Memorial"},
  {name:"Peake Funeral Chapel",location:"Milwaukie, Oregon",ctms:"4202",phone:"503-654-7755",notes:"Stehn Family Chapels."},
  {name:"Portland Cremation & Burial Service",location:"Portland, Oregon",phone:"503-231-6030"},
  {name:"Portland Funeral Alternatives",location:"Portland, Oregon",ctms:"4218"},
  {name:"Portland Funeral Service",location:"Portland, Oregon",ctms:"4358",phone:"503-288-5908",afterHours:"Sometimes",notes:"Synergy can drop off after hours but cannot pick up. Prefers Synergy over PCC."},
  {name:"Portland Memorial Funeral Home",location:"Portland, Oregon",ctms:"4111",phone:"503-236-4141"},
  {name:"Prineville Funeral Home",location:"Prineville, Oregon",ctms:"4229",phone:"541-447-6459"},
  {name:"Recompose",location:"Seattle, Washington",phone:"206-495-0840",email:"services@recompose.life",notes:"Works with PCC; email them to follow up on funeral-home calls."},
  {name:"Redwood Memorial Chapel",location:"Brookings, Oregon",ctms:"4136",phone:"541-469-9112",afterHours:"Yes",difficulty:"2"},
  {name:"Rogue Valley Funeral Alternatives",location:"Medford, Oregon",ctms:"4199",phone:"541-770-6505"},

  {name:"Stehn Family Chapels-Milwaukie Tribute Center",location:"Milwaukie, Oregon",ctms:"4203",phone:"503-654-7717",afterHours:"No",holding:"PCC"},
  {name:"Stehn Family Chapels-Portland Tribute Center",location:"Portland, Oregon",ctms:"4225",phone:"503-777-3366"},
  {name:"Stephen's Family Chapel",location:"Grants Pass, Oregon",ctms:"4308",phone:"541-476-7900",afterHours:"No"},
  {name:"Sticklin Funeral Chapel",location:"Centralia, Washington",ctms:"4377"},
  {name:"Straubs Funeral",location:"Vancouver, Washington",ctms:"4128",phone:"360-834-4563"},
  {name:"Sunnyside Little Chapel of the Chimes / Sunnyside Funeral & Cremation",location:"Portland, Oregon",ctms:"4112",phone:"503-659-1184",afterHours:"No",holding:"Crown Tualatin/Monarch",notes:"Holding facility is Crown Tualatin; use First Call for transport."},
  {name:"Sunset Hills FH & Crematory",location:"Eugene, Oregon",ctms:"4335",phone:"541-342-6853",email:"officeadmin@sunsethillseugene.com",afterHours:"Yes",holding:"PFS/PCC",difficulty:"1",notes:"Owned by Smith-Lund-Mills. Prefers phone calls for notifications; someone may be able to meet transport."},
  {name:"Sweeney Mortuary",location:"Heppner, Oregon",ctms:"4190",phone:"541-676-9600"},
  {name:"Sweet Home Funeral Chapel",location:"Sweet Home, Oregon",ctms:"4338",phone:"541-367-2891",email:"sweethomefuneral@comcast.net",afterHours:"Sometimes",notes:"Funeral director may be able to meet at the facility with advance notice."},

  {name:"Unger Funeral Chapel - Silverton",location:"Silverton, Oregon",ctms:"4235",phone:"503-873-5141",afterHours:"No"},
  {name:"Valley Memorial Park & Funeral Home",location:"Hillsboro, Oregon",ctms:"4367",phone:"503-213-4149",holding:"Crown Memorial"},
  {name:"Vancouver Funeral Chapel",location:"Vancouver, Washington",ctms:"4129",phone:"360-693-3633"},
  {name:"Virgil T Golden Funeral",location:"Salem, Oregon",ctms:"4117/4076",phone:"503-364-2257",email:"vtgolden@dignitymemorial.com",afterHours:"No",notes:"After-hours access may be granted for time-sensitive situations on a case-by-case basis; Synergy has access anytime."},
  {name:"Ward's Klamath Funeral Home",location:"Klamath Falls, Oregon",ctms:"4194",phone:"541-882-4404"},
  {name:"Waud's Funeral Home",location:"Tillamook, Oregon",ctms:"4124",phone:"503-842-7557"},
  {name:"West Lawn Memorial Park & Funeral Home",location:"Eugene, Oregon",ctms:"4182",phone:"541-342-8281",notes:"Affiliated with Musgroves/Alpha."},
  {name:"Westside Cremation Service",location:"Forest Grove, Oregon",ctms:"4184",phone:"503-640-9045",email:"brentt@westsidecremation.com",notes:"Riverview Abbey; always call to double-check availability."},
  {name:"Wherity Family Funerals & Cremations",location:"Tualatin, Oregon",ctms:"4245",phone:"503-885-8242",email:"wherityfamily@yahoo.com",holding:"Springers",notes:"May request facesheet."}
];

const nameAliases={
  "gray west":"gray s west co pioneer chapel",
  "wherry family funerals cremation":"wherity family funerals cremations",
  "youngs funeral home crematory":"young s funeral home crematory"
};

function plainKey(value){
  return String(value||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
}
function nameKey(value){
  const key=plainKey(value);
  return nameAliases[key]||key;
}
function locationKey(value){return plainKey(value)}
function blank(value){return value==null||String(value).trim()===""}
function clone(value){return JSON.parse(JSON.stringify(value))}
function slug(value){return plainKey(value).replace(/ /g,"-").slice(0,44)}

// The oldest compressed seed contains one funeral-home row spread from an
// array, leaving its values under numeric keys ("0" through "11") and its
// visible name blank. Repair that legacy row before merging or deduplicating.
function repairLegacyFuneralRows(list){
  if(!Array.isArray(list))return 0;
  const fields=[
    "name","location","ctms","phone","email","afterHours","holding",
    "notes","difficulty","director","ofda","distanceMiles"
  ];
  let changed=0;
  for(const item of list){
    if(!item||!blank(item.name)||blank(item[0]))continue;
    fields.forEach((field,index)=>{
      if(blank(item[field])&&!blank(item[index]))item[field]=item[index];
    });
    changed++;
  }
  return changed;
}

function newFuneral(src){
  return {
    id:"master-f-"+slug(src.name)+"-"+slug(src.location),
    name:src.name||"",location:src.location||"",ctms:src.ctms||"",phone:src.phone||"",
    email:src.email||"",afterHours:src.afterHours||"",holding:src.holding||"",
    notes:src.notes||"",difficulty:src.difficulty||"",director:src.director||"",
    ofda:src.ofda||"unknown",distanceMiles:src.distanceMiles||""
  };
}
function newHospital(src){
  return {
    id:"master-h-"+slug(src.name),name:src.name||"",code:src.code||"",morgue:src.morgue||"",
    main:src.main||"",contact:src.contact||"",systemAccess:src.systemAccess||"",
    recordsEmail:src.recordsEmail||"",mrFax:src.mrFax||"",cityCounty:src.cityCounty||"",
    ems:src.ems||"",notes:src.notes||"",distanceMiles:src.distanceMiles||""
  };
}

function funeralMatch(list,src){
  const nk=nameKey(src&&src.name),lk=locationKey(src&&src.location);
  if(!nk)return null;
  const same=list.filter(item=>nameKey(item&&item.name)===nk);
  if(lk){
    const exact=same.find(item=>locationKey(item&&item.location)===lk);
    if(exact)return exact;
    const noLocation=same.filter(item=>blank(item&&item.location));
    if(noLocation.length===1)return noLocation[0];
    return null;
  }
  return same.find(item=>blank(item&&item.location))||(same.length===1?same[0]:null);
}

function mergeList(target,source,type){
  if(!Array.isArray(target)||!Array.isArray(source))return 0;
  let changed=0;
  for(const src of source){
    if(!src||blank(src.name))continue;
    let dst=type==="h"
      ?target.find(item=>nameKey(item&&item.name)===nameKey(src.name))
      :funeralMatch(target,src);
    if(!dst){
      target.push(type==="h"?newHospital(src):newFuneral(src));
      changed++;
      continue;
    }
    const rawDstName=plainKey(dst.name);
    if(nameAliases[rawDstName]&&dst.name!==src.name){dst.name=src.name;changed++}
    for(const [field,value] of Object.entries(src)){
      if(field==="id"||field==="name"||blank(value)||!blank(dst[field]))continue;
      dst[field]=clone(value);
      changed++;
    }
  }
  return changed;
}

function dedupeList(list,type){
  if(!Array.isArray(list))return 0;
  const seen=new Map();
  let changed=0;
  for(let index=0;index<list.length;index++){
    const item=list[index]||{};
    const key=type==="h"
      ?nameKey(item.name)
      :nameKey(item.name)+"|"+locationKey(item.location);
    if(!key||key==="|")continue;
    if(!seen.has(key)){seen.set(key,item);continue}
    const kept=seen.get(key);
    for(const [field,value] of Object.entries(item)){
      if(field==="id"||blank(value)||!blank(kept[field]))continue;
      kept[field]=clone(value);
    }
    list.splice(index,1);
    index--;
    changed++;
  }
  if(type==="f"){
    const named=new Map();
    for(const item of list){
      const key=nameKey(item&&item.name);
      if(!key)continue;
      if(!named.has(key))named.set(key,[]);
      named.get(key).push(item);
    }
    for(const matches of named.values()){
      const located=matches.filter(item=>!blank(item&&item.location));
      const unlocated=matches.filter(item=>blank(item&&item.location));
      if(!located.length||!unlocated.length)continue;
      const kept=located[0];
      for(const duplicate of unlocated){
        for(const [field,value] of Object.entries(duplicate)){
          if(field==="id"||blank(value)||!blank(kept[field]))continue;
          kept[field]=clone(value);
        }
        const index=list.indexOf(duplicate);
        if(index>=0){list.splice(index,1);changed++}
      }
    }
  }
  return changed;
}

function persistDirectories(){
  try{localStorage.setItem(typeof DIRKEY!=="undefined"?DIRKEY:"solvita_v952_dirs",JSON.stringify(dirs))}catch(_error){}
}

function updateCounts(){
  try{
    window.SOLVITA_MASTER_DIRECTORY_COUNTS={
      hospitals:Array.isArray(dirs&&dirs.hospitals)?dirs.hospitals.length:0,
      funeralLocations:Array.isArray(dirs&&dirs.funerals)?dirs.funerals.length:0,
      funeralNames:Array.isArray(dirs&&dirs.funerals)?new Set(dirs.funerals.map(item=>nameKey(item&&item.name)).filter(Boolean)).size:0
    };
  }catch(_error){}
}

function applyMaster(render){
  try{
    if(typeof dirs==="undefined"||!dirs)return false;
    if(!Array.isArray(dirs.hospitals))dirs.hospitals=[];
    if(!Array.isArray(dirs.funerals))dirs.funerals=[];

    let changed=repairLegacyFuneralRows(dirs.funerals);
    if(typeof funeralSeed!=="undefined"&&Array.isArray(funeralSeed))changed+=repairLegacyFuneralRows(funeralSeed);
    changed+=mergeList(dirs.funerals,funeralAdditions,"f");
    if(typeof hospitalSeed!=="undefined"&&Array.isArray(hospitalSeed))changed+=mergeList(dirs.hospitals,hospitalSeed,"h");
    if(typeof funeralSeed!=="undefined"&&Array.isArray(funeralSeed))changed+=mergeList(dirs.funerals,funeralSeed,"f");

    // Consolidate every split supplement into the seeds used by RESTORE MASTER.
    // This also keeps user-created rows safe instead of deleting them on restore.
    if(typeof hospitalSeed!=="undefined"&&Array.isArray(hospitalSeed))changed+=mergeList(hospitalSeed,dirs.hospitals,"h");
    if(typeof funeralSeed!=="undefined"&&Array.isArray(funeralSeed))changed+=mergeList(funeralSeed,dirs.funerals,"f");

    changed+=dedupeList(dirs.hospitals,"h");
    changed+=dedupeList(dirs.funerals,"f");
    if(typeof hospitalSeed!=="undefined"&&Array.isArray(hospitalSeed))changed+=dedupeList(hospitalSeed,"h");
    if(typeof funeralSeed!=="undefined"&&Array.isArray(funeralSeed))changed+=dedupeList(funeralSeed,"f");

    if(changed)persistDirectories();
    updateCounts();
    if(render){
      try{if(typeof renderHospitals==="function")renderHospitals()}catch(_error){}
      try{if(typeof renderFunerals==="function")renderFunerals()}catch(_error){}
    }
    const version=document.querySelector(".ver");
    if(version)version.textContent="Version 9.10.12 — Streamlined Case Document";
    return true;
  }catch(error){
    console.warn("Master directory restore",error);
    return false;
  }
}

window.restoreMaster=function(type){
  applyMaster(false);
  if(type==="h"){
    if(!Array.isArray(dirs.hospitals))dirs.hospitals=[];
    if(typeof hospitalSeed!=="undefined"&&Array.isArray(hospitalSeed))mergeList(dirs.hospitals,hospitalSeed,"h");
    dedupeList(dirs.hospitals,"h");
    persistDirectories();
    updateCounts();
    try{if(typeof renderHospitals==="function")renderHospitals()}catch(_error){}
  }else{
    if(!Array.isArray(dirs.funerals))dirs.funerals=[];
    if(typeof funeralSeed!=="undefined"&&Array.isArray(funeralSeed))mergeList(dirs.funerals,funeralSeed,"f");
    dedupeList(dirs.funerals,"f");
    persistDirectories();
    updateCounts();
    try{if(typeof renderFunerals==="function")renderFunerals()}catch(_error){}
  }
};

applyMaster(true);
let attempts=0;
const timer=setInterval(function(){
  attempts++;
  applyMaster(attempts===8||attempts===24||attempts===40);
  if(attempts>=40)clearInterval(timer);
},250);
setTimeout(function(){applyMaster(true)},3000);
setTimeout(function(){applyMaster(true)},8000);
})();
