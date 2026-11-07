/* Hierarchical content classification for Yek Estekan Sher.
   Original body/author/source are never rewritten. Ambiguous classifications are flagged. */
(function(){
"use strict";
const rows=Array.isArray(window.poemEntries)?window.poemEntries:[];
const rx=(s)=>new RegExp(s,"i");
const religious=[
 ["امیرالمؤمنین علیه‌السلام",/(امیرالمؤمنین|امیر مومنان|امیرالمومنین|علی بن ابی.?طالب|امام علی|یا علی|حیدر|مرتضی|ذوالفقار|غدیر|نهج.?البلاغه|مولای متقیان)/i],
 ["حضرت فاطمه زهرا سلام‌الله‌علیها",/(حضرت زهرا|فاطمه زهرا|فاطمه|صدیقه|یاس کبود|ام.?ابیها|مادر سادات)/i],
 ["امام حسن مجتبی علیه‌السلام",/(امام حسن|حسن مجتبی|مجتبی|حسن بن علی|کریم اهل.?بیت|بقیع)/i],
 ["امام حسین علیه‌السلام",/(امام حسین|حسین بن علی|سیدالشهدا|سید الشهدا|کربلا|عاشورا|نینوا|طف|اباعبدالله|یا حسین)/i],
 ["امام سجاد علیه‌السلام",/(امام سجاد|علی بن الحسین|زین العابدین|صحیفه سجادیه)/i],
 ["امام باقر علیه‌السلام",/(امام باقر|محمد باقر|باقر العلوم)/i],
 ["امام صادق علیه‌السلام",/(امام صادق|جعفر بن محمد|جعفر صادق)/i],
 ["امام کاظم علیه‌السلام",/(امام کاظم|موسی بن جعفر|باب الحوائج)/i],
 ["امام رضا علیه‌السلام",/(امام رضا|علی بن موسی|سلطان خراسان|مشهد|ضامن آهو)/i],
 ["امام جواد علیه‌السلام",/(امام جواد|محمد تقی|جواد الائمه)/i],
 ["امام هادی علیه‌السلام",/(امام هادی|علی نقی|هادی الائمه)/i],
 ["امام حسن عسکری علیه‌السلام",/(امام حسن عسکری|حسن عسکری)/i],
 ["امام زمان عجل‌الله‌تعالی‌فرجه",/(امام زمان|صاحب الزمان|مهدی|موعود|قائم|ظهور|فرج|غیبت کبری|نرگس خاتون)/i],
 ["پیامبر اکرم صلی‌الله‌علیه‌وآله",/(پیامبر|رسول خدا|محمد مصطفی|مصطفی|خاتم الانبیا|احمد)/i],
 ["اهل‌بیت علیهم‌السلام",/(اهل.?بیت|آل.?الله|عترت|چهارده معصوم|معصومین)/i],
 ["قرآن و معارف قرآنی",/(قرآن|آیه|سوره|بسم الله|آیت الکرسی|قرائت)/i],
 ["دعا و مناجات",/(دعای|دعا|مناجات|استغفار|توبه|یا رب|خدایا|پروردگارا|الهی)/i],
 ["زیارت و عتبات",/(زیارت|حرم|عتبات|نجف|کاظمین|سامرا|کربلا|بقیع|بین الحرمین)/i],
 ["مناسبت‌ها و آیین‌های دینی",/(رمضان|شب قدر|محرم|صفر|اربعین|نیمه شعبان|غدیر|فطر|قربان|فاطمیه|ولادت|شهادت|عید مبعث)/i],
 ["تاریخ و سیره دینی",/(سیره|تاریخ اسلام|هجرت|غزوه|جنگ بدر|صفین|جمل|کوفه|مدینه|مکه)/i]
];
const general=[
 ["عاشقانه و دلدادگی",/(عشق|عاشق|معشوق|دلدار|دلبر|نگار|جانان|بوسه|آغوش|وصال|دلداد|دوستت دارم)/i],
 ["فراق و دلتنگی",/(فراق|هجر|هجران|دوری|دلتنگ|جدایی|بی.?تو|رفتی|نماندی|مهجور)/i],
 ["تنهایی و غربت",/(تنهایی|تنها|غربت|غریب|بی.?کسی|بیگانه|خلوت|انزوا|بی.?همدم)/i],
 ["امید و انتظار",/(امید|انتظار|منتظر|چشم.?به.?راه|سپیده|گشایش|بازآ|بازگرد)/i],
 ["عرفان و معنویت",/(خدا|خدایا|پروردگار|نماز|سجده|محراب|ذکر|توحید|سلوک|عارف|ملکوت|عبادت)/i],
 ["حکمت و اخلاق",/(خرد|عقل|اخلاق|نیکی|بدی|حسادت|غرور|تواضع|انصاف|عدالت|راستی|دروغ|جوانمرد|قناعت|حرص)/i],
 ["اجتماعی و انتقادی",/(مردم|جامعه|وطن|ایران|ستم|ظلم|فقیر|غنی|آزادی|جنگ|صلح|حاکم|ریا|زمانه)/i],
 ["طبیعت و توصیف",/(بهار|پاییز|زمستان|باران|دریا|کوه|گل|بلبل|باغ|آسمان|خورشید|ماه|ستاره)/i],
 ["مرگ و گذر عمر",/(مرگ|مردن|قبر|خاک|کفن|پیری|عمر|اجل|فنا|زوال)/i],
 ["طنز و لطافت",/(خنده|خندید|شوخی|طنز|لبخند|بخند|شوخ|لطیفه)/i],
 ["تأمل و اندیشه",/(اندیشه|تفکر|تأمل|معنا|زندگی|جهان|هستی|حقیقت|راز|فلسفه|بودن|نیستی|سرنوشت)/i]
];
function classifyType(body,oldSection){
 const lines=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(oldSection==="texts") return {type:"text",confidence:"source"};
 if(lines.length>=2){
   const avg=lines.reduce((n,s)=>n+s.length,0)/lines.length;
   const short=lines.filter(s=>s.length<=58).length/lines.length;
   const stanza=lines.length>=3 && avg<=72 && short>=0.55;
   const couplet=lines.length===2 && avg<=78 && lines.every(s=>s.length<=95);
   if(stanza||couplet)return {type:"poem",confidence:"medium"};
   if(lines.length>=4 && avg>90)return {type:"text",confidence:"medium"};
   return {type:"text",confidence:"low"};
 }
 if(lines.length===1 && body.length<=105)return {type:"poem",confidence:"low"};
 return {type:"text",confidence:"medium"};
}
function classify(item){
 const body=String(item.body||"").trim(),oldSection=item.section;
 const shape=classifyType(body,oldSection);
 const matched=religious.filter(([name,re])=>re.test(body)).map(x=>x[0]);
 const isReligious=matched.length>0 || /(یا الله|یا رب|خداوند|رسول الله|صلوات الله|علیهم السلام|علیه السلام|صل الله)/i.test(body);
 let subject=matched[0]||"";
 if(!subject){
   const hits=general.filter(([name,re])=>re.test(body)).map(x=>x[0]);
   subject=hits[0]||(shape.type==="poem"?"شعر آزاد و ادبی":"نوشته عمومی");
 }
 const primary=(shape.type==="poem"?(isReligious?"اشعار مذهبی":"اشعار غیرمذهبی"):(isReligious?"متون مذهبی":"متون عمومی"));
 const certainty=(shape.confidence==="low" || (!matched.length && isReligious))?"نیازمند بازبینی":"";
 item.originalSection=oldSection||"";
 item.section=shape.type==="poem"?"poems":"texts";
 item.contentType=shape.type;
 item.category1=primary;
 item.category2=subject;
 item.taxonomyConfidence=shape.confidence;
 item.taxonomyReview=certainty;
 item.tags=[primary,subject];
}
rows.forEach(classify);
window.YES_TAXONOMY={version:"2.0.0",total:rows.length,poems:rows.filter(x=>x.section==="poems").length,texts:rows.filter(x=>x.section==="texts").length,review:rows.filter(x=>x.taxonomyReview).length,firstLevel:[...new Set(rows.map(x=>x.category1))],secondLevel:[...new Set(rows.map(x=>x.category2))]};
})();