/* Version 1.5: editorial library, poet profiles, advanced Persian search and focused reading. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const norm = value => String(value == null ? "" : value).normalize("NFKC")
  .replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ۀة]/g,"ه")
  .replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[۰-۹٠-٩]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[("۰۱۲۳۴۵۶۷۸۹".indexOf(d)>=0?"۰۱۲۳۴۵۶۷۸۹".indexOf(d):"٠١٢٣٤٥٦٧٨٩".indexOf(d))]||d)
  .replace(/[\u200c\u200d\u200e\u200f]/g," ").replace(/\s+/g," ").trim().toLocaleLowerCase("fa");
const allItems = () => {
 const seen=new Set();
 return [...(window.poemEntries||[]),...(window.pinnedEntries||[])].filter(x=>{
  if(!x||!x.id||seen.has(String(x.id)))return false;seen.add(String(x.id));return true;
 });
};
const unique = values => [...new Set(values.filter(Boolean))];
let libraryMode="topics",activeAuthor="",activeTopic="",focusMode=false,returnToLibraryFromPinned=false;
let searchMode="normal",libraryQuery="";
const escapeHTML = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){const n=$("toast");if(!n)return;n.textContent=message;n.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove("show"),2000);}
function setVisible(id){["regularView","pinnedView","readerView","notebookView","imageStudioView","v15LibraryView"].forEach(key=>{const n=$(key);if(n)n.hidden=key!==id;});}
function openLibrary(mode="topics"){libraryMode=mode;activeAuthor="";activeTopic="";setVisible("v15LibraryView");document.body.classList.add("library-open");document.body.classList.remove("reader-focus");renderLibrary();window.scrollTo({top:0,behavior:"smooth"});}
function closeLibrary(){document.body.classList.remove("library-open");setVisible("regularView");window.scrollTo({top:0,behavior:"smooth"});}
function addButton(parent,label,action,cls="tool-button"){const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.addEventListener("click",action);parent.append(b);return b;}
function card(title,meta,action){const b=document.createElement("button");b.type="button";b.className="v15-library-card";const strong=document.createElement("strong");strong.textContent=title;const small=document.createElement("small");small.textContent=meta;b.append(strong,small);b.addEventListener("click",action);return b;}
function makeTabs(root){root.replaceChildren();[["topics","مرور موضوعی"],["poets","شاعران و نویسندگان"],["collections","مجموعه‌های موضوعی"],["pinned","پیشنهاد‌ومیض"]].forEach(([key,label])=>addButton(root,label,()=>{if(key==="pinned"){openPinnedFromLibrary();return;}libraryMode=key;activeAuthor="";activeTopic="";renderLibrary();},libraryMode===key?"active":""));}
function openPinnedFromLibrary(){returnToLibraryFromPinned=true;document.body.classList.add("library-open");setVisible("pinnedView");window.renderPinned?.();window.scrollTo({top:0,behavior:"smooth"});}
function makeWorkButton(item){const b=document.createElement("button");b.type="button";b.className="v15-work";const text=document.createElement("span");text.textContent=(item.title||String(item.body||"").split("\n")[0]||"بدون عنوان").slice(0,100);const meta=document.createElement("small");meta.textContent=[item.author,item.category2].filter(Boolean).join(" · ");b.append(text,meta);b.addEventListener("click",()=>{const id=String(item.id);if(window.YESContent&&!window.YESContent.get(id)){window.YESContent.all.push({...item,id,type:item.type||(item.section==="texts"?"text":"poem"),tags:Array.isArray(item.tags)?item.tags:[]});}if(!window.YESReader?.open(id))toast("باز کردن این اثر ممکن نشد؛ دوباره تلاش کنید.");});return b;}
function renderItems(root,items,emptyText){root.replaceChildren();if(!items.length){const p=document.createElement("p");p.className="v15-empty";p.textContent=emptyText;root.append(p);return;}items.forEach(item=>root.append(makeWorkButton(item)));}
function renderTopics(root){
 const items=allItems(),categories=window.YESArchive?.categories?.()||[];
 const first=unique(items.map(x=>x.category1));
 const second=unique(items.map(x=>x.category2));
 const third=unique(items.map(x=>x.category3));
 const archiveNames=categories.map(x=>x.name);
 const wrap=document.createElement("div");wrap.className="v15-library-grid";
 const groups=[
  {heading:"طبقهٔ اول",values:first,field:"category1"},
  {heading:"موضوع‌های اصلی",values:second,field:"category2"},
  {heading:"گنجینهٔ موضوعی",values:archiveNames,archive:true},
  {heading:"زیرموضوع‌ها",values:third,field:"category3"}
 ];
 groups.forEach(({heading,values,field,archive})=>{
  const group=document.createElement("section");group.className="v15-library-group";const h=document.createElement("h3");h.textContent=heading;group.append(h);
  values.sort((a,b)=>a.localeCompare(b,"fa")).forEach(value=>{
   const count=archive?(categories.find(x=>x.name===value)?.count||0):items.filter(x=>x[field]===value).length;
   group.append(card(value,(archive?"تعداد در فهرست گنجینه: ": "در محتوای بارگذاری‌شده: ")+count.toLocaleString("fa-IR")+" اثر",()=>showTopic(value,!!archive,field)));
  });wrap.append(group);
 });root.append(wrap);
}
function renderPoets(root){
 const items=allItems(),counts=new Map();
 items.forEach(x=>{const name=String(x.author||"").trim();if(name)counts.set(name,(counts.get(name)||0)+1);});
 const search=document.createElement("input");search.type="search";search.className="v15-library-search";search.placeholder="نام شاعر یا نویسنده را بنویسید…";search.value=libraryQuery;search.setAttribute("aria-label","جست‌وجوی شاعر");
 const list=document.createElement("div");list.className="v15-library-grid";
 const draw=()=>{list.replaceChildren();[...counts].filter(([name])=>!libraryQuery||norm(name).includes(norm(libraryQuery))).sort((a,b)=>a[0].localeCompare(b[0],"fa")).forEach(([name,count])=>list.append(card(name,count.toLocaleString("fa-IR")+" اثر در محتوای بارگذاری‌شده",()=>showAuthor(name))));};
 search.addEventListener("input",()=>{libraryQuery=search.value;draw();});root.append(search,list);draw();
}
function showAuthor(name){
 activeAuthor=name;libraryMode="author";renderLibrary();
 $("v15LibraryTitle").textContent=name;
 const works=allItems().filter(x=>String(x.author||"").trim()===name);
 renderItems($("v15LibraryResults"),works,"اثری از این شاعر در محتوای بارگذاری‌شده پیدا نشد.");
}
const curated=[
 ["عاشقانه و دلدادگی","شعرهای عشق، مهر و وصال",x=>/عاشقانه|دلدادگی/.test(norm(x.category2||""))],
 ["فراق و دلتنگی","شعرهای دوری، هجران و انتظار",x=>/فراق|دلتنگی|انتظار/.test(norm(x.category2||""))],
 ["حکمت و اخلاق","تأمل دربارهٔ خرد، رفتار و فضیلت",x=>/حکمت|اخلاق/.test(norm(x.category2||""))],
 ["طبیعت و توصیف","تصویرهای باغ، باران، فصل‌ها و جهان",x=>/طبیعت|توصیف/.test(norm(x.category2||""))],
 ["اجتماعی و انتقادی","شعرهای جامعه، زمانه و نقد",x=>/اجتماعی|انتقادی/.test(norm(x.category2||""))],
 ["غزل و ادبیات کلاسیک","آثار بر پایهٔ برچسب‌های ادبی موجود",x=>/غزل|کلاسیک/.test(norm((x.category2||"")+" "+(x.tags||[]).join(" ")))],
 ["سوگ و مرثیه","آثار سوگ و یادبود",x=>/سوگ|مرثیه/.test(norm(x.category2||""))],
 ["اهل‌بیت علیهم‌السلام","آثاری که در طبقه‌بندی موجود به اهل‌بیت نسبت داده شده‌اند",x=>/امام|اهل.?بیت|حضرت/.test(norm(x.category2||""))]
];
function renderCollections(root){
 const items=allItems(),grid=document.createElement("div");grid.className="v15-library-grid";
 curated.forEach(([name,description,test])=>{const count=items.filter(test).length;grid.append(card(name,description+" · "+count.toLocaleString("fa-IR")+" اثر بارگذاری‌شده",()=>{libraryMode="collection";renderLibrary();$("v15LibraryTitle").textContent=name;renderItems($("v15LibraryResults"),items.filter(test),"هنوز اثری از این مجموعه در محتوای بارگذاری‌شده نیست. گنجینهٔ موضوعی را هم بررسی کنید.");}));});
 root.append(grid);
}
function renderLibrary(){
 const root=$("v15LibraryContent"),tabs=$("v15LibraryTabs"),title=$("v15LibraryTitle"),results=$("v15LibraryResults");
 makeTabs(tabs);root.replaceChildren();results.replaceChildren();title.textContent="کتابخانهٔ موضوعی";
 $("v15LibraryStatus").textContent="نمایه بر پایهٔ داده‌های بارگذاری‌شده ساخته می‌شود؛ شمار آثار شاعران و موضوعات با دریافت دسته‌های بیشتر تغییر می‌کند.";
 if(libraryMode==="topics")renderTopics(root);
 else if(libraryMode==="poets")renderPoets(root);
 else if(libraryMode==="collections")renderCollections(root);
 else if(libraryMode==="author"){root.append(card("بازگشت به فهرست شاعران","نمایش همهٔ نام‌ها",()=>{libraryMode="poets";activeAuthor="";renderLibrary();}));title.textContent=activeAuthor;renderItems(results,allItems().filter(x=>String(x.author||"").trim()===activeAuthor),"اثری پیدا نشد.");}
 else if(libraryMode==="topic"||libraryMode==="collection"){root.append(card("بازگشت به مرور موضوعی","نمایش طبقه‌ها و گنجینه",()=>{libraryMode="topics";activeTopic="";renderLibrary();}));}
 if(libraryMode!=="topic"&&libraryMode!=="collection"&&libraryMode!=="author")title.textContent=libraryMode==="poets"?"شاعران و نویسندگان":libraryMode==="collections"?"مجموعه‌های موضوعی":"مرور طبقه‌ها و موضوع‌ها";
}
function setupSearch(){
 const input=$("search");if(!input)return;
 const wrap=document.createElement("select");wrap.id="v15SearchMode";wrap.className="v15-search-mode";wrap.setAttribute("aria-label","نوع جست‌وجو");
 [["normal","جست‌وجوی معمولی"],["phrase","عبارت دقیق"],["line","مصراع یا بیت"],["author","نام شاعر"]].forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;wrap.append(o);});
 try{searchMode=localStorage.getItem("yes-v15-search-mode")||"normal";}catch(e){}
 wrap.value=searchMode;input.parentElement.append(wrap);
 const originalMatches=window.YESSearch.matches,originalScore=window.YESSearch.score;
 window.YESSearch.matches=function(item,query){
  const q=norm(query);if(!q)return true;
  const body=String(item.body||"").split(/\r?\n/).map(norm).filter(Boolean);
  if(searchMode==="author")return norm(item.author).includes(q);
  if(searchMode==="phrase")return norm(item.body).includes(q)||norm(item.title).includes(q);
  if(searchMode==="line"){
   if(body.some(line=>line===q))return true;
   for(let i=0;i<body.length-1;i++)if(body[i]+" "+body[i+1]===q)return true;
   return false;
  }
  return originalMatches(item,query);
 };
 window.YESSearch.score=function(item,query){
  if(searchMode==="author")return norm(item.author).includes(norm(query))?20:0;
  if(searchMode==="phrase")return norm(item.body).includes(norm(query))?20:0;
  if(searchMode==="line")return window.YESSearch.matches(item,query)?20:0;
  return originalScore(item,query);
 };
 wrap.addEventListener("change",()=>{searchMode=wrap.value;try{localStorage.setItem("yes-v15-search-mode",searchMode);}catch(e){}input.dispatchEvent(new Event("input",{bubbles:true}));});
 const help=document.createElement("small");help.className="v15-search-hint";help.textContent="عبارت دقیق: توالی واژه‌ها؛ مصراع یا بیت: یک سطر کامل یا دو سطر پیاپی؛ نام شاعر: جست‌وجو فقط در نام‌ها.";input.parentElement.insertAdjacentElement("afterend",help);
}
function setupLibrary(){
 const toolbar=document.querySelector("#regularView .toolbar");if(!toolbar)return;
 addButton(toolbar.querySelector("div:last-child"),"کتابخانهٔ موضوعی",()=>openLibrary("topics"),"tool-button v15-open-library");
 const view=document.createElement("section");view.id="v15LibraryView";view.className="v15-library-view";view.hidden=true;
 view.innerHTML='<button type="button" class="back" id="v15LibraryBack">← بازگشت به کتابخانه</button><header class="v15-library-head"><span>نسخهٔ ۱.۵</span><h2>کتابخانهٔ یک استکان شعر</h2><p>از راه موضوع، شاعر و مجموعه‌های پیشنهادی میان آثار جست‌وجو کنید.</p></header><nav id="v15LibraryTabs" class="v15-library-tabs" aria-label="راه‌های مرور کتابخانه"></nav><p id="v15LibraryStatus" class="v15-library-status"></p><div id="v15LibraryContent"></div><h3 id="v15LibraryTitle" class="v15-library-title"></h3><div id="v15LibraryResults" class="v15-library-results"></div>';
 $("regularView").insertAdjacentElement("afterend",view);
 $("v15LibraryBack").addEventListener("click",closeLibrary);
 const pinnedBack=$("backFromPinned");if(pinnedBack)pinnedBack.addEventListener("click",event=>{if(!returnToLibraryFromPinned)return;event.preventDefault();event.stopImmediatePropagation();returnToLibraryFromPinned=false;document.body.classList.add("library-open");setVisible("v15LibraryView");renderLibrary();window.scrollTo({top:0,behavior:"smooth"});},true);
}
function setupDock(){
 const dock=$("mobileDock");if(!dock)return;
 const bind=(action,handler)=>{const button=dock.querySelector('button[data-action="'+action+'"]');if(!button)return;button.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();handler();},true);};
 bind("home",()=>{document.body.classList.remove("library-open","reader-focus");focusMode=false;setVisible("regularView");window.scrollTo({top:0,behavior:"smooth"});});
 bind("library",()=>openLibrary("topics"));
 bind("search",()=>{closeLibrary();$("search")?.focus();$("search")?.scrollIntoView({behavior:"smooth",block:"center"});});
 const openNotebook=tab=>{closeLibrary();window.YESNotebook?.open();if(tab==="favorites")$("notebookTabs")?.querySelector("button")?.click();};
 bind("favorites",()=>openNotebook("favorites"));
 bind("notebook",()=>openNotebook("notebook"));
}
function setupReader(){
 const toolbar=document.querySelector("#readerView .reader-tools");if(!toolbar)return;
 addButton(toolbar,"تمرکز بر خواندن",()=>{focusMode=!focusMode;document.body.classList.toggle("reader-focus",focusMode);toast(focusMode?"حالت تمرکز فعال شد":"حالت تمرکز غیرفعال شد");},"v15-focus-toggle");
 const related=document.createElement("section");related.id="v15Related";related.className="v15-related";related.hidden=true;related.innerHTML="<h3>شعرهای هم‌موضوع</h3><div class='v15-related-items'></div>";
 $("readerView").append(related);
}
function updateRelated(id){
 const item=window.YESContent?.get(id)||allItems().find(x=>x.id===id),root=$("v15Related .v15-related-items");if(!item||!root)return;
 const candidates=allItems().filter(x=>x.id!==id&&((item.category2&&x.category2===item.category2)||(item.author&&x.author===item.author)||(item.tags||[]).some(t=>(x.tags||[]).includes(t))));
 root.replaceChildren();candidates.slice(0,6).forEach(x=>root.append(makeWorkButton(x)));
 $("v15Related").hidden=!candidates.length;
}
window.addEventListener("yes:route",event=>{const s=event.detail||{};if(s.route==="read"&&s.id){document.body.classList.remove("library-open");setVisible("readerView");setTimeout(()=>updateRelated(decodeURIComponent(s.id)),0);}else if(s.route==="home"){document.body.classList.remove("reader-focus");focusMode=false;if(document.body.classList.contains("library-open"))setVisible("v15LibraryView");else setVisible("regularView");}});
window.addEventListener("yes:archive-loaded",()=>{if(libraryMode==="poets"||libraryMode==="topics"||libraryMode==="collections")renderLibrary();});
window.addEventListener("yes:archive-manifest-loaded",()=>{if($("v15LibraryView")&&!$("v15LibraryView").hidden&&libraryMode==="topics")renderLibrary();});
window.addEventListener("yes:web-poems-loaded",()=>{if(libraryMode!=="topics"&&$("v15LibraryView")&&!$("v15LibraryView").hidden)renderLibrary();});
document.addEventListener("DOMContentLoaded",()=>{
 setupSearch();setupLibrary();setupReader();setupDock();
});
})();