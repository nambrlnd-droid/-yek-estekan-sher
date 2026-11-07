/* Blocks the app until every archive category is downloaded, verified and parsed. */
(function(){
"use strict";
window.__YES_ARCHIVE_BOOTING=true;
const root=document.getElementById("archiveBoot");
const progress=document.getElementById("archiveBootProgress");
const progressTrack=progress?.parentElement;
const count=document.getElementById("archiveBootCount");
const category=document.getElementById("archiveBootCategory");
const message=document.getElementById("archiveBootMessage");
const retry=document.getElementById("archiveBootRetry");
let running=false,complete=false,progressListener=false;
function paint(loaded,total,detail){
 const pct=total?Math.min(100,Math.round(loaded/total*100)):0;
 if(progress)progress.style.width=pct+"%";
 if(progressTrack)progressTrack.setAttribute("aria-valuenow",String(pct));
 if(count)count.textContent=loaded.toLocaleString("fa-IR")+" از "+total.toLocaleString("fa-IR")+" اثر";
 if(category)category.textContent=detail?.categoryIndex?("دستهٔ "+detail.categoryIndex.toLocaleString("fa-IR")+" از "+detail.categoryTotal.toLocaleString("fa-IR")+" · "+detail.category):"در حال آماده‌سازی فهرست گنجینه";
}
function reveal(){
 complete=true;window.__YES_ARCHIVE_READY=true;window.__YES_ARCHIVE_BOOTING=false;
 document.body.classList.remove("archive-gated");document.body.removeAttribute("aria-busy");
 if(root)root.hidden=true;
 window.dispatchEvent(new Event("yes:archive-ready"));
}
async function boot(){
 if(running||complete)return;running=true;if(retry)retry.hidden=true;
 if(window.__YES_TEST_SKIP_ARCHIVE_GATE===true){window.__YES_ARCHIVE_DATA_READY=true;window.dispatchEvent(new Event("yes:archive-data-ready"));await window.YESNotebook?.migrateLegacy?.();reveal();running=false;return;}
 try{
  if(message)message.textContent="برای نمایش کامل کتابخانه، همهٔ دسته‌های شعر دریافت و بررسی می‌شوند.";
  const manifest=await window.YESArchive.manifest();
  paint(window.YESArchive.loadedCount(),manifest.total,null);
  if(!progressListener){window.addEventListener("yes:archive-loaded",event=>paint(window.YESArchive.loadedCount(),manifest.total,event.detail));progressListener=true;}
  await window.YESArchive.loadAll();
  const webResult=window.YESWebPoemsReady?await Promise.race([window.YESWebPoemsReady,new Promise(resolve=>setTimeout(()=>resolve(false),20000))]):false;
  if(window.YESArchive.loadedCount()!==manifest.total)throw new Error("تعداد آثار دریافت‌شده کامل نیست.");
  window.__YES_ARCHIVE_DATA_READY=true;window.dispatchEvent(new Event("yes:archive-data-ready"));
  await window.YESNotebook?.migrateLegacy?.();
  paint(manifest.total,manifest.total,null);
  if(message)message.textContent=webResult===false?"گنجینهٔ اصلی کامل شد؛ آثار تکمیلی حافظ در این اتصال در دسترس نبودند.":"همهٔ آثار با موفقیت آماده شدند؛ خوش آمدید.";
  reveal();
 }catch(error){
  if(message)message.textContent="بارگذاری کامل نشد. سایت تا دریافت همهٔ آثار بسته می‌ماند؛ اتصال را بررسی و دوباره تلاش کنید.";
  if(category)category.textContent=String(error?.message||"خطای دریافت گنجینه");
  if(retry)retry.hidden=false;
 }finally{running=false;}
}
if(retry)retry.addEventListener("click",boot);
window.addEventListener("online",()=>{if(!complete)boot();});
document.addEventListener("DOMContentLoaded",boot,{once:true});
})();