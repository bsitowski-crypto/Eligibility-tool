const CACHE="solvita-planner-v9-10-1-cache-v2";
const APP_SHELL=[
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./app/chunk-01.b64","./app/chunk-02.b64","./app/chunk-03.b64","./app/chunk-04.b64","./app/chunk-05.b64","./app/chunk-06.b64","./app/chunk-07.b64","./app/chunk-08.b64","./app/chunk-09.b64","./app/chunk-10.b64","./app/chunk-11.b64","./app/chunk-12.b64","./app/chunk-13.b64"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
      return response;
    }).catch(()=>caches.match("./index.html")));
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request)));
  }
});