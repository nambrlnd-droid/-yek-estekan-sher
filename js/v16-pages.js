/* v1.6: independent, deep-linkable pages for the five primary sections. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const labels={home:"خانه",library:"کتابخانه",search:"جست‌وجو",favorites:"علاقه‌مندی‌ها",notebook:"دفتر من"};
const routeIds={home:"homePageView",search:"searchPageView",library:"v15LibraryView",favorites:"favoritesPageView",notebook:"notebookView",pinned:"pinnedView",read:"readerView",image:"imageStudioView"};
let activeRoute="home",returnRoute="home",internalClick=false,favoritesBusy=false;
const allPageIds=Object.values(routeIds);
function make(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function link(route,title,description,glyph){
 const a=document.createElement("a");a.className="v16-page-card";a.href="#/"+route;
 const mark=make("span","v16-page-glyph",glyph),copy=make("span","v16-page-copy");
 copy.append(make("strong","",title),make("small","",description));
 a.append(mark,copy,make("span","v16-page-arrow","←"));return a;
}
function createNavigation(){
 if(!$("v16PrimaryNav")){
  const nav=make("nav","v16-primary-nav");nav.id="v16PrimaryNav";nav.setAttribute("aria-label","صفحه‌های اصلی");
  [["home","خانه"],["library","کتابخانه"],["search","جست‌وجو"],["favorites","علاقه‌مندی‌ها"],["notebook","دفتر من"]].forEach(([route,label])=>{
   const a=make("a","",label);a.href="#/"+route;a.dataset.route=route;nav.append(a);
  });
  $("siteHeader")?.insertAdjacentElement("afterend",nav) || document.querySelector(".site-header")?.insertAdjacentElement("afterend",nav);
  const theme=$("themeToggle"),header=document.querySelector(".site-header");if(theme&&header){theme.classList.add("v16-theme-toggle");header.append(theme);}
 }
}
function createHome(){
 if($("homePageView"))return;
 const main=document.querySelector("main"),home=make("section","v16-page v16-home");home.id="homePageView";
 home.innerHTML='<div class="v16-home-hero"><span class="v16-eyebrow">مکثی میان واژه‌ها</span><h2>هر بار، دریچه‌ای تازه به جهان شعر</h2><p>در کتابخانه قدم بزنید، واژه‌ای را جست‌وجو کنید یا خواندن را از همان‌جا که مانده‌اید ادامه دهید.</p><a class="v16-home-cta" href="#/library">ورود به کتابخانه <span>←</span></a></div><div id="v16DailySlot" class="v16-home-daily"></div><div id="v16StatsSlot"></div><div class="v16-home-section"><div class="v16-section-heading"><span>راه‌های کشف</span><h2>از کجا آغاز می‌کنید؟</h2></div><div class="v16-page-grid" id="v16HomeLinks"></div></div><div id="v16PinnedSlot"></div>';
 const mainFirst=main.firstElementChild;main.insertBefore(home,mainFirst);
 const links=$("v16HomeLinks");
 links.append(
  link("library","کتابخانهٔ ادبی","مرور موضوعات، شاعران و مجموعه‌ها","▤"),
  link("search","جست‌وجوی شعر","یافتن شعر، متن، بیت یا نام شاعر","⌕"),
  link("favorites","علاقه‌مندی‌ها","بازگشت به آثاری که نشان کرده‌اید","♡"),
  link("notebook","دفتر شخصی","تاریخچه، یادداشت‌ها و مجموعه‌های شما","▣")
 );
 const move=(id,target)=>{const node=$(id);if(node)$(target).append(node);};
 move("dailyPoem","v16DailySlot");move("continueReading","v16DailySlot");
 move("siteStats","v16StatsSlot");move("pinned","v16PinnedSlot");
}
function createSearchPage(){
 if($("searchPageView"))return;
 const main=document.querySelector("main"),page=make("section","v16-page v16-search-page");page.id="searchPageView";
 const head=make("header","v16-page-heading");head.append(make("span","v16-eyebrow","جست‌وجو و کاوش"),make("h2","","در میان واژه‌ها بجویید"),make("p","","از جست‌وجوی معمولی تا عبارت دقیق، مصراع، بیت و نام شاعر."));page.append(head);
 const regular=$("regularView");if(regular){page.append(regular);regular.hidden=false;}
 main.append(page);
}
function createFavoritesPage(){
 if($("favoritesPageView"))return;
 const page=make("section","v16-page v16-favorites-page");page.id="favoritesPageView";
 page.innerHTML='<header class="v16-page-heading"><span class="v16-eyebrow">گزیده‌های شخصی</span><h2>علاقه‌مندی‌های من</h2><p>آثاری که برای بازگشت دوباره نشان کرده‌اید.</p></header><div class="v16-favorites-toolbar"><span id="v16FavoritesCount">در حال خواندن فهرست…</span><button type="button" id="v16FavoritesRefresh">تازه‌سازی</button></div><div id="v16FavoritesItems" class="v16-favorites-list"></div>';
 document.querySelector("main").append(page);
 $("v16FavoritesRefresh").addEventListener("click",renderFavorites);
}
function createSearchShell(){
 const main=document.querySelector("main"),library=$("v15LibraryView");
 if(library&&library.parentElement!==main)main.append(library);
}
function movePageContent(){
 const home=$("homePageView"),search=$("searchPageView");
 if(!home||!search)return;
 ["dailyPoem","continueReading","siteStats","pinned"].forEach(id=>{
  const n=$(id),target=id==="siteStats"?"v16StatsSlot":id==="pinned"?"v16PinnedSlot":"v16DailySlot";
  if(n&&$(target)&&n.parentElement!==$(target))$(target).append(n);
 });
 const regular=$("regularView");if(regular&&regular.parentElement!==search)search.append(regular);
}
function setVisible(route){
 const target=routeIds[route]||routeIds.home;
 allPageIds.forEach(id=>{const n=$(id);if(n)n.hidden=id!==target;});
 const regular=$("regularView");if(regular)regular.hidden=route!=="search";
 const body=document.body;
 body.classList.remove("library-open","notebook-open","reader-open","reader-focus","image-studio-open","reading-mode");
 if(route==="library")body.classList.add("library-open");
 if(route==="notebook")body.classList.add("notebook-open");
 if(route==="read")body.classList.add("reader-open");
 if(route==="image")body.classList.add("image-studio-open");
 if(route==="pinned"&&$("pinnedView"))$("pinnedView").hidden=false;
 const nav=$("v16PrimaryNav");
 nav?.querySelectorAll("[data-route]").forEach(a=>{
  const active=a.dataset.route===route;
  a.classList.toggle("active",active);
  if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
 });
 document.querySelectorAll("#mobileDock [data-action]").forEach(b=>{
  const map={home:"home",library:"library",search:"search",favorites:"favorites",notebook:"notebook"};
  b.classList.toggle("active",map[b.dataset.action]===route);
 });
}
async function renderFavorites(){
 if(favoritesBusy)return;favoritesBusy=true;
 const root=$("v16FavoritesItems"),count=$("v16FavoritesCount");if(!root){favoritesBusy=false;return;}
 root.replaceChildren();count.textContent="در حال دریافت علاقه‌مندی‌ها…";
 try{
  await window.YESNotebook?.migrateLegacy?.();
  const records=await window.YESStorage.all("favorites");
  const normalized=records.map(x=>({...x,contentId:x.contentId||x.id}));
  const usable=normalized.map(rec=>({rec,item:window.YESContent?.get(rec.contentId)||rec.itemSnapshot||null})).filter(x=>x.item);
  count.textContent=usable.length.toLocaleString("fa-IR")+" اثر نشان‌شده";
  if(!usable.length){root.append(make("div","v16-empty","هنوز اثری به علاقه‌مندی‌ها اضافه نکرده‌اید. از صفحهٔ جست‌وجو یا مطالعه، نشان قلب را انتخاب کنید."));return;}
  usable.sort((a,b)=>new Date(b.rec.createdAt||0)-new Date(a.rec.createdAt||0));
  usable.forEach(({rec,item})=>{
   const card=make("article","v16-favorite-item"),open=make("button","v16-favorite-open");
   open.type="button";open.append(make("strong","",item.title||String(item.body||"").split("\n")[0]||"بدون عنوان"),make("span","",String(item.body||"").slice(0,230)),make("small","",[item.author,item.tags?.slice(0,2).join(" · ")].filter(Boolean).join(" · ")));
   open.addEventListener("click",()=>{
    const ready={...item,id:String(item.id),type:item.type||(item.section==="texts"?"text":"poem"),tags:Array.isArray(item.tags)?item.tags:[]};
    if(window.YESContent&&!window.YESContent.get(ready.id))window.YESContent.all.push(ready);
    window.YESReader.open(ready.id);
   });
   const remove=make("button","v16-favorite-remove","برداشتن از علاقه‌مندی‌ها");remove.type="button";
   remove.addEventListener("click",async()=>{await window.YESStorage.remove("favorites",rec.contentId);try{const old=JSON.parse(localStorage.getItem("yekestekan-favorites")||"[]");localStorage.setItem("yekestekan-favorites",JSON.stringify(old.filter(x=>x!==("poem-"+item.legacyIndex)&&x!==("pinned-"+item.legacyIndex))));}catch(e){}renderFavorites();});
   card.append(open,remove);root.append(card);
  });
 }catch(error){count.textContent="فهرست علاقه‌مندی‌ها در دسترس نیست.";root.append(make("div","v16-empty","ذخیره‌سازی مرورگر را بررسی کنید و دوباره تلاش کنید."));}
 finally{favoritesBusy=false;}
}
function go(route,id){
 if(route==="read"&&activeRoute!=="read")returnRoute=activeRoute;
 if(route==="image"&&activeRoute!=="image")returnRoute=activeRoute;
 window.YESRouter.go(route,id);
}
function showRoute(state){
 const route=state?.route||"home";
 if(route==="read"){if(activeRoute!=="read")returnRoute=activeRoute;activeRoute="read";setVisible("read");return;}
 if(route==="image"||route==="image-studio"){if(activeRoute!=="image")returnRoute=activeRoute;activeRoute="image";setVisible("image");return;}
 if(route==="pinned"){if(activeRoute!=="pinned")returnRoute=activeRoute;activeRoute="pinned";setVisible("pinned");window.renderPinned?.();return;}
 if(!["home","library","search","favorites","notebook"].includes(route)){activeRoute="home";setVisible("home");return;}
 activeRoute=route;setVisible(route);
 if(route==="library"){
  const b=document.querySelector(".v15-open-library");
  if(b&&!internalClick){internalClick=true;b.click();internalClick=false;setVisible("library");}
 }
 if(route==="notebook"){window.YESNotebook?.open();setVisible("notebook");}
 if(route==="favorites")renderFavorites();
 if(route==="search"){const search=$("search");if(search)search.focus({preventScroll:true});}
}
function installInteractions(){
 document.addEventListener("click",event=>{
  const dock=event.target.closest("#mobileDock button[data-action]");
  const dockRoutes={home:"home",library:"library",search:"search",favorites:"favorites",notebook:"notebook"};
  if(dock){event.preventDefault();event.stopImmediatePropagation();go(dockRoutes[dock.dataset.action]||"home");return;}
  const navLink=event.target.closest("#v16PrimaryNav a,.v16-page-card,.v16-home-cta");
  if(navLink){const route=(navLink.getAttribute("href")||"").slice(2).split("/")[0];if(route){event.preventDefault();event.stopImmediatePropagation();go(route);return;}}
  if(internalClick)return;
  if(event.target.closest("#pinned")||(event.target.closest("#v15LibraryTabs button")&&event.target.closest("#v15LibraryTabs button").textContent.trim()==="پیشنهاد‌ومیض")){event.preventDefault();event.stopImmediatePropagation();go("pinned");return;}
  if(event.target.closest(".v15-open-library")){event.preventDefault();event.stopImmediatePropagation();go("library");return;}
  if(event.target.closest("#openNotebook")){event.preventDefault();event.stopImmediatePropagation();go("notebook");return;}
  if(event.target.closest("#readerMakeImage")){event.preventDefault();event.stopImmediatePropagation();returnRoute=activeRoute;const id=decodeURIComponent(location.hash.split("/").pop()||"");window.YESImageStudio?.open(window.YESContent?.get(id)||null);activeRoute="image";setVisible("image");return;}
  if(event.target.closest("#readerMakeImage")){event.preventDefault();event.stopImmediatePropagation();returnRoute=activeRoute;const id=decodeURIComponent(location.hash.split("/").pop()||"");window.YESImageStudio?.open(window.YESContent?.get(id)||null);activeRoute="image";setVisible("image");return;}
  if(event.target.closest("#openImageStudio")){event.preventDefault();event.stopImmediatePropagation();returnRoute=activeRoute;window.YESImageStudio?.open(null);activeRoute="image";setVisible("image");return;}
  if(event.target.closest("#notebookBack")){event.preventDefault();event.stopImmediatePropagation();go("home");return;}
  if(event.target.closest("#v15LibraryBack")){event.preventDefault();event.stopImmediatePropagation();go("home");return;}
  if(event.target.closest("#backFromPinned")){event.preventDefault();event.stopImmediatePropagation();go(returnRoute||"home");return;}
  if(event.target.closest("#readerBack")){event.preventDefault();event.stopImmediatePropagation();go(returnRoute||"home");return;}
  if(event.target.closest("#imageStudioBack")){event.preventDefault();event.stopImmediatePropagation();go(returnRoute||"home");return;}
 },true);
 window.addEventListener("yes:route",event=>showRoute(event.detail||{route:"home"}));
 window.addEventListener("yes:archive-loaded",()=>{if(activeRoute==="favorites")renderFavorites();});
 window.addEventListener("yes:web-poems-loaded",()=>{if(activeRoute==="favorites")renderFavorites();});
}
document.addEventListener("DOMContentLoaded",()=>{
 createNavigation();createHome();createSearchPage();createFavoritesPage();createSearchShell();movePageContent();installInteractions();
 const current=window.YESRouter?.current?.()||{route:"home"};
 showRoute(current);
 if(!location.hash)history.replaceState(null,"",location.pathname+location.search+"#/home");
});
window.YESPages={go,renderFavorites,current:()=>activeRoute};
})();