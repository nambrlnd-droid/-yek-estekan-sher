/* Version 1.6 — independent primary pages and addressable navigation. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const pages=[
  {id:"home",label:"خانه",icon:"⌂",title:"خانه",description:"گزیده‌ای برای مکث میان شعر و واژه."},
  {id:"library",label:"کتابخانه",icon:"▤",title:"کتابخانه",description:"موضوع‌ها، طبقه‌ها، شاعران و مجموعه‌های ادبی."},
  {id:"search",label:"جست‌وجو",icon:"⌕",title:"جست‌وجوی شعر",description:"در متن شعرها، مصراع‌ها، بیت‌ها و نام شاعران جست‌وجو کنید."},
  {id:"favorites",label:"علاقه‌ها",icon:"♡",title:"علاقه‌مندی‌ها",description:"آثاری که برای بازخوانی نشان کرده‌اید."},
  {id:"notebook",label:"دفتر من",icon:"▣",title:"دفتر شخصی من",description:"تاریخچه، یادداشت‌ها و مجموعه‌های شخصی شما."}
 ];
 const viewIds=["regularView","pinnedView","readerView","notebookView","imageStudioView","v15LibraryView"];
 let initialized=false;
 function navMarkup(){
  const nav=document.createElement("nav");nav.className="v16-primary-nav";nav.id="v16PrimaryNav";nav.setAttribute("aria-label","صفحات اصلی سایت");
  pages.forEach(p=>{const a=document.createElement("a");a.href="#/"+p.id;a.dataset.route=p.id;a.innerHTML='<span aria-hidden="true">'+p.icon+'</span><b>'+p.label+'</b>';nav.append(a);});
  return nav;
 }
 function ensureNavigation(){
  if($("v16PrimaryNav"))return;
  const nav=navMarkup(),header=document.querySelector(".site-header");
  if(header)header.insertAdjacentElement("afterend",nav);
  else document.body.insertBefore(nav,document.body.firstChild);
  const heading=document.createElement("header");heading.className="v16-page-heading";heading.id="v16PageHeading";heading.hidden=true;
  heading.innerHTML='<small>یک استکان شعر · نسخهٔ ۱.۶</small><h2 id="v16PageTitle"></h2><p id="v16PageDescription"></p>';
  nav.insertAdjacentElement("afterend",heading);
  nav.addEventListener("click",event=>{
   const a=event.target.closest("a[data-route]");if(!a)return;
   event.preventDefault();window.YESRouter?.go(a.dataset.route);
  });
 }
 function hideViews(){
  viewIds.forEach(id=>{const node=$(id);if(node)node.hidden=true;});
 }
 function setPageHeading(page){
  const heading=$("v16PageHeading");if(!heading)return;
  const show=page.id!=="home";
  heading.hidden=!show;
  $("v16PageTitle").textContent=page.title;
  $("v16PageDescription").textContent=page.description;
 }
 function setActive(id){
  document.querySelectorAll("#v16PrimaryNav a").forEach(a=>{
   if(a.dataset.route===id)a.setAttribute("aria-current","page");
   else a.removeAttribute("aria-current");
  });
 }
 function openNotebook(tab){
  const view=$("notebookView");if(!view)return;
  document.body.classList.add("notebook-open");
  if(window.YESNotebook?.open)window.YESNotebook.open();
  else {view.hidden=false;$("regularView").hidden=true;}
  const tabs=$("notebookTabs")?.querySelectorAll("button")||[];
  const index=tab==="favorites"?0:tab==="notebook"?3:0;
  if(tabs[index])tabs[index].click();
 }
 function route(state){
  const id=state?.route||"home";
  const page=pages.find(x=>x.id===id);
  document.body.classList.add("v16-editorial");
  document.body.classList.remove("v16-page-home","v16-page-library","v16-page-search","v16-page-favorites","v16-page-notebook","v16-page-read","library-open","notebook-open","reader-open","reader-focus","image-studio-open");
  if(state.route==="pinned"){
   hideViews();if($("pinnedView"))$("pinnedView").hidden=false;
   document.body.classList.add("v16-page-library");setActive("library");
   window.renderPinned?.();return;
  }
  if(state.route==="read"){
   hideViews();if($("readerView"))$("readerView").hidden=false;
   document.body.classList.add("v16-page-read","reader-open");
   setActive("");return;
  }
  document.body.classList.remove("v16-page-read");
  if(!page){window.YESRouter?.go("home");return;}
  document.body.classList.add("v16-page-"+id);
  setActive(id);setPageHeading(page);hideViews();
  if(id==="home"){
   $("regularView").hidden=false;
   $("siteStats").hidden=false;
   $("pinned").hidden=false;
   document.body.classList.remove("library-open","notebook-open");
  }else if(id==="library"){
   document.body.classList.add("library-open");
   const openButton=document.querySelector(".v15-open-library");
   if(openButton)openButton.click();
   else if($("v15LibraryView"))$("v15LibraryView").hidden=false;
  }else if(id==="search"){
   $("regularView").hidden=false;
   const input=$("search");if(input){input.setAttribute("placeholder","عبارت، مصراع، بیت یا نام شاعر را جست‌وجو کنید…");}
  }else if(id==="favorites"){
   openNotebook("favorites");
  }else if(id==="notebook"){
   openNotebook("notebook");
  }
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function init(){
  if(initialized)return;initialized=true;
  document.body.classList.add("v16-editorial");
  ensureNavigation();
  const savedTheme=(()=>{try{return localStorage.getItem("yes-v14-theme")||"light";}catch(e){return "light";}})();
  document.body.dataset.theme=savedTheme==="dark"?"dark":"light";
  window.YESRouter?.onChange(route);
  route(window.YESRouter?.current?.()||{route:"home"});
  document.addEventListener("click",event=>{
   if(event.target.closest("#v15LibraryBack,#notebookBack")){event.preventDefault();window.YESRouter?.go("home");}
  },true);
  window.addEventListener("yes:route",event=>{
   if(event.detail?.route==="read")document.body.classList.add("v16-page-read");
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();