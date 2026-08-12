(function(){
"use strict";
window.SOLVITA_DIRECTORY_SUPPLEMENT2_VERSION="1";
const records=[
{name:"American Burial & Cremation of Oregon",location:"Portland, Oregon",ctms:"4234",phone:"503-232-1961"},
{name:"Amling-Schroeder Funeral Services",location:"Bandon, Oregon",ctms:"4019",phone:"541-347-2907"},
{name:"Amling-Schroeder Funeral Services",location:"Coquille, Oregon",ctms:"4020",phone:"541-396-3846"},
{name:"Amling-Schroeder Funeral Services",location:"Myrtle Point, Oregon",ctms:"4021",phone:"541-572-2524"},
{name:"Anderson's Tribute Center",location:"Hood River, Oregon",ctms:"4145",phone:"541-386-1000",email:"atc@andersonstributecenter.com"},
{name:"Anderson's Tribute Center",location:"The Dalles, Oregon",phone:"541-296-2600"},
{name:"Aspen Burial & Cremation",location:"Baker City, Oregon",ctms:"4172",phone:"541-523-3131"},
{name:"Attrell's Newberg Funeral Chapel",location:"Newberg, Oregon",ctms:"4105",phone:"503-538-2191",email:"susan@attrells.com",afterHours:"No"},
{name:"Burns Mortuary of Pendleton",location:"Pendleton, Oregon",ctms:"4035",phone:"541-276-2331",afterHours:"No"},
{name:"Burns Riverside Chapel - Florence Funeral Home",location:"Florence, Oregon",ctms:"4036",phone:"541-997-3416"},
{name:"Caldwell's Funeral & Cremation Arrangement Center",location:"Seaside, Oregon",ctms:"4119",phone:"503-738-9936"},
{name:"Caldwell-Murphy (Formerly Caldwell's Luce - Layton Mortuary)",location:"Astoria, Oregon",ctms:"4004",phone:"503-325-1811"},
{name:"Caldwells Colonial Mortuary",location:"Portland, Oregon",ctms:"4106",phone:"503-232-4111"},
{name:"Caldwell's Hennessy, Goetsch & McGee",location:"Portland, Oregon",phone:"503-232-4111"},
{name:"Camas Cremation & Burial",location:"Camas, Washington",phone:"360-858-8919"},
{name:"Canby Funeral Chapel",location:"Canby, Oregon",ctms:"4005",phone:"503-266-1144"},
{name:"Care Cremation",location:"Gresham, Oregon",ctms:"4329",phone:"503-656-9177",holding:"Fir Lawn/Forest Lawn"},
{name:"Cascade Cremation & Burial",location:"Klamath Falls, Oregon",phone:"541-887-2919"},
{name:"Cascade Cremation (Cascade Mortuary Services)",location:"Tualatin, Oregon",ctms:"4347",phone:"503-885-1790"},
{name:"Chapel of the Valley - Crematory/LB Hall Funeral Home",location:"Grants Pass, Oregon",ctms:"4008",phone:"541-479-7581",afterHours:"Yes"},
{name:"City View Funeral Home",location:"Salem, Oregon",ctms:"4041",phone:"503-363-8652",afterHours:"No",difficulty:"5"},
{name:"Coles Tribute Center",location:"Baker City, Oregon",ctms:"4311",phone:"888-523-4300"},
{name:"Colonial - DeWitt Funeral",location:"Walla Walla, Washington",ctms:"4044",phone:"509-529-4447"},
{name:"Columbia Funeral Home & Cremation Center",location:"St. Helens, Oregon",ctms:"4243",phone:"503-397-1154",email:"info@columbiafh.com",afterHours:"Yes",difficulty:"3"},
{name:"Columbia Funeral Service",location:"Longview, Washington",ctms:"4045",phone:"360-636-4211",difficulty:"4"},
{name:"Columbia River Cremation",location:"Camas, Washington",phone:"360-834-4563"},
{name:"Conger-Morris Central Point Chapel",location:"Central Point, Oregon",phone:"541-664-3361"},
{name:"Conger-Morris Funeral Directors",location:"Medford, Oregon",ctms:"4046",phone:"541-772-7111"},
{name:"Cornerstone Funeral Services & Cremation",location:"Boring, Oregon",ctms:"4173",phone:"503-637-5020",email:"elizabeth@cornerstonefuneral.com",afterHours:"No",holding:"Sometimes to PCC"},
{name:"Creekside Cremation & Memorial",location:"Canby, Oregon",phone:"971-256-1344",email:"julia@creeksidecremation.com",holding:"PCC",difficulty:"2"},
{name:"Crown - Milwaukie",location:"Milwaukie, Oregon",ctms:"4151",phone:"503-653-7076",afterHours:"No",notes:"All decedents go to Tualatin location"},
{name:"Earth Funeral",location:"Auburn, Washington",phone:"877-327-4109",email:"care@earthfuneral.com",holding:"PCC"},
{name:"England's Eugene Memorial Chapel",location:"Eugene, Oregon",ctms:"4062",phone:"541-686-2818"},
{name:"Estacada Funeral Chapel",location:"Estacada, Oregon",ctms:"4063",phone:"503-630-3829",email:"robgefc@gmail.com",afterHours:"Yes",holding:"Sometimes uses PCC",difficulty:"1"},
{name:"Eternal Hills",location:"Klamath Falls, Oregon",ctms:"4064",phone:"541-884-3668"},
{name:"Evergreen Memorial Gardens",location:"Vancouver, Washington",ctms:"4127",phone:"360-892-6060",afterHours:"Yes"},
{name:"Evergreen Staples",location:"Vancouver, Washington",ctms:"4065",phone:"360-693-3649",email:"info@evergreenstaples.com",afterHours:"No"},
{name:"Family Memorial Mortuary",location:"Portland, Oregon",ctms:"4067",phone:"503-736-0102",afterHours:"Yes",holding:"PCC"},
{name:"Farnstrom Mortuary",location:"Independence, Oregon",ctms:"4068",phone:"503-838-1414"},
{name:"Farnstrom-Gable Funeral Chapel",location:"Portland, Oregon",ctms:"4214",phone:"503-253-7569"},
{name:"Finley-Sunset Hills Mortuary",location:"Portland, Oregon",ctms:"4069",phone:"503-292-6654",afterHours:"Yes",holding:"PFS"},
{name:"Fir Lawn Memorial Park & Funeral Home",location:"Hillsboro, Oregon",ctms:"4144",phone:"503-640-2277",afterHours:"Yes"},
{name:"Fisher Funeral Home",location:"Albany, Oregon",ctms:"4070",phone:"541-928-3349"},
{name:"Forest Lawn",location:"Gresham, Oregon",phone:"503-665-1197",email:"info@cremationbycare.com",afterHours:"Yes"},
{name:"Fuiten, Rose & Hoyt Funeral Home",location:"Forest Grove, Oregon",ctms:"4073",phone:"503-357-2161",email:"office@fuitenrosehoyt.com",afterHours:"No"},
{name:"Fuiten, Rose & Hoyt Funeral Home",location:"Vernonia, Oregon",phone:"503-429-6611",email:"office@fuitenrosehoyt.com",afterHours:"No"},
{name:"Funeral Alternatives of Roseburg",location:"Myrtle Creek, Oregon",ctms:"4205",phone:"541-863-3148"},
{name:"Gardner Funeral Home",location:"White Salmon, Washington",ctms:"4307",phone:"509-493-1323"},
{name:"Gateway Little Chapel of the Chimes (Advantage)",location:"Portland, Oregon",ctms:"4074",phone:"503-256-0606",holding:"PFS"}
];
function key(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim()}
function blank(v){return v==null||String(v).trim()===""}
function apply(){try{if(typeof dirs==="undefined"||!dirs||!Array.isArray(dirs.funerals))return false;for(const src of records){const nk=key(src.name),lk=key(src.location);let dst=dirs.funerals.find(x=>key(x?.name)===nk&&key(x?.location)===lk);if(!dst){const same=dirs.funerals.filter(x=>key(x?.name)===nk);dst=same.find(x=>blank(x.location));}
if(!dst){dst={id:"supp2-"+nk.replace(/ /g,"-").slice(0,44)+"-"+lk.replace(/ /g,"-").slice(0,20),name:src.name,location:"",ctms:"",phone:"",email:"",afterHours:"",holding:"",notes:"",difficulty:"",director:"",ofda:"unknown",distanceMiles:""};dirs.funerals.push(dst)}
for(const [f,v] of Object.entries(src)){if(f==="name"||blank(v))continue;if(blank(dst[f])||f==="location")dst[f]=v}}
try{localStorage.setItem(typeof DIRKEY!=="undefined"?DIRKEY:"solvita_v952_dirs",JSON.stringify(dirs))}catch{}try{if(typeof renderFunerals==="function")renderFunerals()}catch{}return true}catch{return false}}
let tries=0;const t=setInterval(()=>{tries++;if(apply()||tries>=40)clearInterval(t)},250);setTimeout(apply,2500);setTimeout(apply,7000);
})();