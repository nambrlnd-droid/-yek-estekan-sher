/* Version 1.4: bounded, randomized discovery. Only the selected 10-50 cards are rendered. */
(function(){
"use strict";
window.__YES_DISCOVERY_ACTIVE=true;
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat("fa-IR").format(n);
let section="poems",generation=0,randomMode=true,selectedIds=new Set(),currentScope="";
const normalize=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[\u200c\u200d\u200e\u200f]/g," ").replace(/\s+/g," ").trim().toLowerCase();
const sample=(list,n)=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);};
const count=()=>Number($("displayCount")?.value||10);
function notify(s){const node=$("toast");if(!node)return;node.textContent=s;node.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.classList.remove("show"),1900);}
function setStatus(s){const n=$("displayStatus");if(n)n.textContent=s;}
function waitForManifest(){if(window.YESArchive?.manifestData)return Promise.resolve();return new Promise(resolve=>{const done=()=>{window.removeEventListener("yes:archive-manifest-loaded",done);resolve();};window.addEventListener("yes:archive-manifest-loaded",done,{once:true});setTimeout(resolve,12000);});}
function fillSelect(id,values,label){const node=$(id),old=node.value;node.replaceChildren();const first=document.createElement("option");first.value="";first.textContent=label;node.append(first);[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fa")).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;node.append(o);});if([...node.options].some(o=>o.value===old))node.value=old;}
function refreshFilters(){
 const all=window.poemEntries||[];
 const archive=(window.YESArchive?.categories()||[]).map(x=>x.name);
 const sectionItems=all.filter(x=>section==="texts"?x.section==="texts":x.section!=="texts"&&x.type!=="text");
 fillSelect("category1Filter",[...sectionItems.map(x=>x.category1),...(section==="poems"?["عمومی"]:[])],"همهٔ طبقات اصلی");
 const c1=$("category1Filter").value;
 fillSelect("category2Filter",[...sectionItems.filter(x=>!c1||x.category1===c1).map(x=>x.category2),...(section==="poems"&&(!c1||c1==="عمومی")?archive:[])],"همهٔ موضوعات");
 const c2=$("category2Filter").value;
 fillSelect("category3Filter",sectionItems.filter(x=>(!c1||x.category1===c1)&&(!c2||x.category2===c2)).map(x=>x.category3),"همهٔ زیرموضوعات");
 fillSelect("authorFilter",sectionItems.map(x=>x.author),"همهٔ شاعران");
}
function isArchiveCategory(name){return !!name&&!!window.YESArchive?.isArchiveCategory(name);}
async function archiveSample(limit){try{return window.YESArchive?.randomItems?await window.YESArchive.randomItems(limit):[];}catch(error){setStatus("گنجینهٔ برخط موقتاً در دسترس نیست؛ از آثار بارگذاری‌شده استفاده می‌شود.");return [];}}
function dedupe(list){
 const seen=new Set();return list.filter(x=>{const body=normalize(x.body).replace(/[\p{P}\p{S}]/gu,"");const key=body;if(!body||seen.has(key))return false;seen.add(key);return true;});
}
function filters(){return {q:$("search").value.trim(),author:$("authorFilter").value,credit:$("creditFilter").value,c1:$("category1Filter").value,c2:$("category2Filter").value,c3:$("category3Filter").value};}
function filterList(list,f){
 return list.filter(x=>{
  const isText=x.section==="texts"||x.type==="text";
  if(section==="texts"&&!isText)return false;
  if(section==="poems"&&isText)return false;
  if(f.c1&&x.category1!==f.c1)return false;
  if(f.c2&&normalize(x.category2)!==normalize(f.c2))return false;
  if(f.c3&&normalize(x.category3)!==normalize(f.c3))return false;
  if(f.author&&x.author!==f.author)return false;
  if(f.credit==="known"&&!x.author)return false;
  if(f.credit==="unknown"&&x.author)return false;
  return !f.q||window.YESSearch.matches(x,f.q);
 });
}
function makeCard(item,index){
 const card=document.createElement("article");card.className="entry";card.dataset.poemId=String(item.id||"");
 const cat=document.createElement("div");cat.className="category";cat.textContent=[item.category1,item.category2,item.category3].filter(Boolean).join(" · ");
 const body=document.createElement("div");body.className="verse";body.textContent=item.body;body.tabIndex=0;body.setAttribute("role","button");body.setAttribute("aria-label","باز کردن اثر در صفحهٔ مطالعه");body.addEventListener("click",()=>window.YESReader.open(item.id));body.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();window.YESReader.open(item.id);}});
 card.append(cat,body);
 if(item.author){const author=document.createElement("div");author.className="author";author.textContent="— "+item.author;card.append(author);}
 const bar=document.createElement("div");bar.className="card-actions";
 const copy=document.createElement("button");copy.className="action";copy.textContent="کپی متن";copy.onclick=()=>{const text=item.body+(item.author?"\n— "+item.author:"");navigator.clipboard?.writeText(text).then(()=>notify("متن کپی شد")).catch(()=>notify("کپی در این مرورگر در دسترس نیست"));};bar.append(copy);
 const fav=document.createElement("button");fav.className="action favorite";fav.textContent="♡ نشان‌کردن";let favoriteTouched=false;window.YESStorage.get("favorites",item.id).then(saved=>{if(saved&&!favoriteTouched){fav.textContent="♥ نشان‌شده";fav.classList.add("on");}}).catch(()=>{});fav.onclick=async()=>{favoriteTouched=true;try{const old=await window.YESStorage.get("favorites",item.id);if(old)await window.YESStorage.remove("favorites",item.id);else await window.YESStorage.put("favorites",{id:item.id,contentId:item.id,itemSnapshot:item,createdAt:new Date().toISOString()});fav.textContent=old?"♡ نشان‌کردن":"♥ نشان‌شده";fav.classList.toggle("on",!old);notify(old?"از علاقه‌مندی‌ها برداشته شد":"به علاقه‌مندی‌ها افزوده شد");}catch(e){notify("ذخیره‌سازی در مرورگر در دسترس نیست");}};bar.append(fav);
 const share=document.createElement("button");share.className="action";share.textContent="اشتراک‌گذاری";share.onclick=()=>{const text=item.body+(item.author?"\n— "+item.author:"");if(navigator.share)navigator.share({title:item.title||"یک استکان شعر",text}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>notify("متن کپی شد"));};bar.append(share);card.append(bar);return card;
}
async function getPool(f,limit){
 await waitForManifest();
 const all=window.poemEntries||[];
 if(f.q&&section==="poems"&&window.YESArchive?.loadAll)await window.YESArchive.loadAll();
 else if(f.c2&&isArchiveCategory(f.c2)){await window.YESArchive.loadCategory(f.c2);refreshFilters();}
 const source=(f.c2&&isArchiveCategory(f.c2))?(window.YESArchive.items(f.c2)||[]):all;
 let matches=dedupe(filterList(source,f));let totalMatches=matches.length;
 if(!f.q&&randomMode&&!f.c2&&f.c1==="عمومی"&&section==="poems"&&window.YESArchive?.randomItems){
  const archiveItems=await archiveSample(limit*5);
  matches=dedupe(filterList([...archiveItems,...all],f));
  totalMatches=window.YESArchive.manifestData?.total||matches.length;
 }
 if(!f.q&&randomMode){
  if(!f.c1&&!f.c2&&!f.c3&&!f.author&&!f.credit&&section==="poems"&&window.YESArchive?.randomItems){
   const random=await archiveSample(limit*5);
   const local=sample((window.poemEntries||[]).filter(x=>x.section==="poems"),limit);
   matches=dedupe([...random,...local]);totalMatches=window.YESArchive.manifestData?.total||matches.length;
  }else matches=sample(matches,limit);
 }else if(f.q){matches.sort((a,b)=>window.YESSearch.score(b,f.q)-window.YESSearch.score(a,f.q));matches=matches.slice(0,limit);}
 else matches=sample(matches,limit);
 if(f.c2&&isArchiveCategory(f.c2)&&!f.q){const meta=window.YESArchive.categories().find(x=>normalize(x.name)===normalize(f.c2));if(meta)totalMatches=meta.count;}
 const scope=JSON.stringify([section,f.c1,f.c2,f.c3,f.author,f.credit,f.q]);
 if(scope!==currentScope){currentScope=scope;selectedIds.clear();}
 if(!f.q&&randomMode){
  const fresh=matches.filter(x=>!selectedIds.has(String(x.id)));
  const prior=matches.filter(x=>selectedIds.has(String(x.id)));
  matches=fresh.length>=limit?sample(fresh,limit):[...sample(fresh,fresh.length),...sample(prior,limit-fresh.length)];
 }else matches=matches.slice(0,limit);
 selectedIds.clear();matches.forEach(x=>selectedIds.add(String(x.id)));
 return {items:matches.slice(0,limit),total:totalMatches};
}
async function render(){
 const token=++generation,limit=count(),f=filters(),root=$("entries");
 root.replaceChildren();$("loadMore").hidden=true;$("empty").hidden=true;
 $("sectionTitle").textContent=section==="poems"?"اشعار":"متون و نوشته‌ها";
 $("sectionNote").textContent=f.c2?("گزیده‌ای تصادفی از موضوع «"+f.c2+"»"):("در هر نوبت حداکثر "+fmt(limit)+" اثر نمایش داده می‌شود؛ برای دیدن مجموعهٔ تازه، دکمهٔ تازه‌سازی را بزنید.");
 setStatus("در حال انتخاب "+fmt(limit)+" اثر از کتابخانه…");
 try{
  const result=await getPool(f,limit);if(token!==generation)return;
  result.items.forEach((item,i)=>root.append(makeCard(item,i)));
  $("empty").hidden=result.items.length!==0;
  $("searchSummary").textContent=f.q?fmt(result.total)+" اثر با این عبارت و فیلترها پیدا شد؛ در این نوبت "+fmt(result.items.length)+" اثر نمایش داده می‌شود.":"";
  setStatus(fmt(result.items.length)+" اثر از "+fmt(result.total)+" اثر واجد شرایط نمایش داده شد.");
 }catch(error){if(token!==generation)return;setStatus("دریافت اشعار ممکن نشد؛ اتصال را بررسی و دوباره تلاش کنید.");$("empty").hidden=false;notify("بارگذاری اشعار ناموفق بود.");}
}
function changeSection(next){section=next;document.querySelectorAll("#sections button").forEach(b=>b.classList.toggle("active",b.dataset.section===section));["category1Filter","category2Filter","category3Filter","authorFilter","creditFilter"].forEach(id=>$(id).value="");$("search").value="";randomMode=true;refreshFilters();render();}
function intercept(target,type,handler){const node=typeof target==="string"?$(target):target;if(!node)return;node.addEventListener(type,e=>{e.stopImmediatePropagation();e.preventDefault?.();handler(e);},true);}
document.addEventListener("DOMContentLoaded",()=>{
 $("loadMore").hidden=true;
 const controls=document.createElement("div");controls.className="display-controls";controls.id="displayControls";
 controls.innerHTML='<label for="displayCount">تعداد شعر در هر نوبت</label><select id="displayCount" aria-label="تعداد شعرهای قابل نمایش"><option value="10" selected>۱۰ شعر</option><option value="20">۲۰ شعر</option><option value="30">۳۰ شعر</option><option value="40">۴۰ شعر</option><option value="50">۵۰ شعر</option></select><button id="refreshEntries" class="tool-button" type="button">↻ نمایش اشعار تازه</button><span id="displayStatus" role="status" aria-live="polite">در هر نوبت فقط بخشی از کتابخانه نمایش داده می‌شود.</span>';
 $("topics").insertAdjacentElement("afterend",controls);
 try{const saved=Number(localStorage.getItem("yes-v14-display-count"));if([10,20,30,40,50].includes(saved))$("displayCount").value=String(saved);}catch(e){}
 $("displayCount").addEventListener("change",()=>{randomMode=true;try{localStorage.setItem("yes-v14-display-count",String(count()));}catch(e){}render();});
 $("refreshEntries").addEventListener("click",()=>{randomMode=true;render();});
 document.querySelectorAll("#sections button").forEach(b=>intercept(b,"click",()=>changeSection(b.dataset.section)));
 ["search","authorFilter","creditFilter","category1Filter","category2Filter","category3Filter"].forEach(id=>intercept(id,id==="search"?"input":"change",()=>{randomMode=!$("search").value.trim();refreshFilters();render();}));
 intercept("randomPoem","click",()=>{
  const openOne=()=>{const cards=[...$("entries").querySelectorAll(".entry[data-poem-id]")];if(!cards.length)return false;const card=cards[Math.floor(Math.random()*cards.length)];return window.YESReader.open(card.dataset.poemId);};
  if(!openOne()){randomMode=true;render().then(openOne);}
 });
 window.addEventListener("yes:archive-manifest-loaded",refreshFilters);
 window.addEventListener("yes:web-poems-loaded",()=>{refreshFilters();render();});
 window.addEventListener("yes:archive-loaded",()=>{if(filters().c2||filters().c1||filters().q)render();});
 refreshFilters();render();
});
})();