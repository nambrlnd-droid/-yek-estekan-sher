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
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
window.addEventListener("yes:archive-ready",async()=>{if(!window.YESProsody)return;if(statusNode)statusNode.textContent="در حال ساخت صف بازبینی عروضی برای آرشیو بارگذاری‌شده…";try{const result=await window.YESProsody.analyzeAll(window.YESContent?.all||window.poemEntries||[],{batchSize:400,onProgress:p=>{status.textContent="تحلیل اولیهٔ ساختار: "+p.done.toLocaleString("fa-IR")+" از "+p.total.toLocaleString("fa-IR")+" · نیازمند بازبینی: "+p.reviewRequired.toLocaleString("fa-IR");}});status.textContent="تحلیل اولیهٔ "+result.analyzed.toLocaleString("fa-IR")+" اثر انجام شد؛ "+result.reviewRequired.toLocaleString("fa-IR")+" مورد در صف بازبینی‌اند و وزن تأییدشده‌ای ثبت نشده است.";}catch(error){status.textContent="ساخت صف بازبینی کامل نشد؛ "+String(error?.message||error);}});
window.YESAdvancedSearch={matches,getState,reset(){Object.keys(state).forEach(k=>state[k]="");const root=document.getElementById("prosodyFilters");if(root)root.querySelectorAll("input,select").forEach(n=>n.value="");window.dispatchEvent(new Event("yes:advanced-search-change"));}};
})();