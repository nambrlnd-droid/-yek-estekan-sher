/* Poetry image studio: client-side Persian-aware canvas rendering and PNG export. */
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
function notify(s){$("imageStatus").textContent=s;}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function wrapLine(text,maxWidth,font){ctx.font=font;const words=text.split(/\s+/);const lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines;}
function draw(){
 const W=1080,H=1350,p=palettes[$("imageTheme").value]||palettes.paper;
 canvas.width=W;canvas.height=H;ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
 const inset=58;ctx.strokeStyle=p.line;ctx.lineWidth=2;rounded(inset,inset,W-inset*2,H-inset*2,28);ctx.stroke();
 ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(430,120);ctx.lineTo(650,120);ctx.stroke();
 ctx.fillStyle=p.accent;ctx.font="32px Vazirmatn, sans-serif";ctx.textAlign="center";ctx.direction="rtl";ctx.fillText("✦",W/2,133);
 const raw=$("imageText").value||"چند سطر از شعر یا نوشتهٔ دلخواهتان را اینجا بنویسید.";
 const size=Number($("imageFontSize").value),spacing=Number($("imageSpacing").value),align=$("imageAlign").value;
 ctx.direction="rtl";ctx.textAlign=align;ctx.fillStyle=p.ink;ctx.font=size+"px Vazirmatn, Tahoma, sans-serif";
 const maxWidth=850,lines=[];raw.split("\n").forEach(par=>{if(!par){lines.push("");return;}lines.push(...wrapLine(par,maxWidth,size+"px Vazirmatn, Tahoma, sans-serif"));});
 const lineHeight=size*spacing,total=lines.length*lineHeight,maxHeight=H-420,scale=total>maxHeight?maxHeight/total:1;
 const actualSize=size*scale,actualLine=lineHeight*scale;ctx.font=actualSize+"px Vazirmatn, Tahoma, sans-serif";
 const x=align==="right"?W-150:align==="left"?150:W/2;let y=Math.max(330,(H-total*scale)/2+actualSize/2);
 lines.forEach(line=>{if(line)ctx.fillText(line,x,y);y+=actualLine;});
 if($("imageShowAuthor").checked&&$("imageAuthor").value.trim()){ctx.fillStyle=p.muted;ctx.font="30px Vazirmatn, Tahoma, sans-serif";ctx.textAlign="center";ctx.fillText("— "+$("imageAuthor").value.trim(),W/2,H-190);}
 if($("imageShowBrand").checked){ctx.fillStyle=p.accent;ctx.font="22px Vazirmatn, Tahoma, sans-serif";ctx.textAlign="center";ctx.fillText("یک استکان شعر",W/2,H-112);}
 ctx.strokeStyle=p.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(430,H-165);ctx.lineTo(650,H-165);ctx.stroke();
 notify("پیش‌نمایش آماده است · خروجی ۱۰۸۰ × ۱۳۵۰ پیکسل");
}
function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
function open(item){sourceItem=item||null;if(item){$("imageText").value=item.body||"";$("imageAuthor").value=item.author||"";}
 $("imageStudioView").hidden=false;$("readerView").hidden=true;$("notebookView").hidden=true;$("regularView").hidden=true;$("pinnedView").hidden=true;
 document.body.classList.remove("reader-open","notebook-open");history.replaceState(null,"",location.pathname+"#image-studio");schedule();window.scrollTo({top:0,behavior:"smooth"});}
function close(){$("imageStudioView").hidden=true;history.replaceState(null,"",location.pathname);if(sourceItem&&window.YESReader){window.YESReader.open(sourceItem.id);}else{$("regularView").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}}
function download(){draw();canvas.toBlob(blob=>{if(!blob){notify("ساخت فایل PNG در این مرورگر ممکن نشد.");return;}const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="yek-estekan-sher-"+Date.now()+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notify("تصویر PNG ساخته شد.");},"image/png");}
window.YESImageStudio={open};
document.addEventListener("DOMContentLoaded",()=>{
 $("openImageStudio").onclick=()=>open(null);$("readerMakeImage").onclick=()=>open(window.YESContent.get(location.hash.split("/").pop())||null);
 $("imageStudioBack").onclick=close;$("imageDownload").onclick=download;
 ["imageText","imageAuthor","imageTheme","imageFontSize","imageSpacing","imageAlign","imageShowAuthor","imageShowBrand"].forEach(id=>$(id).addEventListener("input",schedule));
 if(document.fonts?.ready)document.fonts.ready.then(schedule);draw();
});
})();