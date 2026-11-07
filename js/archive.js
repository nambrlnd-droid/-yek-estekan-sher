/* Lazy, category-based loader for the Ganjoor poetry archive. */
(function(){
"use strict";
const base="./data/poetry-archive/";
let manifestPromise=null;
const loaded=new Set(),pending=new Map();
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
  const ids=new Set(target.map(x=>x.id));let added=0;
  for(const item of records){if(!item.id||ids.has(item.id))continue;ids.add(item.id);target.push(item);added++;}
  if(window.YESContent){const known=new Set(window.YESContent.all.map(x=>x.id));for(const item of records){if(!known.has(item.id)){window.YESContent.all.push(item);known.add(item.id);}}window.YESContent.poems=window.YESContent.all.filter(x=>x.type!=="text");}
  loaded.add(meta.name);
  status("گنجینهٔ گنجور: "+window.YESArchive.loadedCount().toLocaleString("fa-IR")+" اثر از "+m.total.toLocaleString("fa-IR")+" اثر بارگذاری شده است. دسته‌بندی ماشینی است.");
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
 loadedCount(){return loaded.size?window.YESArchive.categories().filter(x=>loaded.has(x.name)).reduce((n,x)=>n+x.count,0):0;},
 loaded(name){return loaded.has(name);}
};
manifest().then(m=>{window.YESArchive.manifestData=m;status("گنجینهٔ گنجور آماده است: "+m.total.toLocaleString("fa-IR")+" اثر در "+m.categories.length.toLocaleString("fa-IR")+" موضوع؛ برای دریافت هر بخش، موضوع آن را انتخاب کنید.");window.dispatchEvent(new Event("yes:archive-manifest-loaded"));}).catch(()=>status("گنجینهٔ اشعار در حال حاضر در دسترس نیست."));
})();