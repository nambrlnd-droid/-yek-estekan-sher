/* V1.8 Stage 4 — composable literary search filters. */
(function(){
"use strict";
const state={type:"",meter:"",rhyme:"",radif:""};let statusNode=null;
const types=[["","همهٔ قالب‌ها"],["couplet","دو مصراعی"],["multi-line","چندمصراعی"],["single-line","تک‌مصراعی"],["fragment","قطعه / متن ناقص"]];
function node(tag,attrs,text){const n=document.createElement(tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;}
function mount(){
 const anchor=document.querySelector(".search-filters");if(!anchor||document.getElementById("prosodyFilters"))return;
 const panel=node("div",{id:"prosodyFilters","class":"prosody-filters"});
 const type=node("select",{id:"prosodyTypeFilter","aria-label":"نوع شعر"});
 types.forEach(([v,t])=>type.append(node("option",{value:v},t)));
 const meter=node("input",{id:"prosodyMeterFilter",type:"search",placeholder:"وزن یا بحر (پس از تأیید)","aria-label":"جست‌وجو بر اساس وزن یا بحر"});
 const rhyme=node("input",{id:"prosodyRhymeFilter",type:"search",placeholder:"قافیه","aria-label":"قافیه"});
 const radif=node("input",{id:"prosodyRadifFilter",type:"search",placeholder:"ردیف","aria-label":"ردیف"});
 const status=node("small",{id:"prosodySearchStatus","aria-live":"polite"},"وزن‌های تأییدنشده در نتایج وزن قطعی محسوب نمی‌شوند.");
 panel.append(type,meter,rhyme,radif,status);anchor.after(panel);
 const changed=()=>{state.type=type.value;state.meter=meter.value.trim();state.rhyme=rhyme.value.trim();state.radif=radif.value.trim();window.dispatchEvent(new Event("yes:advanced-search-change"));};
 [type,meter,rhyme,radif].forEach(n=>n.addEventListener("input",changed));
}
function matches(item){
 if(!state.type&&!state.meter&&!state.rhyme&&!state.radif)return true;
 const p=window.YESProsody?.analyze(item);if(!p)return false;
 if(state.type&&p.poemType!==state.type)return false;
 if(state.meter){
  // Meter/Bahr search is deliberately limited to editorially verified metadata.
  if(p.status!=="confirmed"||!p.meter&&!p.bahr)return false;
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
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
let archiveAnalysisStarted=false;
window.addEventListener("yes:archive-ready",async()=>{
 if(archiveAnalysisStarted||!window.YESProsody)return;archiveAnalysisStarted=true;
 if(statusNode)statusNode.textContent="در حال تحلیل ساختاری آرشیو و ذخیرهٔ پروفایل تک‌تک آثار…";
 try{
  const result=await window.YESProsody.analyzeAll(window.YESContent?.all||window.poemEntries||[],{
   batchSize:400,
   onBatch:async batch=>{if(window.YESStorage?.putMany)await window.YESStorage.putMany("prosodyReview",batch);},
   onProgress:p=>{if(statusNode)statusNode.textContent="تحلیل مقدماتی: "+p.done.toLocaleString("fa-IR")+" از "+p.total.toLocaleString("fa-IR")+" · در صف بازبینی: "+p.reviewRequired.toLocaleString("fa-IR");}
  });
  let saved=false;try{if(window.YESStorage?.put){await window.YESStorage.put("prosodyReview",{id:"archive-v1.8-summary",version:result.version,total:result.total,analyzed:result.analyzed,confirmed:result.confirmed,reviewRequired:result.reviewRequired,updatedAt:new Date().toISOString()});saved=true;}}catch(e){}
  if(statusNode)statusNode.textContent="پروفایل مقدماتی "+result.analyzed.toLocaleString("fa-IR")+" اثر ذخیره شد؛ "+result.reviewRequired.toLocaleString("fa-IR")+" اثر نیازمند بازبینی‌اند. "+(saved?"گزارش در حافظهٔ پایدار مرورگر ثبت شد.":"ذخیرهٔ گزارش نهایی ممکن نشد.")+" وزن تأییدشده‌ای ثبت نشده است.";
 }catch(error){archiveAnalysisStarted=false;if(statusNode)statusNode.textContent="تحلیل/ذخیرهٔ دسته‌ای کامل نشد؛ "+String(error?.message||error);}
});
window.YESAdvancedSearch={matches,getState,similar,reset(){Object.keys(state).forEach(k=>state[k]="");const root=document.getElementById("prosodyFilters");if(root)root.querySelectorAll("input,select").forEach(n=>n.value="");window.dispatchEvent(new Event("yes:advanced-search-change"));}};
})();