/* Image Studio v2 UI integration; legacy studio remains available as fallback. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const section=$("imageStudioView");
if(!section)return;
const head=section.querySelector(".image-studio-head");
const legacy=section.querySelector(".image-studio-layout");
const switcher=document.createElement("div");
switcher.className="image-actions";
switcher.style.cssText="justify-content:center;margin:12px auto;max-width:520px";
switcher.innerHTML='<button type="button" class="tool-button" id="imageV2Mode">استودیوی جدید v2 · ۱۵ قالب</button><button type="button" class="tool-button" id="imageV1Mode" hidden>بازگشت به استودیوی قبلی</button>';
head.after(switcher);
const panel=document.createElement("section");
panel.id="imageStudioV2Panel";
panel.hidden=true;
panel.innerHTML=`
<style>
#imageStudioV2Panel{margin:14px 0 24px;color:var(--text)}
#imageStudioV2Panel .v2-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.9fr);gap:16px;align-items:start}
#imageStudioV2Panel .v2-controls{display:grid;gap:12px;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
#imageStudioV2Panel label{display:grid;gap:6px;color:var(--muted);font-size:12px}
#imageStudioV2Panel select,#imageStudioV2Panel textarea,#imageStudioV2Panel input{width:100%;background:#171512;border:1px solid var(--line);border-radius:10px;padding:10px;color:var(--text);font:inherit;font-size:12px}
#imageStudioV2Panel textarea{min-height:190px;line-height:2;resize:vertical}
#imageStudioV2Panel .v2-preview{padding:12px;border:1px solid var(--line);border-radius:18px;background:#100e0c}
#imageStudioV2Panel canvas{display:block;width:100%;height:auto;border-radius:10px}
#imageStudioV2Panel .v2-status{min-height:28px;text-align:center;color:var(--muted);font-size:11px;line-height:1.9;margin-top:8px}
#imageStudioV2Panel .v2-family{display:flex;gap:7px;flex-wrap:wrap}
#imageStudioV2Panel .v2-family button{border:1px solid var(--line);border-radius:20px;background:transparent;color:var(--muted);padding:7px 11px;font:inherit;font-size:11px}
#imageStudioV2Panel .v2-family button.active{background:var(--gold);color:#21170f;border-color:var(--gold)}
@media(max-width:720px){#imageStudioV2Panel .v2-grid{grid-template-columns:1fr}}
</style>
<div class="image-studio-head"><h2>استودیوی تصویر v2</h2><p>۱۵ قالب در پنج خانوادهٔ بصری، چهار اندازهٔ استاندارد و خروجی PNG؛ متن شعر بدون حذف یا کوتاه‌سازی حفظ می‌شود.</p></div>
<div class="v2-grid">
<div class="v2-controls">
<label>متن شعر<textarea id="v2Poem" dir="rtl" placeholder="متن شعر را وارد کنید…"></textarea></label>
<label>نام شاعر یا نویسنده<input id="v2Author" dir="rtl" placeholder="اختیاری"></label>
<label>خانوادهٔ طراحی<div class="v2-family" id="v2Families"></div></label>
<label>قالب<select id="v2Template"></select></label>
<label>ابعاد خروجی<select id="v2Format"><option value="square">مربع · ۱۰۸۰×۱۰۸۰</option><option value="portrait" selected>عمودی · ۱۰۸۰×۱۳۵۰</option><option value="story">استوری · ۱۰۸۰×۱۹۲۰</option><option value="landscape">افقی · ۱۹۲۰×۱۰۸۰</option></select></label>
<div class="image-actions"><button type="button" class="tool-button" id="v2Render">به‌روزرسانی پیش‌نمایش</button><button type="button" class="tool-button" id="v2Download">دریافت PNG</button></div>
<div class="v2-status" id="v2Status" role="status" aria-live="polite">در حال بارگذاری قالب‌ها…</div>
</div>
<div class="v2-preview"><canvas id="v2Canvas" width="1080" height="1350" aria-label="پیش‌نمایش استودیوی تصویر نسخهٔ دو"></canvas><div class="image-preview-note">پیش‌نمایش خروجی با ابعاد اصلی</div></div>
</div>`;
legacy.before(panel);
const mode2=$("imageV2Mode"),mode1=$("imageV1Mode");
mode2.addEventListener("click",()=>{legacy.hidden=true;panel.hidden=false;mode2.hidden=true;mode1.hidden=false;init();});
mode1.addEventListener("click",()=>{panel.hidden=true;legacy.hidden=false;mode1.hidden=true;mode2.hidden=false;});
let registry=null,selectedFamily="minimal",lastResult=null,initialized=false;
const status=s=>{$("v2Status").textContent=s;};
function fillFamilies(){
 const root=$("v2Families");root.replaceChildren();
 registry.listFamilies().forEach(f=>{const b=document.createElement("button");b.type="button";b.textContent=f.name;b.classList.toggle("active",f.id===selectedFamily);b.addEventListener("click",()=>{selectedFamily=f.id;fillFamilies();fillTemplates();render();});root.append(b);});
}
function fillTemplates(){
 const select=$("v2Template"),items=registry.listTemplates(selectedFamily);select.replaceChildren();
 items.forEach(t=>{const o=document.createElement("option");o.value=t.id;o.textContent=t.name;select.append(o);});
}
function render(){
 if(!registry)return;
 try{
 const text=$("v2Poem").value,author=$("v2Author").value,format=$("v2Format").value,templateId=$("v2Template").value;
 if(!text.trim()){status("متن شعر را وارد کنید تا پیش‌نمایش ساخته شود.");lastResult=null;return;}
 lastResult=window.YESImageStudioV2Renderer.render({registry,layoutEngine:window.YESImageStudioV2Layout,quality:window.YESImageStudioV2Quality,canvas:$("v2Canvas"),templateId,format,text,author});
 if(lastResult.blocked){status("متن در این قالب جا نمی‌شود؛ قالب یا ابعاد دیگری انتخاب کنید. هیچ بخشی از شعر حذف نشده است.");return;}
 const warnings=lastResult.quality.warnings||[];
 status("پیش‌نمایش آماده است · "+lastResult.quality.metrics.lineCount+" سطر"+(warnings.length?" · "+warnings.length+" هشدار مربوط به تزئینات یا محدوده":""));
 }catch(error){lastResult=null;status("خطا در ساخت پیش‌نمایش: "+error.message);}
}
async function init(){
 if(initialized){render();return;}
 try{
 registry=await window.YESImageStudioV2Registry.load("./assets/image-studio/manifest.v2.json");
 fillFamilies();fillTemplates();initialized=true;
 $("v2Template").addEventListener("change",render);
 $("v2Format").addEventListener("change",render);
 $("v2Poem").addEventListener("input",render);
 $("v2Author").addEventListener("input",render);
 $("v2Render").addEventListener("click",render);
 $("v2Download").addEventListener("click",async()=>{
  try{render();if(!lastResult||lastResult.blocked)throw new Error("ابتدا متن را در قالب انتخابی جا دهید.");
   const exported=await window.YESImageStudioV2Export.exportPNG({renderResult:lastResult,filename:$("v2Author").value||"yek-estekan-sher"});
   window.YESImageStudioV2Export.download(exported);
   status("تصویر PNG با موفقیت آماده و دریافت شد · "+exported.width+"×"+exported.height);
  }catch(error){status("امکان دریافت تصویر نیست: "+error.message);}
 });
 const legacyText=$("imageText")?.value||"";
 if(legacyText)$("v2Poem").value=legacyText;
 const legacyAuthor=$("imageAuthor")?.value||"";
 if(legacyAuthor)$("v2Author").value=legacyAuthor;
 render();
 }catch(error){status("بارگذاری استودیوی جدید ناموفق بود: "+error.message);}
}
})();
