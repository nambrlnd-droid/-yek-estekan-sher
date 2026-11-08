/* V1.8 full-screen gate: the public app opens only after every archive shard is loaded and verified. */
(function(){
"use strict";
window.__YES_ARCHIVE_BOOTING=true;
let running=false,complete=false;
const screen=()=>document.getElementById("archiveBootScreen");
const message=()=>document.getElementById("archiveBootMessage");
const bar=()=>document.getElementById("archiveBootProgress");
const percent=()=>document.getElementById("archiveBootPercent");
const retry=()=>document.getElementById("archiveBootRetry");
const fmt=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0);
function update(text,done,total){
 if(message())message().textContent=text;
 if(Number.isFinite(done)&&Number.isFinite(total)&&total>0){
  const value=Math.max(0,Math.min(100,done/total*100));
  if(bar())bar().style.width=value+"%";
  if(percent())percent().textContent=fmt(Math.floor(value))+"٪ · "+fmt(done)+" از "+fmt(total)+" اثر";
 }
}
function reveal(){if(screen()){screen().hidden=false;screen().classList.remove("has-error");}document.body.classList.add("archive-booting");}
function hide(){if(screen())screen().hidden=true;document.body.classList.remove("archive-booting");}
async function migrateNotebookSafely(){
 try{await window.YESNotebook?.migrateLegacy?.();}
 catch(error){console.warn("Legacy notebook migration was skipped:",error);window.dispatchEvent(new CustomEvent("yes:notebook-migration-error",{detail:{message:String(error?.message||error)}}));}
}
async function boot(){
 if(running||complete)return;
 running=true;reveal();
 if(retry())retry().disabled=true;
 update("در حال دریافت و بررسی همهٔ دسته‌های آرشیو؛ تا پایان این مرحله سایت باز نمی‌شود.");
 try{
  const forceTestError=window.__YES_TEST_FORCE_ARCHIVE_ERROR===true||new URLSearchParams(location.search).get("yesTestArchiveError")==="1";
  if(forceTestError)throw new Error("خطای آزمایشی دریافت آرشیو");
  if(window.__YES_TEST_SKIP_ARCHIVE_GATE===true){
   window.__YES_ARCHIVE_DATA_READY=true;
   window.dispatchEvent(new Event("yes:archive-data-ready"));
   await migrateNotebookSafely();
   complete=true;window.__YES_ARCHIVE_READY=true;
   window.dispatchEvent(new Event("yes:archive-ready"));
   return;
  }
  const manifest=await window.YESArchive.manifest();
  update("فهرست آرشیو دریافت شد؛ "+fmt(manifest.total)+" اثر در "+fmt(manifest.categories.length)+" دسته باید بارگذاری شود.",0,manifest.total);
  await window.YESArchive.loadAll();
  const loaded=window.YESArchive.loadedCount();
  if(loaded!==manifest.total)throw new Error("تعداد آثار دریافت‌شده کامل نیست ("+fmt(loaded)+" از "+fmt(manifest.total)+").");
  window.__YES_ARCHIVE_DATA_READY=true;
  window.dispatchEvent(new Event("yes:archive-data-ready"));
  update("همهٔ آثار بارگذاری شدند؛ در حال آماده‌سازی اطلاعات شخصی و نهایی‌سازی کتابخانه.",loaded,manifest.total);
  await migrateNotebookSafely();
  complete=true;window.__YES_ARCHIVE_READY=true;
  update("کتابخانه آماده است.",loaded,manifest.total);
  window.dispatchEvent(new Event("yes:archive-ready"));
 }catch(error){
  const detail=String(error?.message||error);
  update("بارگذاری کامل نشد: "+detail+"؛ برای نمایش سایت باید همهٔ آثار دریافت شوند.");
  if(screen())screen().classList.add("has-error");
  if(retry())retry().disabled=false;
  window.dispatchEvent(new CustomEvent("yes:archive-error",{detail:{message:detail}}));
 }finally{
  window.__YES_ARCHIVE_BOOTING=false;
  running=false;
 }
}
window.addEventListener("yes:archive-loading",event=>{
 const d=event.detail||{};
 update("در حال بارگذاری دستهٔ "+fmt(d.categoryIndex)+" از "+fmt(d.categoryTotal)+" · "+String(d.category||"")+"…");
});
window.addEventListener("yes:archive-loaded",event=>{
 const d=event.detail||{};
 update("آرشیو در حال بارگذاری است؛ "+fmt(d.loadedCategories)+" از "+fmt(d.categoryTotal)+" دسته تکمیل شد.",Number(d.loadedRecords)||0,Number(d.archiveTotal)||0);
});
window.addEventListener("yes:archive-ready",hide);
window.addEventListener("online",()=>{if(!complete)boot();});
if(retry())retry().addEventListener("click",boot);
window.YESArchiveGate={retry:boot,isReady:()=>complete};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
