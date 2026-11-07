/* Complete, cached loader for the full poetry archive. */
(function(){
"use strict";
const base="./data/poetry-archive/";
const workerURL=new URL("./archive-worker.js",document.currentScript.src);
const ARCHIVE_CACHE="yes-poetry-archive-v1";
let manifestPromise=null;
const loaded=new Map(),pending=new Map(),categoryRecords=new Map();
let seenIds=null,seenBodies=null,seenContentIds=null,bulkLoading=false;
const norm=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").trim();
async function archiveFetch(path){
 const url=new URL(base+path,location.href).href;
 const request=new Request(url,{credentials:"same-origin"});
 let cache=null,cached=null;
 try{if("caches"in window){cache=await caches.open(ARCHIVE_CACHE);cached=await cache.match(request);if(cached)return cached;}}catch(e){}
 let lastError=null;
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(new Error("مهلت دریافت فایل گنجینه به پایان رسید")),90000);
  try{
   const response=await fetch(request,{signal:controller.signal});
   if(!response.ok)throw Error("دریافت فایل گنجینه ناموفق بود ("+response.status+"): "+path);
   if(cache)try{await cache.put(request,response.clone());}catch(e){}
   return response;
  }catch(error){
   lastError=error;
   if(attempt===0){
    status("ارتباط با گنجینه ناپایدار است؛ دریافت «"+path+"» دوباره تلاش می‌شود…");
    await new Promise(resolve=>setTimeout(resolve,900));
   }
  }finally{clearTimeout(timeout);}
 }
 if(cached)return cached;
 throw lastError||Error("دریافت فایل گنجینه ناموفق بود: "+path);
}
async function manifest(){
 if(!manifestPromise)manifestPromise=archiveFetch("manifest.json").then(r=>r.json()).catch(error=>{manifestPromise=null;throw error;});
 return manifestPromise;
}
function status(message){const node=document.getElementById("archiveStatus");if(node)node.textContent=message;}
function bodyKey(s){return String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\s\p{P}\p{S}\u200c\u200e\u200fـ]/gu,"").toLowerCase();}
function initDedup(target){
 if(!seenIds)seenIds=new Set(target.map(x=>x.id).filter(Boolean));
 if(!seenBodies)seenBodies=new Set(target.map(x=>bodyKey(x.body)).filter(Boolean));
 if(window.YESContent&&!seenContentIds)seenContentIds=new Set(window.YESContent.all.map(x=>x.id));
}
async function parseArchive(bytes){
 if(typeof Worker!=="undefined"){
  try{
   return await new Promise((resolve,reject)=>{
    const worker=new Worker(workerURL);
    const done=fn=>value=>{worker.terminate();fn(value);};
    worker.onmessage=event=>event.data&&event.data.error?done(reject)(new Error(event.data.error)):done(resolve)(event.data.records);
    worker.onerror=done(reject);
    const copy=bytes.slice(0);
    worker.postMessage(copy,[copy]);
   });
  }catch(error){console.warn("Archive worker fallback:",error);}
 }
 if(typeof DecompressionStream==="undefined")throw Error("مرورگر از بازکردن آرشیو فشرده پشتیبانی نمی‌کند");
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
 return new Response(stream).json();
}
async function loadCategory(name){
 const m=await manifest();const meta=m.categories.find(x=>norm(x.name)===norm(name));
 if(!meta)throw Error("موضوع در گنجینه پیدا نشد");
 if(loaded.has(meta.name))return 0;if(pending.has(meta.name))return pending.get(meta.name);
 const job=(async()=>{
  const categoryIndex=m.categories.findIndex(x=>x.name===meta.name)+1;
  status("در حال دریافت «"+meta.name+"»؛ "+meta.count.toLocaleString("fa-IR")+" اثر…");
  window.dispatchEvent(new CustomEvent("yes:archive-loading",{detail:{category:meta.name,categoryIndex,categoryTotal:m.categories.length}}));
  const response=await archiveFetch(meta.file);
  const bytes=await response.arrayBuffer();
  const records=await parseArchive(bytes);
  if(!Array.isArray(records)||records.length!==meta.count)throw Error("تعداد آثار دستهٔ «"+meta.name+"» با فهرست گنجینه مطابقت ندارد");
  categoryRecords.set(meta.name,records);
  const target=window.poemEntries||(window.poemEntries=[]);
  initDedup(target);
  for(const item of records){
   const key=bodyKey(item.body);
   if(!item.id||seenIds.has(item.id)||!key||seenBodies.has(key))continue;
   seenIds.add(item.id);seenBodies.add(key);target.push(item);
  }
  if(window.YESContent){
   for(const item of records){
    if(seenContentIds.has(item.id))continue;
    window.YESContent.all.push(item);seenContentIds.add(item.id);
    if(item.type!=="text")window.YESContent.poems.push(item);
   }
  }
  loaded.set(meta.name,records.length);
  const loadedRecords=window.YESArchive.loadedCount();
  status(loadedRecords.toLocaleString("fa-IR")+" از "+m.total.toLocaleString("fa-IR")+" اثر گنجینه بارگذاری شد.");
  window.dispatchEvent(new CustomEvent("yes:archive-loaded",{detail:{category:meta.name,added:records.length,total:target.length,loadedRecords,loadedCategories:loaded.size,categoryIndex:m.categories.findIndex(x=>x.name===meta.name)+1,categoryTotal:m.categories.length,archiveTotal:m.total,batch:bulkLoading}}));
  return records.length;
 })().catch(error=>{status("بارگذاری این دسته کامل نشد؛ اتصال را بررسی و دوباره تلاش کنید.");throw error;}).finally(()=>pending.delete(meta.name));
 pending.set(meta.name,job);return job;
}
async function loadAll(){
 const m=await manifest();
 bulkLoading=true;
 try{
  let cursor=0;
  async function worker(){
   while(cursor<m.categories.length){
    const item=m.categories[cursor++];
    await loadCategory(item.name);
   }
  }
  // Four concurrent shard downloads improve first-load throughput without
  // creating an excessive number of simultaneous decompression workers on mobile.
  const results=await Promise.allSettled(Array.from({length:Math.min(4,m.categories.length)},worker));
  const failed=results.find(result=>result.status==="rejected");
  if(failed)throw failed.reason;
  if(loadedCount()!==m.total)throw Error("همهٔ آثار گنجینه بارگذاری نشدند.");
  return loadedCount();
 }finally{bulkLoading=false;}
}
function loadedCount(){return [...loaded.values()].reduce((n,x)=>n+x,0);}
window.YESArchive={
 manifest,loadCategory,loadAll,
 items(name){const key=[...categoryRecords.keys()].find(x=>norm(x)===norm(name));return key?categoryRecords.get(key):[];},
 async randomItems(count=10,categoryName=null){
  const m=await manifest();
  const take=(list,n)=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,Math.min(n,a.length));};
  if(categoryName){await loadCategory(categoryName);const meta=m.categories.find(x=>norm(x.name)===norm(categoryName));return meta?take(categoryRecords.get(meta.name)||[],count):[];}
  const pool=()=>[...categoryRecords.values()].flat();
  if(pool().length<count){
   const remaining=m.categories.filter(item=>!loaded.has(item.name));
   const weighted=[];
   while(remaining.length){
    const weight=remaining.reduce((sum,x)=>sum+x.count,0);
    let r=Math.random()*weight,at=remaining.length-1;
    for(let j=0;j<remaining.length;j++){r-=remaining[j].count;if(r<0){at=j;break;}}
    weighted.push(remaining.splice(at,1)[0]);
   }
   await Promise.all(weighted.slice(0,Math.min(3,weighted.length)).map(item=>loadCategory(item.name)));
  }
  let records=pool();
  if(records.length<count){const next=m.categories.find(item=>!loaded.has(item.name));if(next){await loadCategory(next.name);records=pool();}}
  return take(records,count);
 },
 isArchiveCategory(name){return !!(window.YESArchive.manifestData&&window.YESArchive.manifestData.categories.some(x=>norm(x.name)===norm(name)));},
 categories(){return window.YESArchive.manifestData?.categories||[];},
 loadedCount,
 loadedCategories(){return loaded.size;},
 loaded(name){return loaded.has(name);}
};
manifest().then(m=>{window.YESArchive.manifestData=m;status("گنجینه آمادهٔ بارگذاری است: "+m.total.toLocaleString("fa-IR")+" اثر در "+m.categories.length.toLocaleString("fa-IR")+" دسته.");window.dispatchEvent(new Event("yes:archive-manifest-loaded"));}).catch(()=>status("فهرست گنجینه در حال حاضر در دسترس نیست."));
})();