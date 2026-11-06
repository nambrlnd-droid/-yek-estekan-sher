/* Poetry image studio: local Canvas rendering, RTL text layout and PNG export. */
(function(){
"use strict";
const $=id=>document.getElementById(id),canvas=$("poetryCanvas"),ctx=canvas.getContext("2d");
const palettes={
 paper:{bg:"#eee2cf",ink:"#463629",muted:"#806d59",accent:"#a8794e",line:"#c7b294"},
 night:{bg:"#211b18",ink:"#f1e5d5",muted:"#c0a991",accent:"#d8ad79",line:"#72563c"},
 dawn:{bg:"#e9d7d0",ink:"#563e42",muted:"#8b6870",accent:"#a96f66",line:"#cba8a0"},
 olive:{bg:"#e4e4d2",ink:"#394337",muted:"#68715d",accent:"#7e875f",line:"#b4b99c"},
 minimal:{bg:"#faf8f3",ink:"#25221e",muted:"#77716a",accent:"#a17a50",line:"#d9d2c8"}
};
let sourceItem=null,renderQueued=false;
const ids=["imageTheme","imageAlign","imageFont","imagePattern","imageFontSize","imageSpacing","imageShowAuthor","imageShowBrand"];
function notify(s){$("imageStatus").textContent=s;}
function rounded(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function font(family,size,weight="400"){return weight+" "+size+"px "+(family==="serif"?"serif":family)+", Tahoma, sans-serif";}
function wrapParagraph(text,maxWidth,fontSpec){
 ctx.font=fontSpec;const words=text.split(/\s+/);const lines=[];let line="";
 for(const word of words){const candidate=line?line+" "+word:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;}
 if(line)lines.push(line);return lines;
}
function drawPattern(p,kind){
 ctx.save();ctx.strokeStyle=p.line;ctx.fillStyle=p.accent;ctx.globalAlpha=.22;ctx.lineWidth=2;
 if(kind==="stars"){
  for(let y=180;y<1200;y+=180)for(let x=145;x<1000;x+=190){ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+4,y-4);ctx.lineTo(x+13,y);ctx.lineTo(x+4,y+4);ctx.lineTo(x,y+13);ctx.lineTo(x-4,y+4);ctx.lineTo(x-13,y);ctx.lineTo(x-4,y-4);ctx.closePath();ctx.stroke();}
 }else if(kind==="arch"){
  ctx.beginPath();ctx.moveTo(185,1160);ctx.lineTo(185,440);ctx.quadraticCurveTo(185,180,540,180);ctx.quadraticCurveTo(895,180,895,440);ctx.lineTo(895,1160);ctx.stroke();
  ctx.beginPath();ctx.moveTo(215,1160);ctx.lineTo(215,445);ctx.quadraticCurveTo(215,210,540,210);ctx.quadraticCurveTo(865,210,865,445);ctx.lineTo(865,1160);ctx.stroke();
 }else if(kind==="leaves"){
  for(let i=0;i<8;i++){const y=240+i*125;ctx.beginPath();ctx.ellipse(125,y,20,48,-.55,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(955,y+55,20,48,.55,0,Math.PI*2);ctx.stroke();}
 }
 ctx.restore();
}
function draw(){
 if(!ctx)return;
 const W=1080,H=1350,p=palettes[$("imageTheme").value]||palettes.paper;
 canvas.width=W;canvas.height=H;ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
 drawPattern(p,$("imagePattern").value);
 const inset=58;ctx.strokeStyle=p.line;ctx.lineWidth=2;rounded(inset,inset,W-inset*2,H-inset*2,28);ctx.stroke();
 ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(430,120);ctx.lineTo(650,120);ctx.stroke();
 ctx.fillStyle=p.accent;ctx.font=font("Vazirmatn",32);ctx.textAlign="center";ctx.direction="rtl";ctx.fillText("✦",W/2,133);
 const raw=$("imageText").value||"چند سطر از شعر یا نوشتهٔ دلخواهتان را اینجا بنویسید.";
 const family=$("imageFont").value||"Vazirmatn",size=Number($("imageFontSize").value),spacing=Number($("imageSpacing").value),align=$("imageAlign").value;
 const textFont=font(family,size),maxWidth=790,lines=[];
 raw.replace(/\r/g,"").split("\n").forEach(par=>{if(!par.trim()){lines.push("");return;}lines.push(...wrapParagraph(par,maxWidth,textFont));});
 const lineHeight=size*spacing,authorOn=$("imageShowAuthor").checked&&$("imageAuthor").value.trim().length>0,brandOn=$("imageShowBrand").checked;
 const top=245,bottom=authorOn?1050:brandOn?1110:1170,available=bottom-top;
 const scale=Math.min(1,available/Math.max(lineHeight,lines.length*lineHeight));
 const actualSize=Math.max(14,size*scale),actualLine=lineHeight*scale;
 ctx.direction="rtl";ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillStyle=p.ink;ctx.font=font(family,actualSize);
 const x=align==="right"?W-145:align==="left"?145:W/2;
 const total=lines.length*actualLine;let y=top+(available-total)/2+actualLine/2;
 lines.forEach(line=>{if(line)ctx.fillText(line,x,y,maxWidth);y+=actualLine;});
 if(authorOn){ctx.fillStyle=p.muted;ctx.font=font(family,30);ctx.textAlign="center";ctx.fillText("— "+$("imageAuthor").value.trim(),W/2,1130,820);}
 if(brandOn){ctx.fillStyle=p.accent;ctx.font=font("Vazirmatn",22);ctx.textAlign="center";ctx.fillText("یک استکان شعر",W/2,1230);}
 ctx.strokeStyle=p.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(430,1180);ctx.lineTo(650,1180);ctx.stroke();
 notify("پیش‌نمایش آماده است · ۱۰۸۰ × ۱۳۵۰ پیکسل"+(scale<.99?" · اندازهٔ قلم برای جاگیری متن خودکار تنظیم شد":""));
}
function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
async function saveSettings(){
 try{const value={id:"image-studio",...Object.fromEntries(ids.map(id=>[id,$(id).type==="checkbox"?$(id).checked:$(id).value]))};await window.YESStorage.put("settings",value);}catch(e){}
}
async function loadSettings(){
 try{const v=await window.YESStorage.get("settings","image-studio");if(!v)return;ids.forEach(id=>{if(v[id]!==undefined){if($(id).type==="checkbox")$(id).checked=!!v[id];else $(id).value=v[id];}});}catch(e){}
}
function open(item){
 sourceItem=item||null;
 if(item){$("imageText").value=item.body||"";$("imageAuthor").value=item.author||"";}
 $("imageStudioView").hidden=false;$("readerView").hidden=true;$("notebookView").hidden=true;$("regularView").hidden=true;$("pinnedView").hidden=true;
 document.body.classList.remove("reader-open","notebook-open");history.replaceState(null,"",location.pathname+"#image-studio");schedule();window.scrollTo({top:0,behavior:"smooth"});
}
function close(){
 $("imageStudioView").hidden=true;history.replaceState(null,"",location.pathname);
 if(sourceItem&&window.YESReader)window.YESReader.open(sourceItem.id);
 else{$("regularView").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
 sourceItem=null;
}
function download(){
 draw();
 if(!canvas.toBlob){notify("خروجی PNG در این مرورگر پشتیبانی نمی‌شود.");return;}
 canvas.toBlob(blob=>{
  if(!blob){notify("ساخت فایل PNG ممکن نشد.");return;}
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="yek-estekan-sher-"+Date.now()+".png";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);notify("تصویر PNG آماده شد.");
 },"image/png");
}
window.YESImageStudio={open,render:draw};
document.addEventListener("DOMContentLoaded",async()=>{
 $("openImageStudio").onclick=()=>open(null);
 $("readerMakeImage").onclick=()=>{const id=decodeURIComponent(location.hash.split("/").pop()||"");open(window.YESContent.get(id)||null);};
 $("imageStudioBack").onclick=close;$("imageDownload").onclick=download;
 [...ids,"imageText","imageAuthor"].forEach(id=>$(id).addEventListener("input",()=>{schedule();if(ids.includes(id))saveSettings();}));
 if(document.fonts?.ready)document.fonts.ready.then(schedule);
 await loadSettings();draw();
});
})();
