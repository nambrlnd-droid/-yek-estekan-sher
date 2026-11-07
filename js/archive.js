/* Lazy, category-based loader for the Ganjoor poetry archive. */
(function(){
"use strict";
const base="./data/poetry-archive/";
let manifestPromise=null;
const loaded=new Map(),pending=new Map();
const norm=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").trim();
async function manifest(){
 if(!manifestPromise)manifestPromise=fetch(base+"manifest.json").then(r=>{if(!r.ok)throw Error("فهرست گنجینه دریافت نشد");return r.json();});
 return manifestPromise;
}
function status(message){const node=document.getElementById("archiveStatus");if(node)node.textContent=message;}
async function loadCategory(name){
 const m=await manifest();const meta=m.categories.find(x=>norm(x.name)===norm(name));
 if(!meta)throw Error("موضوع در گنجینه پیدا نشد");
 if(loaded.has(meta.name))return 0;if(pending.has(meta.name))return pending.get(meta.name);
 const job=(async()=>{
  status("در حال دریافت «"+meta.name+"»؛ "+meta.count.toLocaleString("fa-IR")+" اثر…");
  const response=await fetch(base+meta.file);if(!response.ok)throw Error("دریافت دستهٔ شعر ناموفق بود");
  if(typeof DecompressionStream==="undefined")throw Error("مرورگر از بازکردن آرشیو فشرده پشتیبانی نمی‌کند");
  const bytes=await response.arrayBuffer();const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const records=await new Response(stream).json();const target=window.poemEntries||(window.poemEntries=[]);
  const ids=new Set(target.map(x=>x.id));
  const bodyKey=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\s\p{P}\p{S}\u200c\u200e\u200fـ]/gu,"").toLowerCase();
  const bodies=new Set(target.map(x=>bodyKey(x.body)).filter(Boolean));let added=0;const addedItems=[];
  for(const item of records){const key=bodyKey(item.body);if(!item.id||ids.has(item.id)||!key||bodies.has(key))continue;ids.add(item.id);bodies.add(key);target.push(item);addedItems.push(item);added++;}
  if(window.YESContent){window.YESContent.all.push(...addedItems);window.YESContent.poems=window.YESContent.all.filter(x=>x.type!=="text");}
  loaded.set(meta.name,added);
  status("گنجینهٔ گنجور: "+window.YESArchive.loadedCount().toLocaleString("fa-IR")+" اثر از "+m.total.toLocaleString("fa-IR")+" اثر بارگذاری شده است؛ منبع: گنجور؛ مجوز مجموعه CC BY 4.0 است، اما حقوق تک‌تک آثار جداگانه راستی‌آزمایی نشده.");
  window.dispatchEvent(new CustomEvent("yes:archive-loaded",{detail:{category:meta.name,added,total:target.length}}));
  return added;
 })().catch(error=>{status("بارگذاری این دسته انجام نشد؛ اتصال را بررسی و دوباره انتخاب کنید.");throw error;}).finally(()=>pending.delete(meta.name));
 pending.set(meta.name,job);return job;
}
async function loadAll(){const m=await manifest();let n=0;for(const item of m.categories)n+=await loadCategory(item.name);return n;}
window.YESArchive={
 manifest,loadCategory,loadAll,
 isArchiveCategory(name){return !!(window.YESArchive.manifestData&&window.YESArchive.manifestData.categories.some(x=>norm(x.name)===norm(name)));},
 categories(){return window.YESArchive.manifestData?.categories||[];},
 loadedCount(){return [...loaded.values()].reduce((n,x)=>n+x,0)},
 loaded(name){return loaded.has(name)}
};
manifest().then(m=>{window.YESArchive.manifestData=m;status("گنجینهٔ گنجور آماده است: "+m.total.toLocaleString("fa-IR")+" اثر در "+m.categories.length.toLocaleString("fa-IR")+" موضوع؛ منبع: گنجور و مجموعهٔ mabidan/ganjoor؛ مجوز مجموعه CC BY 4.0 است، اما حقوق تک‌تک آثار جداگانه راستی‌آزمایی نشده. دسته‌بندی ماشینی است؛ برای دریافت هر بخش، موضوع آن را انتخاب کنید.");window.dispatchEvent(new Event("yes:archive-manifest-loaded"));}).catch(()=>status("گنجینهٔ اشعار در حال حاضر در دسترس نیست."));
})();