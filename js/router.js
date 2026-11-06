/* Hash router: GitHub Pages compatible deep links. */
(function(){
  "use strict";
  const parse=()=>{const raw=location.hash.replace(/^#\/?/,"");const [route,...rest]=raw.split("/");return {route:route||"home",id:rest.join("/")};};
  const listeners=new Set();
  function notify(){const state=parse();listeners.forEach(fn=>fn(state));window.dispatchEvent(new CustomEvent("yes:route",{detail:state}));}
  window.YESRouter={current:parse,go(route,id){location.hash="#/"+route+(id?"/"+encodeURIComponent(id):"");},onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
  window.addEventListener("hashchange",notify);
  window.addEventListener("DOMContentLoaded",notify,{once:true});
})();