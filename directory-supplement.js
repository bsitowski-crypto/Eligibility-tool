(function(){
"use strict";
window.SOLVITA_DIRECTORY_SUPPLEMENT_VERSION="1";
const funeral=[
{name:"Autumn Funerals - Bend",location:"La Pine, Oregon",ctms:"4134",phone:"541-318-0842"},
{name:"Autumn Funerals - Redmond",location:"Redmond, Oregon",ctms:"4113",phone:"541-504-9485"},
{name:"Autumn Funerals & Cremations",location:"Tigard, Oregon",ctms:"4003",phone:"503-443-4900"},
{name:"Autumn Funerals & Crematory",location:"Bend, Oregon",ctms:"4022",phone:"541-318-0842"},
{name:"Baird Funeral Home & Crematory",location:"Bend, Oregon",ctms:"4195",phone:"541-382-0903"},
{name:"Baird La Pine",location:"La Pine, Oregon",ctms:"4195",phone:"541-382-0903"},
{name:"Davies Cremation & Burial",location:"Ridgefield, Washington",ctms:"4126",phone:"360-693-1036"},
{name:"DeMoss-Durdan Funeral Home & Cremation",location:"Corvallis, Oregon",ctms:"4054",phone:"541-754-6255"},
{name:"Deschutes Memorial Gardens",location:"Bend, Oregon",ctms:"4056",phone:"541-382-5592"},
{name:"Desert Rose Funeral Chapel",location:"Lakeview, Oregon",ctms:"4196",phone:"541-947-5995"},
{name:"Discount Cremation",location:"Portland, Oregon",phone:"503-928-8592"},
{name:"Driskill Memorial Chapel",location:"John Day, Oregon",ctms:"4058",phone:"541-575-0529"},
{name:"Dunes Memorial Chapel",location:"Reedsport, Oregon",ctms:"4059",phone:"541-271-2822"},
{name:"Duyck & Vandehey Funeral Home",location:"Hillsboro, Oregon",phone:"503-645-2040"},
{name:"Duyck & VanDeHey Funeral Home",location:"Forest Grove, Oregon",ctms:"4183",phone:"503-357-8749"},
{name:"Holman-Hankins, Bowker & Waud",location:"Oregon City, Oregon",ctms:"4089",phone:"503-656-2661"},
{name:"Hughes-Ransom Cremation & Mortuary - Astoria",location:"Astoria, Oregon",ctms:"4092",phone:"503-325-2535"},
{name:"Hughes-Ransom Cremation & Mortuary - Seaside",location:"Seaside, Oregon",ctms:"4093",phone:"503-738-6622"},
{name:"Hull & Hull Funeral Home",location:"Grants Pass, Oregon",ctms:"4094",phone:"800-533-4453"},
{name:"Huston-Jost Funeral Home",location:"Lebanon, Oregon",ctms:"4096",phone:"541-258-2123"},
{name:"Newell-Hoerling's Mortuary",location:"Centralia, Washington"},
{name:"Niswonger-Reynolds Funeral Home",location:"Bend, Oregon",ctms:"4135",phone:"541-382-2471"},
{name:"North Bend Chapel",location:"North Bend, Oregon",ctms:"4207",phone:"541-756-0440"},
{name:"North Santiam Funeral Service",location:"Stayton, Oregon",ctms:"4240",phone:"503-769-9010"},
{name:"Northwood Park Funeral Home",location:"Ridgefield, Washington",ctms:"4321",phone:"360-574-4252"},
{name:"O'Hair-Wards Funeral Chapel",location:"Klamath Falls, Oregon",ctms:"4193",phone:"541-884-3456"},
{name:"Oakridge Chapel of the Woods",location:"Oakridge, Oregon",ctms:"4208",phone:"541-782-4328"},
{name:"Ocean View Cremation and Burial",location:"Astoria, Oregon",phone:"503-338-7200"},
{name:"Pegg, Paxson & Springer Funeral Chapel",location:"Beaverton, Oregon",ctms:"4133",phone:"503-644-1176"},
{name:"Penttila's Chapel by the Sea",location:"Long Beach, Washington",ctms:"4316",phone:"360-642-8885"},
{name:"Perl Funeral Home",location:"Medford, Oregon",ctms:"4198",phone:"541-772-5488"},
{name:"Poole-Larsen Funeral Home",location:"Eugene, Oregon",ctms:"4142",phone:"541-484-1435"},
{name:"Portland Cremation Center",location:"Portland, Oregon",ctms:"4319",phone:"503-665-4200"},
{name:"Skyline Memorial Gardens Funeral Home",location:"Portland, Oregon",ctms:"4223",phone:"503-292-6611"},
{name:"Smith Callaway Chapel",location:"The Dalles, Oregon",ctms:"4121",phone:"541-296-3135"},
{name:"Smith-Lund-Mills Funeral Chapel",location:"Cottage Grove, Oregon",ctms:"4138",phone:"541-942-0185"},
{name:"Solace Cremation",location:"Portland, Oregon",ctms:"4368",phone:"503-549-4900"},
{name:"Southern Oregon Cremation Services",location:"Grants Pass, Oregon",ctms:"4187",phone:"800-533-4453"},
{name:"Spencer, Libby & Powell Funeral Home",location:"The Dalles, Oregon",ctms:"4122",phone:"541-296-3234"},
{name:"Springer & Sons Funeral Home",location:"Aloha, Oregon",ctms:"4171",phone:"503-356-1000"},
{name:"Springfield Memorial Funeral Home",location:"Springfield, Oregon",ctms:"4120",phone:"541-746-5311"},
{name:"Steele Chapel",location:"Longview, Washington",ctms:"4251",phone:"360-703-7091"},
{name:"Wherity Family Funerals & Cremations",location:"Tualatin, Oregon",ctms:"4245",phone:"503-885-8242"},
{name:"Whispering Pines Funeral Home",location:"Prineville, Oregon",ctms:"4230",phone:"541-416-9733"},
{name:"Wilson's Chapel of the Roses",location:"Roseburg, Oregon",ctms:"4231",phone:"541-673-4455"},
{name:"Youngs Funeral Home & Crematory",location:"Tigard, Oregon",ctms:"4123",phone:"503-639-1206"}
];
const corrections=[
{name:"Oregon Cremation & Burial Company",location:"Portland, Oregon"},
{name:"Tami's Pine Valley Funeral Home",location:"Halfway, Oregon"},
{name:"Taylor's Family Mortuary",location:"Winston, Oregon"},
{name:"Threadgill's Memorial Services",location:"Beaverton, Oregon"},
{name:"Tualatin Valley Funeral Alternatives",location:"Hillsboro, Oregon"},
{name:"Tulip Cremation",location:"Tualatin, Oregon"},
{name:"Twin Oaks Funeral Home & Cremation",location:"Corvallis, Oregon"},
{name:"Umpqua Valley Funeral Directors",location:"Roseburg, Oregon"},
{name:"Wherry Family Funerals & Cremation",location:"Tualatin, Oregon"},
{name:"Whispering Pines Funeral Home",location:"Prineville, Oregon"},
{name:"Wilhelm Funeral Home",location:"Portland, Oregon"},
{name:"Wilson’s Chapel of the Roses",location:"Roseburg, Oregon"},
{name:"Wilsonville Funeral Home & Cremation Services",location:"Wilsonville, Oregon"},
{name:"Woodland Funeral Home",location:"Woodland, Washington"},
{name:"Young’s Funeral Home & Crematory",location:"Tigard, Oregon"},
{name:"Recompose",location:"Seattle, Washington"}
];
function key(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim()}
function blank(v){return v==null||String(v).trim()===""}
function merge(list,items,forceLocation){if(!Array.isArray(list))return list;for(const src of items){const k=key(src.name);let dst=list.find(x=>key(x&&x.name)===k);if(!dst){dst={id:"supp-"+k.replace(/ /g,"-").slice(0,50),name:src.name,location:"",ctms:"",phone:"",email:"",afterHours:"",holding:"",notes:"",difficulty:"",director:"",ofda:"unknown",distanceMiles:""};list.push(dst)}for(const [field,val] of Object.entries(src)){if(field==="name"||blank(val))continue;if((field==="location"&&forceLocation)||blank(dst[field]))dst[field]=val}}return list}
function apply(){try{if(typeof dirs==="undefined"||!dirs)return false;dirs.funerals=merge(Array.isArray(dirs.funerals)?dirs.funerals:[],funeral,false);dirs.funerals=merge(dirs.funerals,corrections,true);if(typeof funeralSeed!=="undefined"){merge(funeralSeed,funeral,false);merge(funeralSeed,corrections,true)}try{localStorage.setItem(typeof DIRKEY!=="undefined"?DIRKEY:"solvita_v952_dirs",JSON.stringify(dirs))}catch{}try{if(typeof renderFunerals==="function")renderFunerals()}catch{}return true}catch{return false}}
let tries=0;const t=setInterval(()=>{tries++;if(apply()||tries>=40)clearInterval(t)},250);setTimeout(apply,2500);setTimeout(apply,7000);
})();