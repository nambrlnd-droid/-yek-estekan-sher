/* IndexedDB persistence for user-owned data; canonical poems remain in static JS files. */
(function(){
  "use strict";
  const DB="yek-estekan-sher-v13",VERSION=1;
  function open(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;["favorites","notes","history","collections","settings"].forEach(name=>{if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:"id"});});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function run(store,mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),os=tx.objectStore(store),req=action(os);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);});}
  window.YESStorage={
    ready:()=>open().then(db=>{db.close();return true;}),
    get:(s,id)=>run(s,"readonly",o=>o.get(id)),
    all:s=>run(s,"readonly",o=>o.getAll()),
    put:(s,value)=>run(s,"readwrite",o=>o.put(value)),
    remove:(s,id)=>run(s,"readwrite",o=>o.delete(id))
  };
})();