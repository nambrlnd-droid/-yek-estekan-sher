/* Hierarchical taxonomy engine for Yek Estekan Sher — v3.0.0.
   Original source fields are immutable; only derived taxonomy fields are assigned. */
(function(){
"use strict";
const entries=Array.isArray(window.poemEntries)?window.poemEntries:[];
const pinned=Array.isArray(window.pinnedEntries)?window.pinnedEntries:[];
const norm=v=>String(v==null?"":v).normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک")
 .replace(/[\u064b-\u065f\u0670]/g,"").replace(/[\u200c\u200e\u200fـ]/g," ")
 .replace(/\s+/g," ").trim().toLowerCase();
const make=(c1,c2,c3,confidence,reason)=>({category1:c1,category2:c2,category3:c3||"",confidence,reason});
const sacred=[
 ["امیرالمؤمنین علیه‌السلام",/(امیرالمؤمنین|امیر مومنان|امیرالمومنین|علی بن ابی.?طالب|امام علی|یا علی|یاعلی|حیدر|مرتضی|ذوالفقار|غدیر|نهج.?البلاغه|مولای متقیان|ابوتراب|نجف)/],
 ["حضرت فاطمه زهرا سلام‌الله‌علیها",/(حضرت زهرا|فاطمه زهرا|یا زهرا|یازهرا|صدیقه کبری|ام.?ابیها|مادر سادات)/],
 ["امام حسن مجتبی علیه‌السلام",/(امام حسن مجتبی|حسن مجتبی|مجتبی|حسن بن علی|کریم اهل.?بیت|سبط اکبر|امام حسن و بقیع)/],
 ["امام حسین علیه‌السلام",/(امام حسین|حسین بن علی|سیدالشهدا|سید الشهدا|کربلا|عاشورا|نینوا|اباعبدالله|یا حسین|یاحسین)/],
 ["امام سجاد علیه‌السلام",/(امام سجاد|علی بن الحسین|زین العابدین|صحیفه سجادیه)/],
 ["امام باقر علیه‌السلام",/(امام باقر|محمد باقر|باقر العلوم)/],
 ["امام صادق علیه‌السلام",/(امام صادق|جعفر بن محمد|جعفر صادق)/],
 ["امام کاظم علیه‌السلام",/(امام کاظم|موسی بن جعفر|باب الحوائج)/],
 ["امام رضا علیه‌السلام",/(امام رضا|علی بن موسی|سلطان خراسان|ضامن آهو)/],
 ["امام جواد علیه‌السلام",/(امام جواد|محمد تقی|جواد الائمه)/],
 ["امام هادی علیه‌السلام",/(امام هادی|علی نقی|هادی الائمه)/],
 ["امام حسن عسکری علیه‌السلام",/(امام حسن عسکری|حسن عسکری)/],
 ["امام زمان عجل‌الله‌تعالی‌فرجه",/(امام زمان|صاحب الزمان|حضرت مهدی|مهدی موعود|قائم آل محمد|یا مهدی|یامهدی|غیبت کبری|انتظار و فرج)/],
 ["پیامبر اکرم صلی‌الله‌علیه‌وآله",/(پیامبر|رسول خدا|محمد مصطفی|خاتم الانبیا|حضرت محمد|مصطفی احمد)/],
 ["حضرت زینب سلام‌الله‌علیها",/(حضرت زینب|زینب کبری|عقیله بنی هاشم)/],
 ["حضرت عباس علیه‌السلام",/(حضرت عباس|ابوالفضل|قمر بنی هاشم|عباس بن علی|یا عباس)/],
 ["حضرت علی‌اکبر علیه‌السلام",/(علی اکبر|حضرت علی.?اکبر)/],
 ["حضرت علی‌اصغر علیه‌السلام",/(علی اصغر|طفل شیرخوار|رباب)/],
 ["اهل‌بیت علیهم‌السلام",/(اهل.?بیت|آل.?الله|عترت|چهارده معصوم|معصومین|ائمه اطهار)/]
];
const religiousTags=new Map([
 ["قرآن و معارف قرآنی",["قرآن","آیات و سوره‌ها"]],
 ["دعا و مناجات",["دعا و نیایش","مناجات","معارف و مناجات"]],
 ["زیارت و عتبات",["زیارت و اشتیاق","عتبات","شوق زیارت و عتبات"]],
 ["مناسبت‌ها و آیین‌های دینی",["مناسبت و آیین","رمضان و شب‌های قدر","محرم و صفر","اربعین","دینی و آیینی"]],
 ["معارف و اعتقادات",["توحید و معرفت","ولایت و امامت","معاد و قیامت"]],
 ["تاریخ و سیره دینی",["سیره و تاریخ","تاریخ اسلام"]],
 ["سوگ و مرثیه",["مرثیه و سوگ","روضه","سوگواری"]]
]);
const generalAliases=new Map([
 ["عاشقانه و عاطفی","عاشقانه و دلدادگی"],["عشق و دلدادگی","عاشقانه و دلدادگی"],["فراق و دلتنگی","فراق و دلتنگی"],
 ["تنهایی و غربت","فراق و دلتنگی"],["رنج و دل‌شکستگی","عاشقانه و دلدادگی"],["امید و تاب‌آوری","فلسفی و تأملی"],
 ["حکمی و اخلاقی","حکمت و اخلاق"],["اجتماعی و انتقادی","اجتماعی و انتقادی"],["طبیعت و توصیف","طبیعت و توصیف"],
 ["طنز و لطافت","طنز و هجو"],["تأمل و اندیشه","فلسفی و تأملی"],["فلسفی و تأملی","فلسفی و تأملی"],
 ["روایی و داستانی","روایی و داستانی"],["حماسی و ملی","حماسی و ملی"],["متفرقه و چندموضوعی","متفرقه و چندموضوعی"],
 ["غزل","غزل و ادبیات کلاسیک"],["ادبیات کلاسیک","غزل و ادبیات کلاسیک"]
]);
const archiveMap=new Map([
 ["اجتماعی و انتقادی","اجتماعی و انتقادی"],["حماسی و ملی","حماسی و ملی"],["حکمی و اخلاقی","حکمت و اخلاق"],
 ["روایی و داستانی","روایی و داستانی"],["طبیعت و توصیف","طبیعت و توصیف"],["طنز و هجو","طنز و هجو"],
 ["عاشقانه و دلدادگی","عاشقانه و دلدادگی"],["فلسفی و تأملی","فلسفی و تأملی"],["متفرقه و چندموضوعی","متفرقه و چندموضوعی"]
]);
const generalRules=[
 ["عاشقانه و دلدادگی",/(عشق|عاشق|معشوق|دلدار|دلبر|نگار|جانان|وصال|دلداد|دوستت دارم)/],
 ["فراق و دلتنگی",/(فراق|هجران|دوری از تو|دلتنگ|جدایی|بی.?تو|مهجور)/],
 ["حکمت و اخلاق",/(خرد|عقل|اخلاق|نیکی|حسادت|غرور|تواضع|انصاف|عدالت|راستی|دروغ|جوانمرد|قناعت|حرص)/],
 ["اجتماعی و انتقادی",/(ستم|ظلم|فقیر|آزادی|وطن|ایران|حاکم|ریا|عدالت اجتماعی|زمانه)/],
 ["طبیعت و توصیف",/(بهار|پاییز|زمستان|باران|دریا|کوه|گلستان|بلبل|باغ|آسمان|خورشید|ستاره)/],
 ["طنز و هجو",/(طنز|هجو|لطیفه|خنده|لبخند|شوخی|بخند)/],
 ["فلسفی و تأملی",/(هستی|حقیقت|معنای زندگی|سرنوشت|فنا|زوال|گذر عمر|مرگ|جهان|زندگی)/],
 ["روایی و داستانی",/(حکایت|روایت|قصه|داستان)/],
 ["حماسی و ملی",/(پهلوان|رستم|سیاوش|ایران زمین|حماسه)/]
];
const subRules=[
 ["مدح و منقبت",/(مدح|مناقب|ستایش|ثنا|فدایت|فدای تو|یا علی|یا حسین)/],
 ["مرثیه و سوگ",/(عزا|عزاداری|ماتم|گریه|اشک|مصیبت|سوگ|روضه|شهید|شهادت|قتلگاه|تشییع)/],
 ["ولادت",/(ولادت|میلاد|متولد|قدم مبارک)/],
 ["شهادت",/(شهادت|شهید|ضربت|مسموم|قتلگاه)/],
 ["غدیر و ولایت",/(غدیر|ولایت|وصایت|جانشین|بیعت)/],
 ["زیارت و اشتیاق",/(زیارت|حرم|ضریح|عتبات|نجف|کربلا|مشهد|بقیع)/],
 ["انتظار و فرج",/(انتظار|منتظر|ظهور|فرج|دوران غیبت)/],
 ["دعا و نیایش",/(دعا|مناجات|یا رب|الهی|پروردگارا|استغفار)/],
 ["توحید و معرفت",/(توحید|خالق|خداوند|معرفت|اسماء الهی)/],
 ["قرآن و آیات",/(قرآن|آیه|سوره|بسم الله|آیت الکرسی)/],
 ["سیره و تاریخ",/(سیره|هجرت|غزوه|بدر|صفین|جمل|تاریخ اسلام)/],
 ["مناسبت و آیین",/(رمضان|شب قدر|محرم|صفر|اربعین|فاطمیه|عید مبعث|عید غدیر)/],
 ["وصال و دیدار",/(وصال|دیدار|به وصلم|رسیدن به یار)/],
 ["جدایی و هجران",/(فراق|هجر|هجران|جدایی|دوری)/],
 ["وفاداری",/(وفا|وفادار|پیمان|عهد)/],
 ["شوق و دلدادگی",/(شوق|اشتیاق|دلدادگی|دل سپردن)/],
 ["رنج و دل‌شکستگی",/(دل‌شکسته|دلشکسته|رنج|اندوه|غم|زخم)/],
 ["خرد و دانایی",/(خرد|دانایی|دانش|عقل|حکمت)/],
 ["فضیلت و رذیلت",/(فضیلت|رذیلت|حسادت|غرور|تواضع|قناعت)/],
 ["عدالت و انصاف",/(عدالت|انصاف|ستم|ظلم)/],
 ["نصیحت و پند",/(پند|نصیحت|باید|مبادا|عبرت)/],
 ["وطن و هویت",/(وطن|ایران|میهن|هویت)/],
 ["ستم و عدالت‌خواهی",/(ستم|ظلم|استبداد|عدالت‌خواهی)/],
 ["نقد جامعه و زمانه",/(جامعه|مردم|زمانه|حاکم|ریا)/],
 ["جنگ و صلح",/(جنگ|صلح|نبرد|آشتی)/],
 ["بهار و شکوفایی",/(بهار|شکوفه|نوروز)/],
 ["پاییز و زمستان",/(پاییز|زمستان|برف|سرما)/],
 ["آب و باران و دریا",/(باران|دریا|موج|رود|باران)/],
 ["گل و باغ",/(گل|باغ|بلبل|لاله|نرگس)/],
 ["آسمان و اجرام آسمانی",/(آسمان|خورشید|ماه|ستاره|سپهر)/],
 ["هستی و حقیقت",/(هستی|حقیقت|وجود|معنا)/],
 ["زندگی و سرنوشت",/(زندگی|سرنوشت|روزگار)/],
 ["مرگ و گذر عمر",/(مرگ|عمر|اجل|پیری|فنا|زوال)/],
 ["خودشناسی و هویت",/(خودشناسی|خویشتن|هویت|من کیستم)/],
 ["روایت و حکایت",/(حکایت|روایت|قصه|داستان)/],
 ["حماسه و پهلوانی",/(پهلوان|رستم|سیاوش|حماسه)/]
];
const generic=new Set(["شعر","اشعار","متن","متون","غزل","ادبیات کلاسیک","پیشنهاد ومیض"]);
function strings(tags){return (Array.isArray(tags)?tags:[]).filter(x=>typeof x==="string"&&x.trim()&&!/^\d+$/.test(x.trim())).map(x=>norm(x));}
function classify(item,isPinned){
 const body=norm(item.body), tags=strings(item.tags), combined=tags.join(" ");
 const text=isPinned ? tags.some(t=>/(نامه‌ها و متون تاریخی|پیوندها و منابع)/.test(t)) : item.section==="texts";
 const isText=!!text;
 const paths=[];
 const add=(c1,c2,c3,confidence,reason)=>{
  if(!c2)return;
  const p=make(c1,c2,c3,confidence,reason);
  if(!paths.some(x=>x.category1===p.category1&&x.category2===p.category2&&x.category3===p.category3))paths.push(p);
 };
 // Explicit entity labels and strong entity phrases are the most specific religious evidence.
 for(const [name,re] of sacred){
  const explicit=tags.some(t=>re.test(t)||norm(name)===t);
  const inBody=re.test(body);
  if(explicit||inBody)add("مذهبی",name,subRules.find(([,sr])=>sr.test(combined+" "+body))?.[0]||"",explicit?"high":"medium",explicit?"برچسب صریح":"قرینهٔ متنی");
 }
 // Explicit religious-domain tags.
 for(const [name,aliases] of religiousTags){
  if(tags.some(t=>aliases.some(a=>norm(a)===t)||norm(name)===t))add("مذهبی",name,subRules.find(([,sr])=>sr.test(combined+" "+body))?.[0]||"", "high","برچسب صریح");
 }
 // General source tags are accepted only as exact/known labels.
 for(const tag of tags){
  if(generic.has(tag))continue;
  const mapped=generalAliases.get(tag);
  if(mapped)add("عمومی",mapped,subRules.find(([,sr])=>sr.test(tag+" "+body))?.[0]||"", "high","برچسب موضوعی");
 }
 // Detect clear general subjects only when no explicit religious path competes.
 if(!paths.some(p=>p.category1==="مذهبی")){
  for(const [name,re] of generalRules)if(re.test(body))add("عمومی",name,subRules.find(([,sr])=>sr.test(body))?.[0]||"","medium","قرینهٔ متنی");
 }
 // Keep multiple explicitly-supported paths, but do not promote vague single words.
 if(!paths.length){
  const archiveLabel=String(item.archiveCategory||item.archive_category||item.genre||item.category||"").trim();
  const mapped=archiveMap.get(archiveLabel);
  if(mapped)add("عمومی",mapped,"","medium","دستهٔ کلان آرشیو");
 }
 if(!paths.length){
  if(isText)add("عمومی","نوشته‌ها و متون","","low","نوع محتوا؛ موضوع نامشخص");
  else add("عمومی","متفرقه و چندموضوعی","موضوع نامشخص","low","موضوع از دادهٔ موجود احراز نشد");
 }
 // If a source tag contains several distinct topics, retain each supported path.
 const primary=paths[0];
 item.contentType=isText?"text":"poem";
 item.category1=primary.category1;
 item.category2=primary.category2;
 item.category3=primary.category3||"";
 item.taxonomyPaths=paths.map(p=>({category1:p.category1,category2:p.category2,category3:p.category3}));
 item.taxonomyConfidence=primary.confidence;
 item.taxonomyReason=primary.reason;
 item.taxonomyReview=primary.confidence==="low"?"نیازمند بازبینی":(primary.confidence==="medium"?"بازبینی نمونه‌ای":"");
}
function applyTaxonomy(list,pinnedList){
 (list||entries).forEach(x=>classify(x,false));
 (pinnedList||pinned).forEach(x=>classify(x,true));
 const all=(list||entries).concat(pinnedList||pinned);
 const counts={total:all.length,review:0,multiPath:0,byPrimary:{},bySecondary:{}};
 for(const x of all){
  if(x.taxonomyReview)counts.review++;
  if((x.taxonomyPaths||[]).length>1)counts.multiPath++;
  counts.byPrimary[x.category1]=(counts.byPrimary[x.category1]||0)+1;
  counts.bySecondary[x.category2]=(counts.bySecondary[x.category2]||0)+1;
 }
 window.YES_TAXONOMY={version:"3.0.0",...counts,apply:applyTaxonomy,classify:item=>classify(item,false)};
 return window.YES_TAXONOMY;
}
applyTaxonomy();
window.addEventListener("yes:web-poems-loaded",()=>applyTaxonomy());
window.addEventListener("yes:archive-loaded",event=>{
 const records=window.YESArchive?.items(event.detail?.category)||[];
 records.forEach(x=>classify(x,false));
});
window.addEventListener("yes:archive-data-ready",()=>{
 const all=window.poemEntries||[];
 all.forEach(x=>{if(!x.category1||!x.taxonomyPaths)classify(x,false);});
 applyTaxonomy(all,pinned);
});
window.addEventListener("yes:content-ready",()=>applyTaxonomy());
})();
