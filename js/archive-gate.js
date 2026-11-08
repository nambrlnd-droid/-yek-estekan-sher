/* Loads and verifies the full poetry archive in the background without blocking the site UI. */
(function(){
"use strict";
window.__YES_ARCHIVE_BOOTING=true;
let running=false,complete=false;
async function boot(){
 if(running||complete)return;
 running=true;
 try{
  const manifest=await window.YESArchive.manifest();
  await window.YESArchive.loadAll();
  const loaded=window.YESArchive.loadedCount();
  if(loaded!==manifest.total)throw new Error("تعداد آثار دریافت‌شده کامل نیست.");
  window.__YES_ARCHIVE_DATA_READY=true;
  window.dispatchEvent(new Event("yes:archive-data-ready"));
  await window.YESNotebook?.migrateLegacy?.();
  complete=true;
  window.__YES_ARCHIVE_READY=true;
  window.dispatchEvent(new Event("yes:archive-ready"));
 }catch(error){
  window.dispatchEvent(new CustomEvent("yes:archive-error",{detail:{message:String(error?.message||error)}}));
 }finally{
  window.__YES_ARCHIVE_BOOTING=false;
  running=false;
 }
}
window.addEventListener("online",()=>{if(!complete)boot();});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
