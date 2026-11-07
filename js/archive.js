/* Complete, cached loader for the full poetry archive. */
(function(){
"use strict";
const base="./data/poetry-archive/";
const ARCHIVE_CACHE="yes-poetry-archive-v1";
let manifestPromise=null;
const loaded=new Map(),pending=new Map(),categoryRecords=new Map();
const norm=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").trim();
async function archiveFetch(path){
 const url=new URL(base+path,location.href).href;
 const request=new Request(url,{credentials:"same-origin"});
 let cache=null,cached=null;
 try{if("caches"in window){cache=await caches.open(ARCHIVE_CACHE);cached=await cache.match(request);if(cached)return cached;}}catch(e){}
 try{
  const response=await fetch(request);
  if(!response.ok)throw Error("دریافت فایل گنجینه ناموفق بود: "+path);
  if(cache)try{await cache.put(request,response.clone());}catch(e){}
  return response;
 }catch(error){if(cached)return cached;throw error;}
}
async function manifest(){
 if(!manifestPromise)manifestPromise=archiveFetch("manifest.json").then(r=>r.json()).catch(error=>{manifestPromise=null;throw error;});
 return manifestPromise;
}
function status(message){const node=document.getElementById("archiveStatus");if(node)node.textContent=message;}
async function loadCategory(name){
 const m=await manifest();const meta=m.categories.find(x=>norm(x.name)===norm(name));
 if(!meta)throw Error("موضوع در گنجینه پیدا نشد");
 if(loaded.has(meta.name))return 0;if(pending.has(meta.name))return pending.get(meta.name);
 const job=(async()=>{
  status("در حال دریافت «"+meta.name+"»؛ "+meta.count.toLocaleString("fa-IR")+" اثر…");
  const response=await archiveFetch(meta.file);
  if(typeof DecompressionStream==="undefined")throw Error("مرورگر از بازکردن آرشیو فشرده پشتیبانی نمی‌کند");
  const bytes=await response.arrayBuffer();
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const records=await new Response(stream).json();
  if(!Array.isArray(records)||records.length!==meta.count)throw Error("تعداد آثار دستهٔ «"+meta.name+"» با فهرست گنجینه مطابقت ندارد");
  categoryRecords.set(meta.name,records);
  const target=window.poemEntries||(window.poemEntries=[]);
  const ids=new Set(target.map(x=>x.id));
  const bodyKey=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\s\p{P}\p{S}\u200c\u200e\u200fـ]/gu,"").toLowerCase();
  const bodies=new Set(target.map(x=>bodyKey(x.body)).filter(Boolean));
  for(const item of records){const key=bodyKey(item.body);if(!item.id||ids.has(item.id)||!key||bodies.has(key))continue;ids.add(item.id);bodies.add(key);target.push(item);}
  if(window.YESContent){
   const contentIds=new Set(window.YESContent.all.map(x=>x.id));
   for(const item of records){if(!contentIds.has(item.id)){window.YESContent.all.push(item);contentIds.add(item.id);}}
   window.YESContent.poems=window.YESContent.all.filter(x=>x.type!=="text");
  }
  loaded.set(meta.name,records.length);
  const loadedRecords=window.YESArchive.loadedCount();
  status(loadedRecords.toLocaleString("fa-IR")+" از "+m.total.toLocaleString("fa-IR")+" اثر گنجینه بارگذاری شد.");
  window.dispatchEvent(new CustomEvent("yes:archive-loaded",{detail:{category:meta.name,added:records.length,total:target.length,loadedRecords,loadedCategories:loaded.size,categoryIndex:m.categories.findIndex(x=>x.name===meta.name)+1,categoryTotal:m.categories.length,archiveTotal:m.total}}));
  return records.length;
 })().catch(error=>{status("بارگذاری این دسته کامل نشد؛ اتصال را بررسی و دوباره تلاش کنید.");throw error;}).finally(()=>pending.delete(meta.name));
 pending.set(meta.name,job);return job;
}
async function loadAll(){
 const m=await manifest();
 for(const item of m.categories)await loadCategory(item.name);
 if(loadedCount()!==m.total)throw Error("همهٔ آثار گنجینه بارگذاری نشدند.");
 return loadedCount();
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