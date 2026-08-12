(function(){
"use strict";
const SPECIAL={
"legacy emanuel medical center":"Legacy Emanuel Medical Center, 2801 N Gantenbein Ave, Portland, OR 97227",
"crown portland ne broadway street":"Crown Cremation Services, 8970 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"crown portland se 122nd avenue":"Crown Cremation Services, 8970 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"crown salem":"Crown Cremation Services, 8970 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"crown tigard":"Crown Cremation Services, 8970 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"crown tualatin":"Crown Cremation Services, 8970 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"tulip cremation":"Tulip Cremation, 8972 SW Tualatin-Sherwood Rd, Tualatin, OR 97062",
"wherity family funerals cremations":"Wherity Family Funerals & Cremations, 8265 SW Seneca St, Tualatin, OR 97062",
"wherry family funerals cremation":"Wherity Family Funerals & Cremations, 8265 SW Seneca St, Tualatin, OR 97062",
"peake funeral chapel":"Peake Funeral Chapel, 2906 SE Harrison St, Milwaukie, OR 97222",
"portland funeral service":"Portland Funeral Services, 4733 NE Thompson St, Portland, OR 97213",
"ross hollywood chapel":"Ross Hollywood Chapel, 4733 NE Thompson St, Portland, OR 97213",
"riverview cemetery funeral home":"River View Cemetery Funeral Home, 8421 S Macadam Ave, Portland, OR 97219"
};
function key(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim()}
function locationText(type,r){return String(type==="h"?(r.cityCounty||r.city||r.location||""):(r.location||r.city||r.cityCounty||""))}
function city(v){let s=String(v||"").trim();if(!s)return"";if(s.includes(" - "))s=s.split(" - ")[0];if(s.includes(","))s=s.split(",")[0];return s.trim()}
function state(v){const s=String(v||"").toLowerCase();if(/washington|\bwa\b/.test(s))return"WA";if(/oregon|\bor\b/.test(s))return"OR";const c=city(v).toLowerCase();const wa=["vancouver","longview","kelso","woodland","centralia","ridgefield","camas","white salmon","long beach","walla walla","auburn","seattle"];return wa.includes(c)?"WA":"OR"}
window.facilityQuery=function(type,r){const n=key(r&&r.name);if(SPECIAL[n])return SPECIAL[n];const loc=locationText(type,r);const c=city(loc),st=state(loc);if(r&&r.address)return r.address;if(r&&r.name&&c)return `${r.name}, ${c}, ${st}`;if(r&&r.name)return `${r.name}, ${st==="WA"?"Washington":"Oregon"}`;return c?`${c}, ${st}`:""};
window.SOLVITA_FACILITY_QUERY_CANDIDATES=function(type,r){const out=[],n=key(r&&r.name);if(SPECIAL[n])out.push(SPECIAL[n]);const loc=locationText(type,r),c=city(loc),st=state(loc);if(r&&r.address)out.push(r.address);if(r&&r.name&&c)out.push(`${r.name}, ${c}, ${st}`);if(r&&r.name)out.push(`${r.name}, ${st==="WA"?"Washington":"Oregon"}`);if(c)out.push(`${c}, ${st}`);return [...new Set(out.filter(Boolean))]};
})();