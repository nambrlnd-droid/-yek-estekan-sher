/* Installability, offline status and service-worker updates. */
(function(){
 "use strict";
 let installPrompt=null,registration=null;
 const $=id=>document.getElementById(id);
 function status(){
  const node=$("pwaStatus");if(!node)return;
  node.textContent=navigator.onLine?"اتصال اینترنت برقرار است · نسخهٔ آفلاین پس از بارگیری اولیه در دسترس خواهد بود":"حالت آفلاین · محتوای ذخیره‌شده در دسترس است";
 }
 function showUpdate(){
  if(!registration||!registration.waiting)return;
  if(confirm("نسخهٔ تازه‌ای از یک استکان شعر آماده است. اکنون به‌روزرسانی شود؟")){
   registration.waiting.postMessage({type:"SKIP_WAITING"});
  }
 }
 async function install(){
  if(installPrompt){
   installPrompt.prompt();
   await installPrompt.userChoice;
   installPrompt=null;
   $("installApp").hidden=true;
  }else if(registration){
   alert("برای نصب، از منوی مرورگر گزینهٔ «افزودن به صفحهٔ اصلی» یا «Install app» را انتخاب کنید.");
  }else{
   alert("نصب برنامه در این مرورگر پشتیبانی نمی‌شود؛ سایت همچنان قابل استفاده است.");
  }
 }
 window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();installPrompt=event;
  const button=$("installApp");if(button)button.hidden=false;
 });
 window.addEventListener("appinstalled",()=>{
  installPrompt=null;if($("installApp"))$("installApp").hidden=true;
  if($("pwaStatus"))$("pwaStatus").textContent="برنامه روی دستگاه نصب شد.";
 });
 window.addEventListener("online",status);
 window.addEventListener("offline",status);
 document.addEventListener("DOMContentLoaded",async()=>{
  status();
  const button=$("installApp");if(button)button.addEventListener("click",install);
  if(!("serviceWorker" in navigator)){if($("pwaStatus"))$("pwaStatus").textContent="ذخیره‌سازی آفلاین در این مرورگر پشتیبانی نمی‌شود.";return;}
  try{
   registration=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
   if(registration.waiting)showUpdate();
   registration.addEventListener("updatefound",()=>{
    const worker=registration.installing;
    if(!worker)return;
    worker.addEventListener("statechange",()=>{
     if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdate();
    });
   });
   navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!window.__yesReloading){window.__yesReloading=true;location.reload();}
   });
   if($("pwaStatus"))$("pwaStatus").textContent=navigator.onLine?"آمادهٔ استفاده · پوستهٔ برنامه ذخیره می‌شود":"آفلاین · نسخهٔ ذخیره‌شده فعال است";
  }catch(error){
   if($("pwaStatus"))$("pwaStatus").textContent="ذخیره‌سازی آفلاین فعال نشد؛ اتصال اینترنت را بررسی کنید.";
  }
 });
})();
