(function(){
  "use strict";
  window.SOLVITA_DIRECTORY_RECOVERY_VERSION="2";

  const hospitals=[
    {name:"Cottage Grove Comm.",code:"ZD4",morgue:"No",main:"541-942-0511",contact:"Referring RN",systemAccess:"PeaceHealth",recordsEmail:"",mrFax:"541-942-0353",cityCounty:"Cottage Grove - Douglas",ems:"South Lane",notes:"No morgue"},
    {name:"Curry General",code:"CG1",morgue:"No",main:"541-247-3000",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"541-247-3101",cityCounty:"Gold Beach - Curry",ems:"CA-OR EMS",notes:"Usually goes to Redwood Memorial - Brookings"},
    {name:"Good Shepherd",code:"GOO",morgue:"No",main:"541-567-6483",contact:"Referring RN",systemAccess:"CHI no access",recordsEmail:"",mrFax:"541-667-3457",cityCounty:"Hermiston - Umatilla",ems:"",notes:""},
    {name:"Grande Ronde",code:"",morgue:"No",main:"541-963-8421",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"",mrFax:"",cityCounty:"La Grande - Union",ems:"",notes:""},
    {name:"Harney District",code:"HNY",morgue:"No",main:"541-573-7281",contact:"RNS",systemAccess:"St. Charles",recordsEmail:"",mrFax:"541-573-8553",cityCounty:"Burns - Harney",ems:"",notes:""},
    {name:"Hillsboro Medical Center - OHSU",code:"TUA",morgue:"No",main:"503-681-1111",contact:"503-681-1969",systemAccess:"OHSU",recordsEmail:"",mrFax:"503-681-1947",cityCounty:"Hillsboro - Washington",ems:"",notes:""},
    {name:"Kaiser Westside",code:"KWM",morgue:"Yes",main:"971-310-1000",contact:"HAS: 503-502-4356",systemAccess:"Kaiser",recordsEmail:"",mrFax:"",cityCounty:"Hillsboro - Washington",ems:"",notes:"RN needs time to get paperwork ready"},
    {name:"Lake District",code:"LDH",morgue:"No",main:"541-947-2114",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"",mrFax:"541-947-3359",cityCounty:"Lakeview - Lake",ems:"",notes:"Desert Rose FH for cooling"},
    {name:"Legacy Silverton",code:"SILV",morgue:"No",main:"503-873-1500",contact:"Referring RN",systemAccess:"Legacy",recordsEmail:"",mrFax:"503-873-1535",cityCounty:"Silverton - Lane",ems:"",notes:""},
    {name:"Lower Umpqua Hospital",code:"LUH",morgue:"No",main:"541-271-2171",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"",mrFax:"541-271-2941",cityCounty:"Reedsport - Douglas",ems:"",notes:"Donors usually go to Amling-Schroeder FH"},
    {name:"McKenzie Willamette MC",code:"MSO",morgue:"No",main:"541-726-4400",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"mowmedicalrecords@sharecare.com",mrFax:"541-741-7219",cityCounty:"Springfield - Lane",ems:"",notes:"No morgue, usually goes to Anderson Tribute or Spencer Libby"},
    {name:"PeaceHealth Peace Harbor",code:"PEA",morgue:"No",main:"541-997-8412",contact:"Referring RN",systemAccess:"PeaceHealth",recordsEmail:"",mrFax:"541-431-8265",cityCounty:"Florence - Lane",ems:"",notes:"Body often goes to Burns Riverside"},
    {name:"Pioneer Memorial (Heppner)",code:"PIO",morgue:"No",main:"541-676-9133",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"",mrFax:"541-676-2900",cityCounty:"Heppner - Morrow",ems:"",notes:"No morgue, body likely to go to Burns for Sweeney Mortuary"},
    {name:"Providence Hood River",code:"HRO",morgue:"No",main:"541-386-3911",contact:"RNS",systemAccess:"Providence",recordsEmail:"",mrFax:"541-387-6215",cityCounty:"Hood River - Hood River",ems:"Hood River Fire",notes:"No morgue, body will go to FH, typically Andersons. Medical Examiner Dr. Chris Vantilburg 541-490-2983"},
    {name:"Providence Medford",code:"MOR",morgue:"No",main:"541-732-5000",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"541-732-5879",cityCounty:"Medford - Jackson",ems:"Mercy Flights",notes:""},
    {name:"Providence Milwaukie",code:"PMI",morgue:"No",main:"503-652-8300",contact:"RNS",systemAccess:"Providence",recordsEmail:"",mrFax:"503-513-8466",cityCounty:"Milwaukie - Clackamas",ems:"",notes:""},
    {name:"Providence Newberg",code:"PNC",morgue:"No",main:"503-537-1555",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"503-537-1806",cityCounty:"Newberg - Yamhill",ems:"",notes:""},
    {name:"Providence Seaside",code:"PSH",morgue:"No",main:"503-717-7000",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"503-717-7292",cityCounty:"Seaside - Clatsop",ems:"",notes:""},
    {name:"Providence St. Mary's",code:"WW1",morgue:"Yes",main:"509-897-3320",contact:"RNS cell (509) 522-5101",systemAccess:"Providence - WA",recordsEmail:"",mrFax:"509-522-5776",cityCounty:"Walla Walla - Wallowa",ems:"",notes:"Use Miller transport if needed/Sightlife territory"},
    {name:"Providence Willamette Falls",code:"WFC",morgue:"No",main:"503-656-1631",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"503-723-6556",cityCounty:"Oregon City - Clackamas",ems:"",notes:""},
    {name:"Sacred Heart Riverbend",code:"SHG",morgue:"Yes",main:"541-222-7300",contact:"Patient Placement: 541-222-3000",systemAccess:"PeaceHealth",recordsEmail:"",mrFax:"541-341-8265",cityCounty:"Eugene - Lane",ems:"",notes:""},
    {name:"Sacred Heart University",code:"ZZX",morgue:"No",main:"541-686-7300",contact:"Patient Access at 541-222-1228, ok to leave a voicemail",systemAccess:"PeaceHealth",recordsEmail:"",mrFax:"541-341-3017",cityCounty:"Eugene - Lane",ems:"",notes:""},
    {name:"Samaritan - Lebanon Community",code:"LCH",morgue:"No",main:"541-258-2101",contact:"Referring RN",systemAccess:"Samaritan",recordsEmail:"",mrFax:"541-451-7071",cityCounty:"Lebanon - Linn",ems:"",notes:"No morgue, hospital gets snippy if donors hang out too long"},
    {name:"Samaritan North Lincoln Hospital",code:"NLC",morgue:"No",main:"541-994-3661",contact:"Referring RN",systemAccess:"Samaritan",recordsEmail:"",mrFax:"541-996-7310",cityCounty:"Lincoln City - Lincoln",ems:"",notes:""},
    {name:"Samaritan Pacific Communities",code:"PC1",morgue:"No",main:"541-265-2244",contact:"RNS",systemAccess:"Samaritan",recordsEmail:"",mrFax:"541-574-1836",cityCounty:"Newport - Lincoln",ems:"",notes:"Body often goes to Pacific View, no access before 9am"},
    {name:"Santiam Memorial",code:"SIH",morgue:"No",main:"503-769-2175",contact:"Referring RN",systemAccess:"St. Charles",recordsEmail:"",mrFax:"503-769-5312",cityCounty:"Stayton - Marion",ems:"Santiam Ambulance (in hospital)",notes:""},
    {name:"Southern Coos General",code:"SC1",morgue:"No",main:"541-347-2426",contact:"Referring RN",systemAccess:"Providence",recordsEmail:"",mrFax:"541-347-7324",cityCounty:"Bandon - Coos",ems:"Bay City or CA/OR EMS",notes:""},
    {name:"St. Anthony Hospital",code:"TPO",morgue:"No",main:"541-276-5121",contact:"Referring RN",systemAccess:"NO EMR",recordsEmail:"",mrFax:"541-966-0519",cityCounty:"Pendleton - Umatilla",ems:"",notes:""},
    {name:"St. Charles (Madras)",code:"MVO",morgue:"No",main:"541-475-3882",contact:"Referring RN",systemAccess:"St. Charles",recordsEmail:"",mrFax:"541-475-4801",cityCounty:"Madras - Jefferson",ems:"",notes:""},
    {name:"St. Charles (Redmond)",code:"CRO",morgue:"No",main:"541-548-8131",contact:"House Supervisor",systemAccess:"St. Charles",recordsEmail:"",mrFax:"541-706-2729",cityCounty:"Redmond - Deschutes",ems:"",notes:""},
    {name:"St. Charles Prineville",code:"PRP",morgue:"No",main:"541-447-6254",contact:"Referring RN",systemAccess:"St. Charles",recordsEmail:"",mrFax:"541-447-8344",cityCounty:"Prineville - Crook",ems:"",notes:""},
    {name:"St. Johns PeaceHealth",code:"SJP",morgue:"No",main:"360-423-1530",contact:"Nurs. Super.",systemAccess:"PeaceHealth",recordsEmail:"",mrFax:"360-414-7646",cityCounty:"Longview - Cowlitz",ems:"",notes:"Sightlife territory"},
    {name:"Three Rivers Community",code:"TRD",morgue:"No",main:"541-472-7000",contact:"Nurs. Super.",systemAccess:"Asante",recordsEmail:"ROI@asante.org",mrFax:"541-472-7129",cityCounty:"Grants Pass - Josephine",ems:"",notes:""}
  ];

  const funeralNames=[
    ["Andreason’s Springfield Cremation Center","Springfield, Oregon","4237","541-485-6659 / 541-747-1266","heather@andreasons.com","Yes","","Email paperwork. They will not receive donors on weekends."],
    ["Attrell’s Sherwood Funeral Chapel","Sherwood, Oregon"],
    ["Aurora Cremation & Burial Services","Eugene, Oregon"],
    ["Autumn Funerals","La Pine, Oregon"],
    ["Bateman-Carroll Funeral Home","Gresham, Oregon"],
    ["Buell Funeral Chapel","Springfield, Oregon"],
    ["Cascade Cremation & Burial",""],
    ["Cascadia",""],
    ["Chapel of Memories",""],
    ["Clark County Crematory","Vancouver, Washington"],
    ["Columbia Funeral Home & Cremation Center",""],
    ["Columbia River Cremation",""],
    ["Coos Bay Chapel Cremation & Funeral Service","Coos Bay, Oregon"],
    ["Crown - Portland NE (Broadway Street)","Portland, Oregon"],
    ["Crown - Portland SE (122nd Avenue)","Portland, Oregon"],
    ["Crown - Salem","Salem, Oregon"],
    ["Crown - Tigard","Tigard, Oregon"],
    ["Dahl-McVicker Funeral Home","Kelso, Washington"],
    ["Dalles Mortuary Tribute Center","The Dalles, Oregon"],
    ["Daniels Knopp Funeral Cremation & Life Celebration Center","La Grande, Oregon"],
    ["Davenport’s Chapel of the Good Shepherd","Klamath Falls, Oregon"],
    ["Gray West",""],
    ["Holman’s Funeral & Cremation Service","Portland, Oregon"],
    ["Hustad Funeral Home","Portland, Oregon"],
    ["Omega Funeral & Cremation Services","Portland, Oregon"],
    ["Oregon Cremation & Burial Company",""],
    ["Pacific View Memorial Chapel","Lincoln City, Oregon"],
    ["Peake Funeral Chapel","Milwaukie, Oregon"],
    ["Portland Cremation & Burial Service","Portland, Oregon"],
    ["Portland Funeral Alternatives","Portland, Oregon"],
    ["Portland Funeral Center","Portland, Oregon"],
    ["Portland Funeral Service","Portland, Oregon"],
    ["Portland Memorial Funeral Home","Portland, Oregon"],
    ["Prineville Funeral Home","Prineville, Oregon"],
    ["Recompose","Seattle, Washington"],
    ["Redmond Memorial Chapel","Redmond, Oregon"],
    ["Redwood Memorial Chapel","Brookings, Oregon"],
    ["Rest-Haven Memorial Park Funeral Home","Eugene, Oregon"],
    ["Restlawn Funeral Home","Salem, Oregon"],
    ["Riverview Abbey Funeral Home","Portland, Oregon"],
    ["Riverview Cemetery Funeral Home","Portland, Oregon"],
    ["Rogue Valley Cremation","Medford, Oregon"],
    ["Rose City Cemetery & Funeral Home","Portland, Oregon"],
    ["Ross Hollywood Chapel","Portland, Oregon"],
    ["Sandy Funeral Home","Sandy, Oregon"],
    ["Simon Funeral Colonial Chapel","Woodburn, Oregon"],
    ["Stehn Family Chapels",""],
    ["Musgrove Family Mortuary",""],
    ["Tami's Pine Valley Funeral Home",""],
    ["Taylor's Family Mortuary",""],
    ["Terry Family Funeral Home","Portland, Oregon"],
    ["Threadgill's Memorial Services",""],
    ["Tualatin Valley Funeral Alternatives","Tualatin, Oregon"],
    ["Tulip Cremation",""],
    ["Twin Oaks Funeral Home & Cremation",""],
    ["Unger Funeral Chapel- Mt Angel","Mt. Angel, Oregon"],
    ["Wherry Family Funerals & Cremation",""],
    ["Whispering Pines Funeral Home",""],
    ["Wilhelm Funeral Home","Portland, Oregon"],
    ["Wilson’s Chapel of the Roses",""],
    ["Wilsonville Funeral Home & Cremation Services","Wilsonville, Oregon"],
    ["Woodland Funeral Home","Woodland, Washington"],
    ["Young’s Funeral Home & Crematory",""],
    ["Zeller Chapel of the Roses","Portland, Oregon"]
  ];

  function normalizeName(value){
    return String(value||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
  }
  function makeFuneral(row,index){
    return {id:"rfh"+index,name:row[0]||"",location:row[1]||"",ctms:row[2]||"",phone:row[3]||"",email:row[4]||"",afterHours:row[5]||"",holding:row[6]||"",notes:row[7]||"",difficulty:"",director:"",ofda:"unknown",distanceMiles:""};
  }
  const funerals=funeralNames.map(makeFuneral);

  function mergeByName(target,source){
    if(!Array.isArray(target))target=[];
    const seen=new Set(target.map(x=>normalizeName(x&&x.name)).filter(Boolean));
    for(const item of source){
      const key=normalizeName(item&&item.name);
      if(!key||seen.has(key))continue;
      target.push(JSON.parse(JSON.stringify(item)));
      seen.add(key);
    }
    return target;
  }

  function install(){
    try{
      if(typeof funeralSeed!=="undefined")mergeByName(funeralSeed,funerals);
      if(typeof hospitalSeed!=="undefined")mergeByName(hospitalSeed,hospitals);
      if(typeof dirs!=="undefined"){
        dirs.funerals=mergeByName(Array.isArray(dirs.funerals)?dirs.funerals:[],funerals);
        dirs.hospitals=mergeByName(Array.isArray(dirs.hospitals)?dirs.hospitals:[],hospitals);
        try{localStorage.setItem(typeof DIRKEY!=="undefined"?DIRKEY:"solvita_v952_dirs",JSON.stringify(dirs));}catch(_e){}
        try{if(typeof renderHospitals==="function")renderHospitals();}catch(_e){}
        try{if(typeof renderFunerals==="function")renderFunerals();}catch(_e){}
      }
      const ver=document.querySelector(".ver");
      if(ver)ver.textContent="Version 9.10.10 — Complete Directories + Optional Sections";
    }catch(err){console.warn("Directory recovery",err);}
  }

  install();
  setTimeout(install,1500);
  setTimeout(install,5000);
})();
