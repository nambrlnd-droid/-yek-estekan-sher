/* V1.8 Stage 4 — composable literary search filters. */
(function(){
"use strict";
const state={type:"",meter:"",rhyme:"",radif:"",reviewStatus:"",taxonomyStatus:""};let statusNode=null,archiveAnalysisStarted=false;
const types=[["","همهٔ قالب‌ها"],["couplet","دو مصراعی"],["multi-line","چندمصراعی"],["single-line","تک‌مصراعی"],["fragment","قطعه / متن ناقص"]];
function setStatus(message){if(statusNode)statusNode.textContent=message;}
function node(tag,attrs,text){const n=document.createElement(tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;}
function mount(){
 const anchor=document.querySelector(".search-filters");if(!anchor||document.getElementById("prosodyFilters"))return;
 const panel=node("div",{id:"prosodyFilters","class":"prosody-filters"});
 const type=node("select",{id:"prosodyTypeFilter","aria-label":"نوع شعر"});
 types.forEach(([v,t])=>type.append(node("option",{value:v},t)));
 const meter=node("input",{id:"prosodyMeterFilter",type:"search",placeholder:"وزن یا بحر (فقط تأییدشده)","aria-label":"جست‌وجو بر اساس وزن یا بحر"});
 const rhyme=node("input",{id:"prosodyRhymeFilter",type:"search",placeholder:"قافیهٔ پیشنهادی","aria-label":"قافیهٔ پیشنهادی"});
 const radif=node("input",{id:"prosodyRadifFilter",type:"search",placeholder:"ردیف پیشنهادی","aria-label":"ردیف پیشنهادی"});
 const review=node("select",{id:"prosodyReviewFilter","aria-label":"وضعیت بازبینی عروضی"});
 [["","همهٔ وضعیت‌های عروضی"],["review_required","نیازمند بازبینی عروضی"],["confirmed","دارای بازبینی انسانی"]].forEach(([v,t])=>review.append(node("option",{value:v},t)));
 const taxonomy=node("select",{id:"taxonomyReviewFilter","aria-label":"وضعیت بازبینی دسته‌بندی"});
 [["","همهٔ وضعیت‌های دسته‌بندی"],["review","نیازمند بازبینی موضوعی"],["human-reviewed","بازبینی انسانی‌شده"],["high","اطمینان زیاد"],["medium","اطمینان متوسط"]].forEach(([v,t])=>taxonomy.append(node("option",{value:v},t)));
 statusNode=node("small",{id:"prosodySearchStatus","aria-live":"polite"},"قافیه و ردیف فعلاً پیشنهاد ماشینی‌اند؛ وزن/بحر فقط پس از تأیید قابل جست‌وجوست.");
 panel.append(type,meter,rhyme,radif,review,taxonomy,statusNode);anchor.after(panel);
 const changed=()=>{state.type=type.value;state.meter=meter.value.trim();state.rhyme=rhyme.value.trim();state.radif=radif.value.trim();state.reviewStatus=review.value;state.taxonomyStatus=taxonomy.value;window.dispatchEvent(new Event("yes:advanced-search-change"));};
 [type,meter,rhyme,radif,review,taxonomy].forEach(n=>n.addEventListener("input",changed));
}
function matches(item){
 if(!state.type&&!state.meter&&!state.rhyme&&!state.radif&&!state.reviewStatus&&!state.taxonomyStatus)return true;
 const p=item?.prosody||window.YESProsody?.analyze(item);if(!p)return false;
 if(state.reviewStatus&&p.status!==state.reviewStatus)return false;
 if(state.taxonomyStatus==="review"&&!item?.taxonomyReview)return false;
 if(state.taxonomyStatus==="human-reviewed"&&item?.taxonomyConfidence!=="human-reviewed")return false;
 if((state.taxonomyStatus==="high"||state.taxonomyStatus==="medium")&&item?.taxonomyConfidence!==state.taxonomyStatus)return false;
 if(state.type&&p.poemType!==state.type)return false;
 if(state.meter){
  if(!["confirmed","external_source_matched"].includes(p.status)||!p.meter&&!p.bahr)return false;
  const value=window.YESSearch?.normalize([p.meter,p.bahr].join(" "))||"";
  if(!value.includes(window.YESSearch.normalize(state.meter)))return false;
 }
 const norm=window.YESSearch?.normalize|| (x=>String(x||"").toLowerCase());
 if(state.rhyme&&!norm(p.rhyme||"").includes(norm(state.rhyme)))return false;
 if(state.radif&&!norm(p.radif||"").includes(norm(state.radif)))return false;
 return true;
}
function getState(){return {...state};}
function similar(item,items,limit=5){
 const topics=x=>[x.category1,x.category2,x.category3,...(x.taxonomyTopics||[]),...(x.category2Alternates||[])].filter(Boolean).map(v=>window.YESSearch.normalize(v));
 const tokens=x=>window.YESSearch.normalize([x.title,x.body].join(" ")).split(" ").filter(t=>t.length>2);
 const baseTopics=new Set(topics(item)),baseTokens=new Set(tokens(item));
 return (items||[]).filter(x=>x&&x.id!==item.id).map(x=>{
  const shared=topics(x).filter(t=>baseTopics.has(t)).length;
  const overlap=tokens(x).filter(t=>baseTokens.has(t)).length;
  const score=shared*8+Math.min(overlap,12);
  return {item:x,score,reason:shared?"هم‌موضوع":"هم‌واژه"};
 }).filter(x=>x.score>=4).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,limit));
}
async function analyzeArchive(){
 if(archiveAnalysisStarted||!window.YESProsody)return;
 archiveAnalysisStarted=true;mount();
 setStatus("در حال تحلیل ساختاری آرشیو و ذخیرهٔ پروفایل تک‌تک آثار…");
 try{
  let existingProfiles=new Map(),existingSummary=null;
  try{
   const saved=await window.YESStorage?.all("prosodyReview")||[];
   existingSummary=saved.find(record=>record&&record.id==="archive-v1.8-summary")||null;
   existingProfiles=new Map(saved.filter(record=>record&&record.id&&record.id!=="archive-v1.8-summary").map(record=>[String(record.id),record]));
  }catch(e){}
  const contentItems=window.YESContent?.all||window.poemEntries||[];
  let corpusResult=null;
  if(window.YESProsodyCorpus?.apply){
   try{corpusResult=await window.YESProsodyCorpus.apply(contentItems);}
   catch(error){console.warn("External prosody corpus unavailable:",error);}
  }
  if(existingSummary&&existingSummary.version==="1.8.0-prosody.3"&&existingSummary.total===contentItems.length){
   contentItems.forEach(item=>{const profile=item&&item.id?existingProfiles.get(String(item.id)):null;if(profile){item.prosody=profile;if(Number.isInteger(item.legacyIndex)&&window.poemEntries&&window.poemEntries[item.legacyIndex])window.poemEntries[item.legacyIndex].prosody=profile;}});
   setStatus("پروفایل‌های عروضی ذخیره‌شده بازیابی شد؛ "+(corpusResult?.applied||0).toLocaleString("fa-IR")+" تطبیق تازه از پیکرهٔ P3R ثبت شد و بازبینی‌های انسانی حفظ شدند.");
   return;
  }
  const result=await window.YESProsody.analyzeAll(contentItems,{
   batchSize:400,existingProfiles,
   onBatch:async batch=>{if(window.YESStorage?.putMany)await window.YESStorage.putMany("prosodyReview",batch);},
   onProgress:p=>setStatus("تحلیل مقدماتی: "+p.done.toLocaleString("fa-IR")+" از "+p.total.toLocaleString("fa-IR")+" · تأییدشده: "+p.confirmed.toLocaleString("fa-IR")+" · در صف بازبینی: "+p.reviewRequired.toLocaleString("fa-IR"))
  });
  contentItems.forEach(item=>{if(item?.prosody?.status==="confirmed"&&Number.isInteger(item.legacyIndex)&&window.poemEntries?.[item.legacyIndex])window.poemEntries[item.legacyIndex].prosody=item.prosody;});
  let savedSummary=false;
  try{if(window.YESStorage?.put){await window.YESStorage.put("prosodyReview",{id:"archive-v1.8-summary",version:result.version,total:result.total,analyzed:result.analyzed,confirmed:result.confirmed,reviewRequired:result.reviewRequired,updatedAt:new Date().toISOString()});savedSummary=true;}}catch(e){}
  setStatus("پروفایل مقدماتی "+result.analyzed.toLocaleString("fa-IR")+" اثر ذخیره شد؛ "+(corpusResult?.applied||0).toLocaleString("fa-IR")+" تطبیق دقیق P3R ثبت شد. "+result.confirmed.toLocaleString("fa-IR")+" مورد تأیید انسانی و "+result.reviewRequired.toLocaleString("fa-IR")+" مورد نیازمند بازبینی است. "+(savedSummary?"گزارش پایدار ذخیره شد.":"ذخیرهٔ گزارش نهایی ممکن نشد."));
 }catch(error){archiveAnalysisStarted=false;setStatus("تحلیل/ذخیرهٔ دسته‌ای کامل نشد؛ "+String(error?.message||error));}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
window.addEventListener("yes:archive-ready",analyzeArchive);
window.addEventListener("yes:prosody-updated",()=>window.dispatchEvent(new Event("yes:advanced-search-change")));
window.YESAdvancedSearch={matches,getState,similar,reset(){Object.keys(state).forEach(k=>state[k]="");const root=document.getElementById("prosodyFilters");if(root)root.querySelectorAll("input,select").forEach(n=>n.value="");window.dispatchEvent(new Event("yes:advanced-search-change"));}};
})();