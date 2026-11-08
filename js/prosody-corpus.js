/* Exact-match prosody annotations imported from the P3R corpus.
 * Imported data is external-source matched, never human-confirmed by this module.
 */
(function(){
"use strict";
let loadPromise=null;
async function readIndex(){
 const response=await fetch("./data/poetry-archive/prosody-index.json.gz",{cache:"force-cache"});
 if(!response.ok)throw new Error("شاخص عروضی بیرونی هنوز منتشر نشده است ("+response.status+")");
 if(typeof DecompressionStream==="undefined")throw new Error("مرورگر امکان بازکردن شاخص عروضی فشرده را ندارد");
 const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream("gzip"));
 return await new Response(stream).json();
}
async function apply(items){
 if(loadPromise)return loadPromise;
 loadPromise=(async()=>{
  const index=await readIndex();
  let saved=[];
  try{saved=await window.YESStorage?.all("prosodyReview")||[];}catch(e){}
  const savedById=new Map(saved.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
  const writes=[];
  let applied=0,preservedHuman=0;
  for(const item of Array.isArray(items)?items:[]){
   if(!item?.id)continue;
   const imported=index[String(item.id)];
   if(!imported)continue;
   const previous=savedById.get(String(item.id));
   if(previous?.status==="confirmed"){item.prosody=previous;preservedHuman++;continue;}
   const structural=window.YESProsody?.analyze(item,false)||{};
   const record={...structural,...imported,id:String(item.id),version:"1.8.2-multi-source-exact-match",updatedAt:new Date().toISOString()};
   item.prosody=record;
   if(Number.isInteger(item.legacyIndex)&&window.poemEntries?.[item.legacyIndex])window.poemEntries[item.legacyIndex].prosody=record;
   writes.push(record);applied++;
  }
  if(writes.length&&window.YESStorage?.putMany)await window.YESStorage.putMany("prosodyReview",writes);
  return {available:true,indexRecords:Object.keys(index).length,applied,preservedHuman};
 })().catch(error=>{loadPromise=null;throw error;});
 return loadPromise;
}
window.YESProsodyCorpus={apply,reset(){loadPromise=null;}};
})();