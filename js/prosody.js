/* V1.8 Stage 3 — conservative Persian prosody analysis.
 * Source text is never modified. Machine output is provisional; no meter is marked confirmed.
 */
(function(){
"use strict";
const cache=new WeakMap();
const normalize=s=>String(s??"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ۀة]/g,"ه").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[\u200c\u200e\u200f]/g," ").replace(/[،؛,.!?؟:«»“”()\[\]{}]/g," ").replace(/\s+/g," ").trim();
const words=s=>normalize(s).split(" ").filter(Boolean);
const lines=s=>String(s??"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const vowels=new Set(["ا","آ","و","ی"]);
function syllableEstimate(word){
 const w=normalize(word).replace(/[^آ-ی]/g,"");
 if(!w)return 0;
 // Orthographic estimate only: Persian short vowels are usually unwritten.
 // This deliberately avoids presenting an uncertain syllable count as scansion.
 let count=0;
 for(let i=0;i<w.length;i++){
  const c=w[i];
  if(vowels.has(c)){count++;if((c==="ا"||c==="آ")&&i>0&&w[i-1]==="ا")continue;}
 }
 return Math.max(1,count);
}
function lineEnding(line){
 const ws=words(line);return ws.length?ws[ws.length-1]:"";
}
function rhymeKey(word){
 return normalize(word).replace(/^(و|به|از|در|که|تا)/,"").slice(-3);
}
function inferRhyme(ls){
 const endings=ls.map(lineEnding).filter(Boolean);
 if(endings.length<2)return {rhyme:null,radif:null,confidence:"low"};
 const counts=new Map();for(const w of endings)counts.set(w,(counts.get(w)||0)+1);
 const repeated=[...counts].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]);
 let radif=null,rhyme=null;
 if(repeated.length){radif=repeated[0][0];}
 const candidates=endings.map(w=>radif&&w.endsWith(radif)&&w!==radif?w.slice(0,-radif.length):w).filter(Boolean);
 if(candidates.length>=2){
  const keys=new Map();for(const w of candidates){const k=rhymeKey(w);keys.set(k,(keys.get(k)||0)+1);}
  const best=[...keys].sort((a,b)=>b[1]-a[1])[0];
  if(best&&best[1]>=2)rhyme=best[0];
 }
 return {rhyme,radif,confidence:(rhyme||radif)?"low":"low"};
}
function analyze(item,useCache=true){
 if(useCache&&item&&typeof item==="object"&&cache.has(item))return cache.get(item);
 const body=String(item?.body??"");
 const ls=lines(body),type=ls.length>=4?"multi-line":ls.length===2?"couplet":ls.length===1?"single-line":"fragment";
 const estimates=ls.map(line=>({line,wordCount:words(line).length,syllableEstimate:words(line).reduce((n,w)=>n+syllableEstimate(w),0)}));
 const rhyme=inferRhyme(ls);
 const result={
  version:"1.8.0-prosody.2",status:"review_required",confidence:"low",
  poemType:type,lineCount:ls.length,lines:estimates,
  rhyme:rhyme.rhyme,radif:rhyme.radif,rhymeConfidence:"low",radifConfidence:"low",
  meter:null,bahr:null,arkan:null,scansion:null,
  syllableMethod:"orthographic-estimate-not-pronunciation",
  reviewReasons:["نبودِ فرهنگ تلفظ و اعراب‌گذاری معتبر","اختیارات شاعری و تلفظ‌های بدیل نیازمند داوری انسانی","وزن و بحر هنوز با تطبیق عروضیِ تأییدشده احراز نشده‌اند"],
  sourceTextPreserved:true
 };
 if(useCache&&item&&typeof item==="object")cache.set(item,result);
 return result;
}
function attach(item){const p=analyze(item);item.prosody=p;return p;}
let lastQueue=[];
async function analyzeAll(items,options={}){
 const list=Array.isArray(items)?items:[],batchSize=Math.max(100,Number(options.batchSize)||400);
 let done=0,review=0,confirmed=0,batch=[];lastQueue=[];
 const existing=options.existingProfiles instanceof Map?options.existingProfiles:new Map();
 const flush=async()=>{if(batch.length&&typeof options.onBatch==="function")await options.onBatch(batch);batch=[];};
 for(let i=0;i<list.length;i++){
  const item=list[i],saved=item?.id?existing.get(String(item.id)):null;
  const p=saved?.status==="confirmed"?saved:analyze(item,false);done++;
  if(p.status==="confirmed"){confirmed++;if(item&&typeof item==="object")item.prosody=p;}
  else{review++;if(item&&item.id)lastQueue.push(String(item.id));}
  if(item&&item.id)batch.push({
   ...p,id:String(item.id),version:p.version||"1.8.0-prosody.2",
   lines:Array.isArray(p.lines)?p.lines.map((line,index)=>({index,wordCount:line.wordCount,syllableEstimate:line.syllableEstimate})):[],
   updatedAt:p.reviewedAt||new Date().toISOString()
  });
  if(batch.length>=batchSize){await flush();if(typeof options.onProgress==="function")options.onProgress({done,total:list.length,confirmed,reviewRequired:review});await new Promise(resolve=>setTimeout(resolve,0));}
 }
 await flush();
 if(typeof options.onProgress==="function")options.onProgress({done,total:list.length,confirmed,reviewRequired:review,complete:true});
 return {total:list.length,analyzed:done,confirmed,reviewRequired:review,reviewQueueIds:lastQueue.slice(),version:"1.8.0-prosody.2"};
}
function reviewQueue(){return lastQueue.slice();}
window.YESProsody={normalize,lines,syllableEstimate,analyze,attach,analyzeAll,reviewQueue};
})();