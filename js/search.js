/* Persian-aware full-text search. Content is normalized only for matching; source text is never modified. */
(function(){
"use strict";
const digitMap={"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
function normalize(value){return String(value??"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ۀة]/g,"ه").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[۰-۹٠-٩]/g,d=>digitMap[d]||d).replace(/[\u200c\u200d]/g," ").replace(/[\sـ]+/g," ").trim().toLocaleLowerCase("fa");}
function fields(item){return {title:normalize(item.title||String(item.body||"").split("\n")[0]),body:normalize(item.body),author:normalize(item.author),tags:normalize((item.tags||[]).join(" "))};}
function matches(item,query){const q=normalize(query);if(!q)return true;const f=fields(item),terms=q.split(" ").filter(Boolean);return terms.every(t=>f.title.includes(t)||f.body.includes(t)||f.author.includes(t)||f.tags.includes(t));}
function score(item,query){const q=normalize(query);if(!q)return 0;const f=fields(item);let n=0;for(const term of q.split(" ").filter(Boolean)){if(f.title.includes(term))n+=8;if(f.author.includes(term))n+=6;if(f.tags.includes(term))n+=4;if(f.body.includes(term))n+=1;}return n;}
window.YESSearch={normalize,matches,score};
})();
