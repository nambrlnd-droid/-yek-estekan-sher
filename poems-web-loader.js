/* Loads 200 additional classical Hafez ghazals from Ganjoor's public static data. */
(async function(){
"use strict";
const CACHE="yekestekan-webpoems-200-v1";
const norm=s=>String(s||"").normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\\s\\p{P}\\p{S}\\u200c\\u200e\\u200fـ]/gu,"").toLowerCase();
const list=window.poemEntries||(window.poemEntries=[]);
const add=items=>{const seen=new Set(list.map(x=>norm(x.body)));let n=0;for(const x of items){const k=norm(x.body);if(!k||seen.has(k))continue;seen.add(k);list.push(x);n++;}return n;};
try{
 let cached=null;try{cached=JSON.parse(localStorage.getItem(CACHE)||"null");}catch(e){}
 if(Array.isArray(cached)&&cached.length===200){add(cached);window.dispatchEvent(new Event("yes:web-poems-loaded"));return;}
 const root="https://cdn.jsdelivr.net/gh/ganjoor/ganjoor-data@main/";
 const cat=await fetch(root+"poets/hafez/ghazal/_cat.json").then(r=>{if(!r.ok)throw Error("category fetch failed");return r.json();});
 const candidates=(cat.Poems||[]).slice(0,260);
 const existing=new Set(list.map(x=>norm(x.body))), collected=[];
 let cursor=0;
 async function worker(){while(cursor<candidates.length&&collected.length<200){const item=candidates[cursor++];try{const p=await fetch(root+"poets"+item.FullUrl+".json").then(r=>r.ok?r.json():null);if(!p)continue;const body=(p.Sections||[]).map(s=>s.PlainText||"").filter(Boolean).join("\n\n").trim();const key=norm(body);if(body.length<35||!key||existing.has(key))continue;existing.add(key);collected.push({id:"web-hafez-"+String(collected.length+1).padStart(3,"0"),section:"poems",tags:["غزل حافظ"],author:"حافظ",body,source:"Ganjoor",sourceUrl:"https://ganjoor.net"+item.FullUrl});}catch(e){}}
 }
 await Promise.all(Array.from({length:8},worker));
 if(collected.length!==200)throw Error("only "+collected.length+" unique poems could be loaded");
 add(collected);try{localStorage.setItem(CACHE,JSON.stringify(collected));}catch(e){}
 window.dispatchEvent(new Event("yes:web-poems-loaded"));
}catch(error){console.warn("Ganjoor poem import:",error);window.dispatchEvent(new Event("yes:web-poems-load-failed"));}
})();
