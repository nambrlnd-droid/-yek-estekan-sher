/* Version 1.3 content adapter. Original poems.js and pinned.js remain the source of truth. */
(function(){
  "use strict";
  const slug=(s)=>String(s||"").normalize("NFKC").replace(/[\u064a\u0649]/g,"ی").replace(/\u0643/g,"ک").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"").slice(0,48);
  const poemSource=Array.isArray(window.poemEntries)?window.poemEntries:[];
  const pinnedSource=Array.isArray(window.pinnedEntries)?window.pinnedEntries:[];
  const poems=poemSource.map((x,i)=>({
    id:x.id||("poem-"+String(i+1).padStart(4,"0")),
    type:x.section==="texts"?"text":"poem",
    title:x.title||((x.body||"").split(/\n/)[0]||"بدون عنوان").slice(0,72),
    body:String(x.body||""), author:String(x.author||""),
    tags:Array.isArray(x.tags)?[...x.tags]:[], source:x.source||"",
    legacyIndex:i, collectionIds:[]
  }));
  const pinned=pinnedSource.map((x,i)=>({
    id:x.id||("pinned-"+String(i+1).padStart(3,"0")),type:"text",
    title:x.title||((x.body||"").split(/\n/)[0]||"بدون عنوان").slice(0,72),
    body:String(x.body||""),author:String(x.author||""),
    tags:Array.isArray(x.tags)?[...x.tags]:[],source:x.source||"",
    legacyIndex:i,collectionIds:["pishnahad-vamiz"]
  }));
  window.YESContent={
    version:"1.3.0",all:[...poems,...pinned],poems,pinned,
    get(id){return this.all.find(x=>x.id===id)||null;},
    collections:[{id:"pishnahad-vamiz",title:"پیشنهاد‌ومیض",itemIds:pinned.map(x=>x.id)}]
  };
  // The V1.8 taxonomy script is loaded immediately before this adapter.
  // Re-apply derived fields now that the normalized reader records exist.
  window.YES_TAXONOMY?.apply?.();
})();