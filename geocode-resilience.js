(function(){
"use strict";
const CACHE_KEY="solvita_v9122_geocode_cache";
const original=typeof window.geocodePlace==="function"?window.geocodePlace.bind(window):null;
function clean(v){return String(v||"").replace(/\s+/g," ").trim()}
function valid(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))}
function load(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");return x&&typeof x==="object"?x:{}}catch{return{}}}
function save(c){try{const entries=Object.entries(c);if(entries.length>500){entries.sort((a,b)=>(b[1].t||0)-(a[1].t||0));c=Object.fromEntries(entries.slice(0,400))}localStorage.setItem(CACHE_KEY,JSON.stringify(c))}catch{}}
async function nominatim(q){const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=us&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Nominatim "+r.status);const a=await r.json();if(!Array.isArray(a)||!a.length)throw new Error("Nominatim no match");return{lat:Number(a[0].lat),lon:Number(a[0].lon),label:a[0].display_name||q}}
async function photon(q){const r=await fetch("https://photon.komoot.io/api/?limit=3&lang=en&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Photon "+r.status);const d=await r.json(),f=d&&Array.isArray(d.features)?d.features[0]:null,xy=f&&f.geometry&&f.geometry.coordinates;if(!xy||xy.length<2)throw new Error("Photon no match");const p=f.properties||{};return{lat:Number(xy[1]),lon:Number(xy[0]),label:[p.name,p.street,p.city,p.state,p.postcode].filter(Boolean).join(", ")||q}}
async function arcgis(q){const u="https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&countryCode=USA&maxLocations=3&SingleLine="+encodeURIComponent(q);const r=await fetch(u,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("ArcGIS "+r.status);const d=await r.json(),c=d&&Array.isArray(d.candidates)?d.candidates[0]:null;if(!c||!c.location)throw new Error("ArcGIS no match");return{lat:Number(c.location.y),lon:Number(c.location.x),label:c.address||q}}
window.geocodePlace=async function(query){const q=clean(query);if(!q)throw new Error("Empty map query");const cache=load(),k=q.toLowerCase(),hit=cache[k];if(hit&&valid(hit))return{lat:Number(hit.lat),lon:Number(hit.lon),label:hit.label||q};const attempts=[];
if(original){try{const p=await original(q);if(valid(p)){cache[k]={lat:Number(p.lat),lon:Number(p.lon),label:p.label||q,t:Date.now()};save(cache);return cache[k]}}catch(e){attempts.push("original")}}
for(const [name,fn] of [["OpenStreetMap",nominatim],["Photon",photon],["ArcGIS",arcgis]]){try{const p=await fn(q);if(valid(p)){cache[k]={lat:Number(p.lat),lon:Number(p.lon),label:p.label||q,t:Date.now()};save(cache);return cache[k]}}catch(e){attempts.push(name)}}
throw new Error("No map match for "+q+" (tried "+attempts.join(", ")+")")};
})();