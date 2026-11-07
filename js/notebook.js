/* Personal notebook: favorites, reading history, notes, collections and JSON backup. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let tab="favorites",activeCollection=null;
const content=()=>window.YESContent;
const toast=s=>{const n=$("toast");n.textContent=s;n.classList.add("show");setTimeout(()=>n.classList.remove("show"),1800)};
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
async function migrateLegacy(){
 try{
  if(localStorage.getItem("yes-v13-favorites-migrated")==="1")return;
  const old=JSON.parse(localStorage.getItem("yekestekan-favorites")||"[]");
  for(const key of old){
   const m=/^(poem|pinned)-(\d+)$/.exec(String(key));if(!m)continue;
   const list=m[1]==="poem"?content().poems:content().pinned;
   const item=list[Number(m[2])];if(item)await YESStorage.put("favorites",{id:item.id,contentId:item.id,itemSnapshot:item,createdAt:new Date().toISOString(),migrated:true});
  }
  localStorage.setItem("yes-v13-favorites-migrated","1");
 }catch(e){toast("انتقال علاقه‌مندی‌های قدیمی کامل نشد؛ دادهٔ قبلی دست‌نخورده باقی ماند.");}
}
function open(){document.body.classList.add("notebook-open");$("notebookView").hidden=false;$("regularView").hidden=true;$("pinnedView").hidden=true;$("readerView").hidden=true;window.scrollTo({top:0,behavior:"smooth"});render();}
function close(){document.body.classList.remove("notebook-open");$("notebookView").hidden=true;YESRouter.go("home");}
async function render(){
 const root=$("notebookItems");root.replaceChildren();
 const tabs=[["favorites","علاقه‌مندی‌ها"],["history","تاریخچه"],["notes","یادداشت‌ها"],["collections","مجموعه‌های من"]];
 const nav=$("notebookTabs");nav.replaceChildren();
 tabs.forEach(([id,label])=>{const b=node("button",id===tab?"active":"",label);b.onclick=()=>{tab=id;activeCollection=null;render();};nav.append(b);});
 if(tab==="collections"){
  const create=node("div","notebook-create");const input=node("input");input.placeholder="نام مجموعهٔ تازه";
  const btn=node("button","tool-button","ساخت مجموعه");btn.onclick=async()=>{const title=input.value.trim();if(!title)return toast("نام مجموعه را بنویسید");const id="collection-"+Date.now();await YESStorage.put("collections",{id,title,itemIds:[],createdAt:new Date().toISOString()});input.value="";render();};create.append(input,btn);root.append(create);
  const cols=await YESStorage.all("collections");
  if(activeCollection){const c=cols.find(x=>x.id===activeCollection);const back=node("button","back","بازگشت به مجموعه‌ها");back.onclick=()=>{activeCollection=null;render()};root.append(back);if(c){const title=node("h3","notebook-heading",c.title);root.append(title);for(const id of c.itemIds||[])appendItem(root,content().get(id),true,async()=>{c.itemIds=c.itemIds.filter(x=>x!==id);await YESStorage.put("collections",c);render();});}}
  else cols.forEach(c=>{const row=node("div","notebook-row");const b=node("button","notebook-row-title",c.title+" · "+(c.itemIds||[]).length+" اثر");b.onclick=()=>{activeCollection=c.id;render();};const del=node("button","action","حذف");del.onclick=async()=>{if(confirm("این مجموعه حذف شود؟ آثار اصلی حذف نمی‌شوند.")){await YESStorage.remove("collections",c.id);render();}};row.append(b,del);root.append(row);});
  return;
 }
 let records=await YESStorage.all(tab);records.sort((a,b)=>new Date(b.readAt||b.updatedAt||b.createdAt||0)-new Date(a.readAt||a.updatedAt||a.createdAt||0));
 if(tab==="favorites")records=records.map(x=>({...x,contentId:x.contentId||x.id}));
 if(tab==="history")records=records.filter(x=>content().get(x.contentId||x.id));
 if(tab==="notes")records=records.filter(x=>content().get(x.contentId||x.id));
 if(!records.length){root.append(node("div","empty","هنوز موردی در این بخش ثبت نشده است."));return;}
 for(const rec of records){const id=rec.contentId||rec.id,item=content().get(id);if(!item)continue;
  if(tab==="notes"){const wrap=node("article","notebook-note");wrap.append(node("strong","",item.title),node("p","",rec.text||""));const edit=node("button","action","ویرایش یادداشت");edit.onclick=()=>{const area=node("textarea");area.value=rec.text||"";const save=node("button","tool-button","ذخیره");save.onclick=async()=>{await YESReader.saveNote(id,area.value);render();toast("یادداشت ذخیره شد");};wrap.append(area,save);};wrap.append(edit);root.append(wrap);}
  else appendItem(root,item,tab==="favorites",async()=>{if(tab==="favorites")await YESStorage.remove("favorites",id);else await YESStorage.remove("history",id);render();});
 }
}
function appendItem(root,item,remove,removeFn){
 if(!item)return;const card=node("article","notebook-row");const openBtn=node("button","notebook-row-title",item.title);openBtn.onclick=()=>YESReader.open(item.id);const meta=node("span","notebook-meta",(item.author||"بدون نام")+(item.tags?.length?" · "+item.tags.slice(0,2).join("، "):""));const actions=node("div","notebook-actions");actions.append(meta);if(remove){const b=node("button","action","برداشتن");b.onclick=removeFn;actions.append(b);}card.append(openBtn,actions);root.append(card);
}
async function backup(){
 const data={format:"yek-estekan-sher-notebook",version:1,exportedAt:new Date().toISOString(),favorites:await YESStorage.all("favorites"),notes:await YESStorage.all("notes"),history:await YESStorage.all("history"),collections:await YESStorage.all("collections"),settings:await YESStorage.all("settings")};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="yek-estekan-sher-backup.json";a.click();URL.revokeObjectURL(url);toast("نسخهٔ پشتیبان آماده شد");
}
async function restore(file){
 try{const data=JSON.parse(await file.text());if(data.format!=="yek-estekan-sher-notebook")throw Error("فرمت فایل معتبر نیست");
  for(const store of ["favorites","notes","history","collections","settings"])for(const item of (Array.isArray(data[store])?data[store]:[])){if(!item.id)continue;if(["favorites","notes","history"].includes(store)&&!content().get(item.contentId||item.id))continue;await YESStorage.put(store,item);}
  toast("بازیابی اطلاعات انجام شد");render();
 }catch(e){toast("فایل پشتیبان معتبر نیست یا بازیابی نشد");}
}
window.YESNotebook={open,render,migrateLegacy};
document.addEventListener("DOMContentLoaded",()=>{
 $("openNotebook").onclick=open;$("notebookBack").onclick=close;
 $("backupNotebook").onclick=backup;$("restoreNotebook").onclick=()=>$("restoreFile").click();
 $("restoreFile").onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value="";};
 migrateLegacy();
});
})();
