/* PWA service worker for GitHub Pages subpath deployment. */
const CACHE_PREFIX="yes-v13-";
const CACHE_NAME=CACHE_PREFIX+"shell-23";
const CORE=[
 "./","./index.html","./manifest.webmanifest","./icons/icon.svg","./css/v15-visual.css","./css/v15-library.css","./css/v16-editorial.css","./js/v16-pages.js",
 "./poems.js","./poems-extra.js","./poems-user-collection.js","./poems-hasan-collection.js","./telegram-poems.js","./internet-poems.js","./poems-web-loader.js","./pinned.js",
 "./js/taxonomy.js","./js/content.js","./js/router.js","./js/storage.js","./js/reader.js",
 "./js/notebook.js","./js/search.js","./js/image-studio.js","./js/pwa.js","./js/archive.js","./js/discovery.js","./js/v14-home.js","./js/v15-experience.js"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener("message",event=>{
 if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin){
  if(url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){
   event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached)return cached;
    try{
     const response=await fetch(request);
     if(response.ok||response.type==="opaque")await cache.put(request,response.clone());
     return response;
    }catch(error){return cached||Response.error();}
   })());
  }
  return;
 }
 if(request.mode==="navigate"){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request);
    const cache=await caches.open(CACHE_NAME);
    cache.put("./index.html",response.clone());
    return response;
   }catch(error){
    return (await caches.match(request))||(await caches.match("./index.html"))||Response.error();
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(request);
  if(cached)return cached;
  try{
   const response=await fetch(request);
   if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
   return response;
  }catch(error){return Response.error();}
 })());
});
