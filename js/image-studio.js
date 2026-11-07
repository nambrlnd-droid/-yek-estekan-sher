/* Poetry image studio v1.7: local Canvas rendering, Persian typography and export. */
(function(){
"use strict";
const $=id=>document.getElementById(id),canvas=$("poetryCanvas"),ctx=canvas.getContext("2d");
const palettes={
 classic:{bg:"#eee2cf",ink:"#463629",muted:"#806d59",accent:"#a8794e",line:"#c7b294"},
 night:{bg:"#211b18",ink:"#f1e5d5",muted:"#c0a991",accent:"#d8ad79",line:"#72563c"},
 dawn:{bg:"#e9d7d0",ink:"#563e42",muted:"#8b6870",accent:"#a96f66",line:"#cba8a0"},
 olive:{bg:"#e4e4d2",ink:"#394337",muted:"#68715d",accent:"#7e875f",line:"#b4b99c"},
 minimal:{bg:"#faf8f3",ink:"#25221e",muted:"#77716a",accent:"#a17a50",line:"#d9d2c8"},
 garden:{bg:"#e6ead9",ink:"#30483a",muted:"#657c62",accent:"#9a8050",line:"#b9c6a8"},
 tile:{bg:"#123e46",ink:"#f1e9d4",muted:"#b7d1c9",accent:"#e3b86c",line:"#4f8990"},
 rose:{bg:"#f0dedb",ink:"#603b46",muted:"#966c78",accent:"#b45f70",line:"#d5aeb4"},
 ink:{bg:"#e5dfd0",ink:"#292720",muted:"#6e6759",accent:"#8d493b",line:"#aaa18e"},
 midnight:{bg:"#171f3b",ink:"#f0e9d9",muted:"#b5b9d1",accent:"#d7b879",line:"#525d83"},
 saffron:{bg:"#f2e3bd",ink:"#5a3825",muted:"#927047",accent:"#bb7131",line:"#d6b878"},
 lavender:{bg:"#e9e1ef",ink:"#44334f",muted:"#806b8b",accent:"#a77baf",line:"#cbb9d5"},
 copper:{bg:"#29201e",ink:"#f0dfd2",muted:"#c5a79a",accent:"#c47b57",line:"#785344"},
 sea:{bg:"#dcebed",ink:"#24414a",muted:"#5c7b83",accent:"#3b8990",line:"#a9c9ca"},
 sand:{bg:"#f0e5d1",ink:"#51402e",muted:"#8a745a",accent:"#b58b58",line:"#d1bea0"}
};
const templates={
 classic:{theme:"classic",pattern:"arch",frame:"ornate",font:"Noto Naskh Arabic",weight:"500"},
 garden:{theme:"garden",pattern:"leaves",frame:"double",font:"Amiri",weight:"400"},
 tile:{theme:"tile",pattern:"geometry",frame:"ornate",font:"Noto Naskh Arabic",weight:"600"},
 rose:{theme:"rose",pattern:"leaves",frame:"single",font:"Amiri",weight:"400"},
 ink:{theme:"ink",pattern:"none",frame:"double",font:"Noto Serif Arabic",weight:"500"},
 midnight:{theme:"midnight",pattern:"stars",frame:"ornate",font:"Noto Naskh Arabic",weight:"500"},
 minimal:{theme:"minimal",pattern:"none",frame:"none",font:"Vazirmatn",weight:"400"},
 saffron:{theme:"saffron",pattern:"geometry",frame:"single",font:"Lalezar",weight:"400"},
 lavender:{theme:"lavender",pattern:"waves",frame:"double",font:"Amiri",weight:"400"},
 copper:{theme:"copper",pattern:"dots",frame:"ornate",font:"Noto Serif Arabic",weight:"500"},
 sea:{theme:"sea",pattern:"waves",frame:"single",font:"IBM Plex Sans Arabic",weight:"500"},
 sand:{theme:"sand",pattern:"dots",frame:"double",font:"Vazirmatn",weight:"400"}
};
const formats={portrait:[1080,1350],square:[1200,1200],story:[1080,1920],landscape:[1600,900]};
let sourceItem=null,renderQueued=false;
const settingIds=["imageTemplate","imageFormat","imageTheme","imageAlign","imageFont","imageFontWeight","imagePattern","imageFrame","imageFontSize","imageSpacing","imageLetterSpacing","imageShowAuthor","imageShowBrand"];
function notify(s){$("imageStatus").textContent=s;}
function rounded(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function font(family,size,weight){return weight+" "+size+"px \""+family+"\" , Tahoma, sans-serif";}
function wrapParagraph(text,maxWidth,fontSpec){
 ctx.font=fontSpec;const words=text.split(/\s+/);const lines=[];let line="";
 for(const word of words){const candidate=line?line+" "+word:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;}
 if(line)lines.push(line);return lines;
}
function drawPattern(p,kind,W,H){
 ctx.save();ctx.strokeStyle=p.line;ctx.fillStyle=p.accent;ctx.globalAlpha=.2;ctx.lineWidth=2;
 if(kind==="stars"){
  for(let y=H*.14;y<H*.9;y+=H*.14)for(let x=W*.13;x<W*.92;x+=W*.18){ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+4,y-4);ctx.lineTo(x+13,y);ctx.lineTo(x+4,y+4);ctx.lineTo(x,y+13);ctx.lineTo(x-4,y+4);ctx.lineTo(x-13,y);ctx.lineTo(x-4,y-4);ctx.closePath();ctx.stroke();}
 }else if(kind==="arch"){
  ctx.beginPath();ctx.moveTo(W*.17,H*.88);ctx.lineTo(W*.17,H*.34);ctx.quadraticCurveTo(W*.17,H*.12,W*.5,H*.12);ctx.quadraticCurveTo(W*.83,H*.12,W*.83,H*.34);ctx.lineTo(W*.83,H*.88);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W*.2,H*.88);ctx.lineTo(W*.2,H*.35);ctx.quadraticCurveTo(W*.2,H*.15,W*.5,H*.15);ctx.quadraticCurveTo(W*.8,H*.15,W*.8,H*.35);ctx.lineTo(W*.8,H*.88);ctx.stroke();
 }else if(kind==="leaves"){
  for(let i=0;i<9;i++){const y=H*.17+i*H*.08;ctx.beginPath();ctx.ellipse(W*.12,y,18,42,-.55,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(W*.88,y+H*.025,18,42,.55,0,Math.PI*2);ctx.stroke();}
 }else if(kind==="geometry"){
  for(let y=H*.16;y<H*.9;y+=H*.18)for(let x=W*.14;x<W*.9;x+=W*.18){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeRect(-20,-20,40,40);ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.stroke();ctx.restore();}
 }else if(kind==="waves"){
  for(let j=0;j<6;j++){ctx.beginPath();for(let x=0;x<=W;x+=12){const y=H*(.17+j*.12)+Math.sin(x/W*Math.PI*4+j*.65)*18;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 }else if(kind==="dots"){
  for(let y=H*.12;y<H*.92;y+=34)for(let x=W*.1;x<W*.92;x+=34){ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}
function drawFrame(p,kind,W,H,inset){
 if(kind==="none")return;
 ctx.save();ctx.strokeStyle=p.line;ctx.lineWidth=2;rounded(inset,inset,W-inset*2,H-inset*2,Math.min(28,W*.025));ctx.stroke();
 if(kind==="double"||kind==="ornate"){ctx.strokeStyle=p.accent;ctx.lineWidth=1.5;rounded(inset+13,inset+13,W-(inset+13)*2,H-(inset+13)*2,18);ctx.stroke();}
 if(kind==="ornate"){
  const r=15;[[inset+29,inset+29],[W-inset-29,inset+29],[inset+29,H-inset-29],[W-inset-29,H-inset-29]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-r-7,y);ctx.lineTo(x+r+7,y);ctx.moveTo(x,y-r-7);ctx.lineTo(x,y+r+7);ctx.stroke();});
 }
 ctx.restore();
}
function draw(){
 if(!ctx)return;
 const [W,H]=formats[$("imageFormat").value]||formats.portrait;
 canvas.width=W;canvas.height=H;
 const p=palettes[$("imageTheme").value]||palettes.classic;
 ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
 drawPattern(p,$("imagePattern").value,W,H);
 const inset=Math.round(Math.min(W,H)*.055);drawFrame(p,$("imageFrame").value,W,H,inset);
 ctx.fillStyle=p.accent;ctx.textAlign="center";ctx.direction="rtl";ctx.font=font("Vazirmatn",Math.max(22,Math.round(Math.min(W,H)*.028)),"500");
 ctx.fillText("✦",W/2,H*.105);
 const raw=$("imageText").value||"چند سطر از شعر یا نوشتهٔ دلخواهتان را اینجا بنویسید.";
 const family=$("imageFont").value||"Vazirmatn",weight=$("imageFontWeight").value||"400",size=Number($("imageFontSize").value),spacing=Number($("imageSpacing").value),align=$("imageAlign").value;
 const textFont=font(family,size,weight),maxWidth=W*.74,lines=[];
 raw.replace(/\r/g,"").split("\n").forEach(par=>{if(!par.trim()){lines.push("");return;}lines.push(...wrapParagraph(par,maxWidth,textFont));});
 const authorOn=$("imageShowAuthor").checked&&$("imageAuthor").value.trim().length>0,brandOn=$("imageShowBrand").checked;
 const top=H*.19,bottom=H*(authorOn ? .78 : brandOn ? .83 : .87),available=bottom-top;
 const lineHeight=size*spacing,scale=Math.min(1,available/Math.max(lineHeight,lines.length*lineHeight));
 const actualSize=Math.max(13,size*scale),actualLine=lineHeight*scale;
 ctx.direction="rtl";ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillStyle=p.ink;ctx.font=font(family,actualSize,weight);
 if("letterSpacing" in ctx)ctx.letterSpacing=$("imageLetterSpacing").value+"px";
 const x=align==="right"?W*.86:align==="left"?W*.14:W/2;
 const total=lines.length*actualLine;let y=top+(available-total)/2+actualLine/2;
 lines.forEach(line=>{if(line)ctx.fillText(line,x,y,maxWidth);y+=actualLine;});
 if("letterSpacing" in ctx)ctx.letterSpacing="0px";
 if(authorOn){ctx.fillStyle=p.muted;ctx.font=font(family,Math.max(20,Math.round(Math.min(W,H)*.027)),weight);ctx.textAlign="center";ctx.fillText("— "+$("imageAuthor").value.trim(),W/2,H*.84,W*.76);}
 if(brandOn){ctx.fillStyle=p.accent;ctx.font=font("Vazirmatn",Math.max(17,Math.round(Math.min(W,H)*.02)),"500");ctx.textAlign="center";ctx.fillText("یک استکان شعر",W/2,H*.92);}
 notify("پیش‌نمایش آماده است · "+W+" × "+H+" پیکسل"+(scale<.99?" · اندازهٔ قلم برای جاگیری متن خودکار تنظیم شد":""));
}
function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
async function ensureFont(){
 const family=$("imageFont").value,weight=$("imageFontWeight").value,size=$("imageFontSize").value;
 schedule();
 if(document.fonts?.load){try{notify("در حال بارگذاری قلم انتخاب‌شده…");await document.fonts.load(weight+" "+size+"px \""+family+"\"");}catch(e){}}
 schedule();
}
async function saveSettings(){
 try{const value={id:"image-studio",...Object.fromEntries(settingIds.map(id=>[id,$(id).type==="checkbox"?$(id).checked:$(id).value]))};await window.YESStorage.put("settings",value);}catch(e){}
}
async function loadSettings(){
 try{const v=await window.YESStorage.get("settings","image-studio");if(!v)return;settingIds.forEach(id=>{if(v[id]!==undefined){if($(id).type==="checkbox")$(id).checked=!!v[id];else $(id).value=v[id];}});}catch(e){}
}
function applyTemplate(name){
 const t=templates[name];if(!t)return;
 $("imageTemplate").value=name;
 Object.entries(t).forEach(([key,value])=>{const id=key==="theme"?"imageTheme":key==="pattern"?"imagePattern":key==="frame"?"imageFrame":key==="font"?"imageFont":"imageFontWeight";$(id).value=value;});
 document.querySelectorAll("#imagePresetButtons button").forEach(b=>b.classList.toggle("active",b.dataset.template===name));
 saveSettings();ensureFont();
}
function buildTemplateButtons(){
 const root=$("imagePresetButtons");root.replaceChildren();
 Object.entries(templates).forEach(([name,t])=>{const b=document.createElement("button");b.type="button";b.dataset.template=name;b.textContent=({classic:"نسخهٔ خطی",garden:"باغ ایرانی",tile:"کاشی",rose:"گل‌سرخ",ink:"مرکب",midnight:"شب لاجوردی",minimal:"مینیمال",saffron:"زعفرانی",lavender:"یاس",copper:"مسی",sea:"دریا",sand:"شنزار"})[name];b.addEventListener("click",()=>applyTemplate(name));root.append(b);});
}
function resetSettings(){
 $("imageTemplate").value="classic";$("imageFormat").value="portrait";$("imageTheme").value="classic";$("imageAlign").value="center";$("imageFont").value="Noto Naskh Arabic";$("imageFontWeight").value="500";$("imagePattern").value="arch";$("imageFrame").value="ornate";$("imageFontSize").value="42";$("imageSpacing").value="2";$("imageLetterSpacing").value="0";$("imageShowAuthor").checked=true;$("imageShowBrand").checked=true;
 document.querySelectorAll("#imagePresetButtons button").forEach(b=>b.classList.toggle("active",b.dataset.template==="classic"));saveSettings();ensureFont();
}
function open(item){
 sourceItem=item||null;
 if(item){$("imageText").value=item.body||"";$("imageAuthor").value=item.author||"";}
 $("imageStudioView").hidden=false;$("readerView").hidden=true;$("notebookView").hidden=true;$("regularView").hidden=true;$("pinnedView").hidden=true;
 document.body.classList.remove("reader-open","notebook-open");document.body.classList.add("image-studio-open");history.replaceState(null,"",location.pathname+"#image-studio");schedule();window.scrollTo({top:0,behavior:"smooth"});
}
function close(){
 $("imageStudioView").hidden=true;document.body.classList.remove("image-studio-open");history.replaceState(null,"",location.pathname);
 if(sourceItem&&window.YESReader)window.YESReader.open(sourceItem.id);
 else{$("regularView").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
 sourceItem=null;
}
function download(){
 draw();if(!canvas.toBlob){notify("خروجی PNG در این مرورگر پشتیبانی نمی‌شود.");return;}
 canvas.toBlob(blob=>{
  if(!blob){notify("ساخت فایل PNG ممکن نشد.");return;}
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;
  a.download="yek-estekan-sher-"+$("imageFormat").value+"-"+Date.now()+".png";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify("تصویر PNG آماده شد.");
 },"image/png");
}
window.YESImageStudio={open,render:draw,applyTemplate};
document.addEventListener("DOMContentLoaded",async()=>{
 buildTemplateButtons();
 $("openImageStudio").onclick=()=>open(null);
 const readerImageButton=$("readerMakeImage");
 if(readerImageButton)readerImageButton.onclick=()=>{const id=decodeURIComponent(location.hash.split("/").pop()||"");open(window.YESContent.get(id)||null);};
 $("imageStudioBack").onclick=close;$("imageDownload").onclick=download;$("imageReset").onclick=resetSettings;
 settingIds.forEach(id=>{$(id).addEventListener("input",()=>{schedule();saveSettings();if(id==="imageFont"||id==="imageFontWeight")ensureFont();if(id==="imageTemplate")document.querySelectorAll("#imagePresetButtons button").forEach(b=>b.classList.toggle("active",b.dataset.template===$(id).value));});$(id).addEventListener("change",()=>{schedule();saveSettings();});});
 ["imageText","imageAuthor"].forEach(id=>$(id).addEventListener("input",schedule));
 if(document.fonts?.ready)document.fonts.ready.then(schedule);
 await loadSettings();document.querySelectorAll("#imagePresetButtons button").forEach(b=>b.classList.toggle("active",b.dataset.template===$("imageTemplate").value));
 await ensureFont();draw();
});
})();