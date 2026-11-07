/* Persian-aware full-text search with memoized fields and reusable query matchers. */
(function(){
"use strict";
const digitMap={"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
const fieldCache=new WeakMap();
function normalize(value){return String(value??"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ۀة]/g,"ه").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[۰-۹٠-٩]/g,d=>digitMap[d]||d).replace(/[\u200c\u200d]/g," ").replace(/[\sـ]+/g," ").trim().toLocaleLowerCase("fa");}
function fields(item){
 let cached=fieldCache.get(item);
 if(cached)return cached;
 cached={title:normalize(item.title||String(item.body||"").split("\n")[0]),body:normalize(item.body),author:normalize(item.author),tags:normalize((item.tags||[]).join(" "))};
 fieldCache.set(item,cached);
 return cached;
}
function createMatcher(query){
 const q=normalize(query),terms=q.split(" ").filter(Boolean);
 function score(item){
  if(!terms.length)return 0;
  const f=fields(item);let n=0;
  for(const term of terms){if(f.title.includes(term))n+=8;if(f.author.includes(term))n+=6;if(f.tags.includes(term))n+=4;if(f.body.includes(term))n+=1;}
  return n;
 }
 function matches(item){
  if(!terms.length)return true;
  const f=fields(item);
  return terms.every(t=>f.title.includes(t)||f.body.includes(t)||f.author.includes(t)||f.tags.includes(t));
 }
 return {query:q,terms,matches,score};
}
function matches(item,query){return createMatcher(query).matches(item);}
function score(item,query){return createMatcher(query).score(item);}
window.YESSearch={normalize,matches,score,createMatcher};
})();
