(function(){
  "use strict";
  const KEY="solvita_v9108_transport_companies";
  function clean(s){return String(s||"").replace(/\s+/g," ").trim()}
  function normalizeBase(base,name){
    let s=clean(base);
    const low=s.toLowerCase();
    // Clark County Crematory / CCC: verified public address. Suite is unnecessary for routing.
    if((/\bccc\b/i.test(name||"")||/clark county crem/i.test(name||""))&&/1413\s+lincoln\s+ave/i.test(s)){
      return "1413 Lincoln Ave, Vancouver, WA 98660";
    }
    // Normalize Vancouver, Washington addresses so the geocoder does not fall back to Oregon.
    if(/vancouver/i.test(s)&&/(washington|\bwa\b)/i.test(s)){
      s=s.replace(/\b(?:ste|suite|unit|#)\s*[a-z0-9-]+\b/ig,"");
      s=s.replace(/\bwashington\b/ig,"WA");
      s=s.replace(/\s*,\s*/g,", ").replace(/\s{2,}/g," ").trim();
      if(!/,\s*vancouver/i.test(s))s=s.replace(/\s+vancouver\b/i,", Vancouver");
      if(!/,\s*WA\b/i.test(s))s=s.replace(/\s+WA\b/i,", WA");
      return s;
    }
    return s;
  }
  try{
    const list=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(list))return;
    let changed=false;
    list.forEach(c=>{const n=normalizeBase(c.base,c.name);if(n&&n!==c.base){c.base=n;changed=true}});
    if(changed)localStorage.setItem(KEY,JSON.stringify(list));
  }catch{}
})();
