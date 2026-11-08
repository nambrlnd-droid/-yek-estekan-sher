/* Dedicated, deep-linkable reader for poems and pinned texts. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  let currentId=null,fontSize=19;
  const content=()=>window.YESContent;
  const items=()=>content().all;
  const notify=s=>{const n=$("readerStatus");if(n)n.textContent=s;};
  const textOf=x=>x.body+(x.author?"\n— "+x.author:"");
  async function favoriteState(id){try{return !!(await window.YESStorage.get("favorites",id));}catch(e){return false;}}
  async function toggleFavorite(){
    if(!currentId)return;
    const old=await favoriteState(currentId);
    const item=content().get(currentId);
    try{
      if(old)await window.YESStorage.remove("favorites",currentId);
      else await window.YESStorage.put("favorites",{id:currentId,contentId:currentId,itemSnapshot:item||null,createdAt:new Date().toISOString()});
      $("readerFavorite").textContent=old?"♡ نشان‌کردن":"♥ نشان‌شده";
      notify(old?"از علاقه‌مندی‌ها برداشته شد":"به علاقه‌مندی‌ها افزوده شد");
    }catch(e){notify("ذخیرهٔ علاقه‌مندی در این مرورگر ممکن نشد");}
  }
  async function render(id){
    let item=content().get(id);
    if(!item){
      try{const saved=JSON.parse(localStorage.getItem("yes-reader-last-item")||"null");if(saved&&saved.id===id&&saved.item){content().all.push(saved.item);item=saved.item;}}catch(e){}
    }
    if(!item){document.body.classList.remove("reader-open");$("readerView").hidden=true;notify("این اثر پیدا نشد.");return;}
    currentId=id;
    try{localStorage.setItem("yes-reader-last-item",JSON.stringify({id,item}));}catch(e){}
    document.body.classList.add("reader-open");
    $("readerView").hidden=false;
    $("readerTitle").textContent=item.title||"خواندن";
    $("readerBody").textContent=item.body;
    $("readerBody").style.fontSize=fontSize+"px";
    const authorNode=$("readerAuthor");authorNode.replaceChildren();authorNode.hidden=!item.author;
    if(item.author){authorNode.append(document.createTextNode("— "));const authorLink=document.createElement("a");authorLink.textContent=item.author;authorLink.href="#/poet/"+encodeURIComponent(item.author);authorLink.setAttribute("aria-label","مشاهدهٔ صفحهٔ شاعر "+item.author);authorNode.append(authorLink);}
    $("readerKicker").textContent=item.type==="text"?"متن برگزیده":"از کتابخانهٔ اشعار";
    const tags=$("readerTags");tags.replaceChildren();
    (Array.isArray(item.tags)?item.tags:[]).forEach(tag=>{const span=document.createElement("span");span.textContent=tag;tags.append(span);});
    const metadata=$("readerMetadata");metadata.replaceChildren();
    [["طبقهٔ اصلی",item.category1],["موضوع",item.category2],["زیرموضوع",item.category3]].forEach(([label,value])=>{if(value){const span=document.createElement("span");span.textContent=label+" · "+value;metadata.append(span);}});
    const prosodyRoot=$("readerProsody"),prosodyDetails=$("readerProsodyDetails");
    if(prosodyRoot&&prosodyDetails){
      prosodyRoot.hidden=false;prosodyDetails.replaceChildren();
      let profile=null;try{profile=await window.YESStorage.get("prosodyReview",id);}catch(e){}
      if(!profile&&window.YESProsody)profile=window.YESProsody.analyze(item);
      const grid=document.createElement("div");grid.className="reader-prosody-grid";
      const verified=profile?.status==="confirmed";
      const rows=[["ساختار",profile?.poemType==="couplet"?"دو مصراعی":profile?.poemType==="multi-line"?"چندمصراعی":profile?.poemType==="single-line"?"تک‌مصراعی":"قطعه / ناقص"],["تعداد مصراع",String(profile?.lineCount??"—")],["وزن",verified?(profile.meter||"ثبت نشده"):"تأیید نشده"],["بحر",verified?(profile.bahr||"ثبت نشده"):"تأیید نشده"],["قافیهٔ پیشنهادی · اطمینان پایین",profile?.rhyme||"نیازمند بررسی"],["ردیف پیشنهادی · اطمینان پایین",profile?.radif||"نیازمند بررسی"],["وضعیت",verified?"بازبینی انسانی ثبت شده":"در انتظار بازبینی"]];
      rows.forEach(([label,value])=>{const span=document.createElement("span");span.textContent=label+" · "+value;grid.append(span);});
      if(Array.isArray(profile?.lines)&&profile.lines.length){const syllables=document.createElement("span");syllables.textContent="برآورد هجای نوشتاری هر مصراع · "+profile.lines.map(x=>x.syllableEstimate).join(" / ");grid.append(syllables);}
      prosodyDetails.append(grid);
      $("readerProsodyMeter").value=profile?.meter||"";
      $("readerProsodyBahr").value=profile?.bahr||"";
      $("readerProsodyArkan").value=profile?.arkan||"";
      $("readerProsodyScansion").value=profile?.scansion||"";
      $("readerProsodyReviewerNote").value=profile?.reviewerNote||"";
      $("readerProsodyVerified").checked=false;
      $("readerProsodyReviewStatus").textContent=verified?"بازبینی محلی ذخیره شده است؛ این داده هنوز به سرور یا نسخهٔ عمومی منتقل نشده.":"برای ثبت نتیجه، متن و تلفظ را بررسی و گزینهٔ تأیید را فعال کنید.";
      $("readerProsodyReviewForm").hidden=true;
    }
    const relatedRoot=$("readerRelated"),relatedItems=$("readerRelatedItems");
    if(relatedRoot&&relatedItems&&window.YESAdvancedSearch?.similar){
      relatedItems.replaceChildren();
      const related=window.YESAdvancedSearch.similar(item,items(),4);
      related.forEach(({item:match,reason})=>{
        const button=document.createElement("button");button.type="button";button.className="reader-related-item";
        const title=document.createElement("strong");title.textContent=match.title||String(match.body||"").split("\n")[0]||"اثر مشابه";
        const meta=document.createElement("span");meta.textContent=[match.author,reason].filter(Boolean).join(" · ");
        button.append(title,meta);button.addEventListener("click",()=>window.YESReader.open(match.id));relatedItems.append(button);
      });
      relatedRoot.hidden=related.length===0;
    }
    $("readerFavorite").textContent=await favoriteState(id)?"♥ نشان‌شده":"♡ نشان‌کردن";
    try{const note=await window.YESStorage.get("notes",id);$("readerNote").value=note?.text||"";}catch(e){$("readerNote").value="";}
    const list=items(),index=list.findIndex(x=>x.id===id);
    $("readerPrevious").disabled=index<=0;
    $("readerNext").disabled=index<0||index>=list.length-1;
    $("readerPrevious").style.opacity=index<=0?".45":"1";
    $("readerNext").style.opacity=index>=list.length-1?".45":"1";
    try{await window.YESReader.remember(id);}catch(e){notify("اثر باز شد؛ ثبت سابقه در این مرورگر ممکن نشد.");}
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function goRelative(delta){
    const list=items(),index=list.findIndex(x=>x.id===currentId),next=list[index+delta];
    if(next)window.YESRouter.go("read",next.id);
  }
  function copy(){
    const item=content().get(currentId);if(!item)return;
    const value=textOf(item);
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>notify("متن کپی شد")).catch(()=>notify("کپی در این مرورگر در دسترس نیست"));
    else notify("قابلیت کپی در این مرورگر در دسترس نیست");
  }
  function share(){
    const item=content().get(currentId);if(!item)return;
    const value=textOf(item);
    if(navigator.share)navigator.share({title:item.title||"یک استکان شعر",text:value,url:location.href}).catch(()=>{});
    else copy();
  }
  window.YESReader={
    open(id){if(!content().get(id))return false;window.YESRouter.go("read",id);return true;},
    async remember(id){if(!content().get(id))return;await window.YESStorage.put("history",{id,contentId:id,itemSnapshot:content().get(id),readAt:new Date().toISOString()});},
    async saveNote(contentId,text){if(!content().get(contentId))throw new Error("اثر پیدا نشد");await window.YESStorage.put("notes",{id:contentId,contentId,itemSnapshot:content().get(contentId),text:String(text),updatedAt:new Date().toISOString()});}
  };
  window.addEventListener("yes:route",event=>{
    const state=event.detail||{};
    if(state.route==="read"&&state.id)render(decodeURIComponent(state.id));
    else{document.body.classList.remove("reader-open");if($("readerView"))$("readerView").hidden=true;}
  });
  document.addEventListener("DOMContentLoaded",()=>{
    $("readerBack").onclick=()=>window.YESRouter.go("home");
    $("readerFavorite").onclick=toggleFavorite;
    $("readerCopy").onclick=copy;$("readerShare").onclick=share;
    $("readerSmaller").onclick=()=>{fontSize=Math.max(14,fontSize-1);$("readerBody").style.fontSize=fontSize+"px";};
    $("readerLarger").onclick=()=>{fontSize=Math.min(30,fontSize+1);$("readerBody").style.fontSize=fontSize+"px";};
    $("readerPrevious").onclick=()=>goRelative(-1);$("readerNext").onclick=()=>goRelative(1);
    $("readerSaveNote").onclick=async()=>{try{await window.YESReader.saveNote(currentId,$("readerNote").value);notify("یادداشت ذخیره شد");}catch(e){notify("ذخیرهٔ یادداشت ممکن نشد");}};
    $("readerProsodyReviewToggle").onclick=()=>{$("readerProsodyReviewForm").hidden=!$("readerProsodyReviewForm").hidden;};
    $("readerProsodySave").onclick=async()=>{
      const meter=$("readerProsodyMeter").value.trim(),bahr=$("readerProsodyBahr").value.trim(),arkan=$("readerProsodyArkan").value.trim(),scansion=$("readerProsodyScansion").value.trim();
      if(!$("readerProsodyVerified").checked){$("readerProsodyReviewStatus").textContent="برای ثبت به‌عنوان تأییدشده، ابتدا بازبینی شخصی را تأیید کنید.";return;}
      if(!meter||!bahr||!arkan||!scansion){$("readerProsodyReviewStatus").textContent="ثبت وزن، بحر، ارکان و تقطیع برای تأیید الزامی است.";return;}
      try{
        const previous=await window.YESStorage.get("prosodyReview",currentId)||window.YESProsody.analyze(content().get(currentId));
        const record={...previous,id:currentId,status:"confirmed",confidence:"human-reviewed",meter,bahr,arkan,scansion,reviewerNote:$("readerProsodyReviewerNote").value.trim(),reviewedAt:new Date().toISOString(),reviewer:"بازبینی محلی",reviewReasons:[]};
        await window.YESStorage.put("prosodyReview",record);
        const item=content().get(currentId);if(item){item.prosody=record;if(Number.isInteger(item.legacyIndex)&&window.poemEntries?.[item.legacyIndex])window.poemEntries[item.legacyIndex].prosody=record;}
        $("readerProsodyReviewStatus").textContent="نتیجهٔ بازبینی در همین مرورگر ذخیره شد؛ برای جست‌وجوی وزن در این نشست قابل استفاده است.";
        window.dispatchEvent(new CustomEvent("yes:prosody-updated",{detail:{id:currentId,record}}));
        notify("بازبینی عروضی ذخیره شد");
      }catch(error){$("readerProsodyReviewStatus").textContent="ذخیرهٔ بازبینی ممکن نشد: "+String(error?.message||error);}
    };
    $("readerAddCollection").onclick=async()=>{try{const cols=await window.YESStorage.all("collections");if(!cols.length){notify("ابتدا در دفتر شخصی یک مجموعه بسازید");return;}const choice=prompt("شناسهٔ مجموعه را وارد کنید:\n"+cols.map(c=>c.id+" — "+c.title).join("\n"));const col=cols.find(c=>c.id===choice);if(!col){notify("مجموعه پیدا نشد");return;}col.itemIds=col.itemIds||[];if(!col.itemIds.includes(currentId))col.itemIds.push(currentId);col.itemSnapshots=col.itemSnapshots||{};col.itemSnapshots[currentId]=content().get(currentId);await window.YESStorage.put("collections",col);notify("به مجموعه افزوده شد");}catch(e){notify("افزودن به مجموعه ممکن نشد");}};
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("reader-open")){if(window.YESPages?.backFromReader)window.YESPages.backFromReader();else window.YESRouter.go("home");}});
  },{once:true});
})();