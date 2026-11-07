/* Version 1.4 homepage polish: daily poem, theme modes and compact mobile navigation. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
 const style=`
 :root{--dock-height:66px}
 .daily-poem{position:relative;max-width:850px;margin:0 auto 16px;padding:18px 20px;border:1px solid #80603f88;border-radius:19px;background:linear-gradient(120deg,#33271d,#211b16);text-align:center;box-shadow:0 9px 24px #0002}
 .daily-poem small{display:block;color:var(--gold);font-size:10px;margin-bottom:9px}
 .daily-poem blockquote{margin:0;color:var(--text);font-size:16px;line-height:2.2;white-space:pre-line}
 .daily-poem .daily-author{display:block;color:var(--muted);font-size:11px;margin-top:9px}
 .daily-poem button{margin-top:11px;border:1px solid #80603f;border-radius:20px;background:transparent;color:var(--gold2);padding:6px 15px;font:inherit;font-size:11px}
 #themeToggle{border:1px solid var(--line);border-radius:22px;background:var(--surface);color:var(--gold2);padding:8px 12px;font:inherit;font-size:11px;white-space:nowrap}
 .site-stats{padding:10px 13px;margin-top:26px}
 .stats-grid{gap:7px}.stat-card{padding:9px 5px}.stats-caption{margin:7px 0 0}
 #mobileDock{display:none}
 body[data-theme="light"]{color-scheme:light;--bg:#f4efe7;--surface:#fffaf2;--surface2:#eee5d8;--surface3:#e5d8c6;--text:#33291f;--muted:#776858;--gold:#987044;--gold2:#805a31;--line:#d8caba;--green:#68745d;--shadow:0 14px 34px #5c463018;background:radial-gradient(ellipse at 50% -12%,#e6d3b988,transparent 44%),var(--bg)}
 body[data-theme="light"] .site-header h1{color:#493523}
 body[data-theme="light"] .brand-mark{background:linear-gradient(145deg,#f1e4d1,#fffaf2)}
 body[data-theme="light"] .hero-feature{background:linear-gradient(115deg,#ead8bf,#fff8ee 72%);border-color:#c9ad87}
 body[data-theme="light"] .hero-copy strong{color:#4b3524}body[data-theme="light"] .hero-copy span{color:#765f47}
 body[data-theme="light"] .entry,body[data-theme="light"] .pinned-item,body[data-theme="light"] .notebook-row,body[data-theme="light"] .notebook-note{background:linear-gradient(145deg,#fffaf2,#f0e7da)}
 body[data-theme="light"] .reader-paper{background:linear-gradient(145deg,#fffaf2,#f0e7da)}
 body[data-theme="light"] .search input,body[data-theme="light"] .image-controls textarea,body[data-theme="light"] .image-controls input,body[data-theme="light"] .image-controls select{background:#fffaf2;color:#33291f}
 body[data-theme="light"] .daily-poem{background:linear-gradient(120deg,#ead8bf,#fff8ee);border-color:#c9ad87}
 body[data-theme="light"] .daily-poem blockquote{color:#33291f}
 body[data-theme="light"] .image-preview{background:#e6ded2}
 body[data-theme="light"] .reader-note textarea{background:#fffaf2;color:#33291f}
 @media(max-width:760px){
  body{padding-bottom:calc(var(--dock-height) + env(safe-area-inset-bottom))}
  #mobileDock{position:fixed;z-index:30;right:10px;left:10px;bottom:calc(8px + env(safe-area-inset-bottom));height:var(--dock-height);display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:6px;border:1px solid var(--line);border-radius:20px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(18px);box-shadow:0 8px 28px #0003}
  #mobileDock button{border:0;border-radius:13px;background:transparent;color:var(--muted);font:inherit;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
  #mobileDock button span{font-size:17px;line-height:1.2;color:var(--gold)}
  #mobileDock button:active,#mobileDock button.active{background:var(--surface2);color:var(--gold2)}
  body.reader-open #mobileDock,body.notebook-open #mobileDock,body.image-studio-open #mobileDock{display:none}
  .toolbar{flex-wrap:wrap}.toolbar>div:last-child{width:100%;display:flex!important;flex-wrap:wrap;justify-content:center}
  .toolbar>div:last-child button{flex:1 1 auto}
  .daily-poem{padding:15px 14px}.daily-poem blockquote{font-size:14px}
 }
 `;
 function addStyle(){if(document.getElementById("v14-home-style"))return;const node=document.createElement("style");node.id="v14-home-style";node.textContent=style;document.head.append(node);}
 function applyTheme(theme){const value=theme==="light"?"light":"dark";document.body.dataset.theme=value;const b=$("themeToggle");if(b){b.textContent=value==="dark"?"☼ حالت روشن":"☾ حالت شب";b.setAttribute("aria-pressed",String(value==="light"));}try{localStorage.setItem("yes-v14-theme",value);}catch(e){}}
 function createDailyCard(toolbar){
  const section=document.createElement("section");section.className="daily-poem";section.id="dailyPoem";section.setAttribute("aria-label","شعر امروز");
  const label=document.createElement("small");label.textContent="✦ شعر امروز";
  const body=document.createElement("blockquote");body.textContent="در حال انتخاب شعر امروز…";
  const author=document.createElement("span");author.className="daily-author";
  const open=document.createElement("button");open.type="button";open.textContent="خواندن این شعر";
  open.addEventListener("click",()=>{if(section._item&&window.YESReader)window.YESReader.open(section._item.id);});
  section.append(label,body,author,open);toolbar.insertAdjacentElement("afterend",section);
  const key="yes-v14-daily-"+today();
  let saved=null;try{saved=JSON.parse(localStorage.getItem(key)||"null");}catch(e){}
  const paint=item=>{if(!item)return;section._item=item;body.textContent=item.body||"";author.textContent=item.author?"— "+item.author:"";open.hidden=!item.id;};
  if(saved&&saved.id){paint(saved);return;}
  if(window.YESArchive?.randomItems){window.YESArchive.randomItems(1).then(items=>{const item=items&&items[0];if(!item)return;paint(item);try{localStorage.setItem(key,JSON.stringify(item));}catch(e){}}).catch(()=>{body.textContent="امروز هم می‌شود میان واژه‌ها مکث کرد.";open.hidden=true;});}
  else{body.textContent="امروز هم می‌شود میان واژه‌ها مکث کرد.";open.hidden=true;}
 }
 function moveStatsAndHero(){
  const regular=$("regularView"),toolbar=regular?.querySelector(".toolbar"),hero=$("pinned"),stats=$("siteStats");
  if(regular&&toolbar&&hero)toolbar.insertAdjacentElement("afterend",hero);
  if(regular&&stats){const empty=$("empty");(empty||$("entries"))?.insertAdjacentElement("afterend",stats);}
 }
 function createDock(){
  if($("mobileDock"))return;
  const nav=document.createElement("nav");nav.id="mobileDock";nav.setAttribute("aria-label","پیمایش سریع");
  const items=[["home","⌂","خانه"],["library","▤","کتابخانه"],["search","⌕","جست‌وجو"],["favorites","♡","علاقه‌ها"],["notebook","▣","دفتر من"]];
  items.forEach(([id,glyph,label])=>{const b=document.createElement("button");b.type="button";b.dataset.action=id;b.setAttribute("aria-label",label);const icon=document.createElement("span");icon.textContent=glyph;b.append(icon,document.createTextNode(label));b.addEventListener("click",()=>{
   nav.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));
   if(id==="home"){document.body.classList.remove("notebook-open","reader-open","image-studio-open");$("notebookView").hidden=true;$("readerView").hidden=true;$("imageStudioView").hidden=true;$("regularView").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
   if(id==="library"){$("topics")?.scrollIntoView({behavior:"smooth",block:"start"});}
   if(id==="search"){$("search")?.scrollIntoView({behavior:"smooth",block:"center"});$("search")?.focus();}
   if(id==="favorites"||id==="notebook"){window.YESNotebook?.open();if(id==="favorites"){const first=$("notebookTabs")?.querySelector("button");first?.click();}}
  });nav.append(b);});
  document.body.append(nav);
 }
 function addThemeButton(){
  const toolbar=document.querySelector("#regularView .toolbar > div:last-child");if(!toolbar||$("themeToggle"))return;
  const b=document.createElement("button");b.id="themeToggle";b.type="button";b.addEventListener("click",()=>applyTheme(document.body.dataset.theme==="dark"?"light":"dark"));toolbar.append(b);
 }
 document.addEventListener("DOMContentLoaded",()=>{
  addStyle();moveStatsAndHero();addThemeButton();createDock();
  let theme="dark";try{theme=localStorage.getItem("yes-v14-theme")||"dark";}catch(e){}applyTheme(theme);
  const toolbar=document.querySelector("#regularView .toolbar");if(toolbar)createDailyCard(toolbar);
 });
})();
