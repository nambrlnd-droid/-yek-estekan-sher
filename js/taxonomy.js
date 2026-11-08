/* V1.8 hierarchical editorial taxonomy.
 * Derived fields only: original IDs, bodies, authors, sections, source and tags are preserved.
 * Classification is deterministic and conservative; uncertain records remain explicitly reviewable.
 */
(function () {
"use strict";
const entries = Array.isArray(window.poemEntries) ? window.poemEntries : [];
const pinned = Array.isArray(window.pinnedEntries) ? window.pinnedEntries : [];
const norm = value => String(value == null ? "" : value).normalize("NFKC")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  .replace(/[\u200c\u200e\u200f]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

const sacredEntities = [
 ["امیرالمؤمنین علیه‌السلام", /امیرالمؤمنین|امیر مومنان|امیرالمومنین|علی بن ابی.?طالب|امام علی|یا علی|یاعلی|حیدر|مرتضی|ذوالفقار|غدیر|نهج.?البلاغه|مولای متقیان|ابوتراب/],
 ["حضرت فاطمه زهرا سلام‌الله‌علیها", /حضرت زهرا|فاطمه زهرا|فاطمه بنت رسول|صدیقه کبری|ام.?ابیها|یاس کبود|مادر سادات/],
 ["امام حسن مجتبی علیه‌السلام", /امام حسن|حسن مجتبی|مجتبی|حسن بن علی|کریم اهل.?بیت/],
 ["امام حسین علیه‌السلام", /امام حسین|حسین بن علی|سیدالشهدا|سید الشهدا|کربلا|عاشورا|نینوا|اباعبدالله|یا حسین|یاحسین/],
 ["امام سجاد علیه‌السلام", /امام سجاد|علی بن الحسین|زین العابدین|صحیفه سجادیه/],
 ["امام باقر علیه‌السلام", /امام باقر|محمد باقر|باقر العلوم/],
 ["امام صادق علیه‌السلام", /امام صادق|جعفر بن محمد|جعفر صادق/],
 ["امام کاظم علیه‌السلام", /امام کاظم|موسی بن جعفر|باب الحوائج/],
 ["امام رضا علیه‌السلام", /امام رضا|علی بن موسی|سلطان خراسان|ضامن آهو/],
 ["امام جواد علیه‌السلام", /امام جواد|محمد تقی|جواد الائمه/],
 ["امام هادی علیه‌السلام", /امام هادی|علی نقی|هادی الائمه/],
 ["امام حسن عسکری علیه‌السلام", /امام حسن عسکری|حسن عسکری/],
 ["امام زمان عجل‌الله‌تعالی‌فرجه", /امام زمان|صاحب الزمان|حضرت مهدی|مهدی موعود|قائم آل محمد|غیبت کبری|ظهور امام/],
 ["پیامبر اکرم صلی‌الله‌علیه‌وآله", /پیامبر اکرم|رسول خدا|محمد مصطفی|خاتم الانبیا|حضرت محمد|مصطفی احمد/],
 ["حضرت زینب سلام‌الله‌علیها", /حضرت زینب|زینب کبری|عقیله بنی هاشم/],
 ["حضرت عباس علیه‌السلام", /حضرت عباس|ابوالفضل|قمر بنی هاشم|عباس بن علی/],
 ["حضرت علی‌اکبر علیه‌السلام", /علی اکبر|حضرت علی.?اکبر/],
 ["حضرت علی‌اصغر علیه‌السلام", /علی اصغر|طفل شیرخوار/],
 ["اهل‌بیت علیهم‌السلام", /اهل.?بیت|آل.?الله|عترت|چهارده معصوم|معصومین|ائمه اطهار/]
];

const religiousRules = [
 ["قرآن و معارف قرآنی", /قرآن|آیه|سوره|بسم الله|آیت الکرسی|کلام وحی/],
 ["دعا و مناجات", /دعای|دعا|مناجات|استغفار|توبه|یا رب|پروردگارا|الهی/],
 ["زیارت و عتبات", /زیارت|حرم|عتبات|نجف|کاظمین|سامرا|بین الحرمین|بقیع/],
 ["مناسبت‌ها و آیین‌های دینی", /رمضان|شب قدر|محرم|صفر|اربعین|نیمه شعبان|فاطمیه|ولادت|شهادت|عید مبعث|عید غدیر/],
 ["تاریخ و سیره دینی", /سیره اهل بیت|تاریخ اسلام|هجرت پیامبر|غزوه|جنگ بدر|صفین|جمل|کوفه|مدینه|مکه/],
 ["معارف و اعتقادات", /توحید|نبوت|امامت|معاد|ولایت|شفاعت|بهشت|دوزخ|قیامت|ملائکه|نماز|روزه|حج|عبادت/],
 ["سوگ و مرثیه", /ماتم|عزا|روضه|مرثیه|گریه بر|خون گلو|خون خدا|شهید کربلا/]
];

const sacredSubtopics = [
 ["شهادت و سوگ", /شهادت|شهید|مقتل|کربلا|عاشورا|روضه|گریه|ماتم|عزا|خون خدا/],
 ["غدیر و ولایت", /غدیر|ولایت|امامت|وصایت|مولی|مولای|بیعت/],
 ["عدالت و سیره", /عدالت|قسط|دادگری|حکومت|قضاوت|سیره|حق.?الناس/],
 ["شجاعت و جهاد", /ذوالفقار|شمشیر|نبرد|جهاد|شجاعت|پهلوان|خیبر/],
 ["ولادت و میلاد", /ولادت|میلاد|مولود|تولد|آمده به جهان/],
 ["زیارت و شوق دیدار", /زیارت|حرم|مزار|بین الحرمین|بقیع|نجف|کربلا/],
 ["مدح و منقبت", /مدح|مناقب|فضائل|فضیلت|منقبت|ستایش|ثنا/],
 ["دعا و مناجات", /دعا|مناجات|دعای|خدایا|الهی|پروردگارا/]
];

const generalRules = [
 ["عاشقانه و دلدادگی", "عشق و وصال", /عشق|عاشق|معشوق|دلدار|دلبر|نگار|جانان|بوسه|آغوش|وصال|دلداد|دوستت دارم/],
 ["فراق و دلتنگی", "هجران و دوری", /فراق|هجر|هجران|دوری|دلتنگ|جدایی|بی.?تو|رفتی|نماندی|مهجور/],
 ["تنهایی و غربت", "تنهایی و بی‌کسی", /تنهایی|تنها|غربت|غریب|بی.?کسی|بیگانه|خلوت|انزوا|بی.?همدم/],
 ["امید و انتظار", "امید و چشم‌به‌راهی", /امید|انتظار|منتظر|چشم.?به.?راه|سپیده|گشایش|بازآ|بازگرد/],
 ["رنج و دل‌شکستگی", "اندوه و رنج", /غم|اندوه|رنج|شکست|درد|گریه|اشک|زخم|آزار|دلگیر|خسته/],
 ["عرفان و معنویت", "سلوک و خودسازی", /خدا|خدایا|پروردگار|نماز|سجده|محراب|ذکر|توحید|سلوک|عارف|ملکوت|عبادت/],
 ["حکمت و اخلاق", "فضیلت و رذیلت", /خرد|عقل|اخلاق|نیکی|حسادت|غرور|تواضع|انصاف|عدالت|راستی|دروغ|جوانمرد|قناعت|حرص/],
 ["اجتماعی و انتقادی", "نقد جامعه و زمانه", /مردم|جامعه|وطن|ایران|ستم|ظلم|فقیر|غنی|آزادی|جنگ|صلح|حاکم|ریا|زمانه/],
 ["طبیعت و توصیف", "فصل‌ها و پدیده‌های طبیعی", /بهار|پاییز|زمستان|باران|دریا|کوه|گل|بلبل|باغ|آسمان|خورشید|ماه|ستاره/],
 ["مرگ و گذر عمر", "فنا و ناپایداری", /مرگ|مردن|قبر|خاک|کفن|پیری|عمر|اجل|فنا|زوال/],
 ["طنز و هجو", "طنز و نکته‌پردازی", /خنده|خندید|شوخی|طنز|لبخند|بخند|شوخ|لطیفه|هجو/],
 ["تأمل و اندیشه", "هستی و شناخت", /اندیشه|تفکر|تأمل|معنا|زندگی|جهان|هستی|حقیقت|راز|فلسفه|بودن|نیستی|سرنوشت/],
 ["روایت و داستان", "روایت و حکایت", /حکایت|روایت|داستان|قصه|گفتا|بگفت|چنین گفت/],
 ["حماسی و ملی", "میهن و پهلوانی", /ایران|ایرانی|وطن|میهن|رستم|سهراب|تهمتن|پهلوان|سپاه|نبرد/]
];

const aliases = new Map([
 ["عاشقانه و عاطفی","عاشقانه و دلدادگی"],["عشق و دلدادگی","عاشقانه و دلدادگی"],
 ["اندوه و دلتنگی","فراق و دلتنگی"],["انتظار و دلتنگی","فراق و دلتنگی"],
 ["رنج و دلشکستگی","رنج و دل‌شکستگی"],["تأمل و تفکر","تأمل و اندیشه"],
 ["تأملی و ادبی","تأمل و اندیشه"],["کربلا و عاشورا","امام حسین علیه‌السلام"],
 ["امام حسن مجتبی","امام حسن مجتبی علیه‌السلام"],["مدح و مناقب امیرالمؤمنین","امیرالمؤمنین علیه‌السلام"],
 ["مدح و مناقب اهل‌بیت","اهل‌بیت علیهم‌السلام"],["دینی و آیینی","مناسبت‌ها و آیین‌های دینی"],
 ["شوق زیارت و عتبات","زیارت و عتبات"],["معارف و مناجات","دعا و مناجات"],
 ["امید و تاب‌آوری","امید و انتظار"],["امید و دیدار","امید و انتظار"],
 ["هویت و خودشناسی","تأمل و اندیشه"],["خاطره","خاطره و یادآوری"],
 ["وفاداری","وفاداری و رفاقت"],["همدمی و رفاقت","دوستی و رفاقت"],
 ["طنز و لطافت","طنز و هجو"],["عرفان و معنویت","عرفان و معنویت"],
 ["طبیعت و توصیف","طبیعت و توصیف"],["اجتماعی و انتقادی","اجتماعی و انتقادی"],
 ["حماسی و ملی","حماسی و ملی"],["حکمت و اخلاق","حکمت و اخلاق"],
 ["عاشقانه و دلدادگی","عاشقانه و دلدادگی"],["فراق و دلتنگی","فراق و دلتنگی"],
 ["تنهایی و غربت","تنهایی و غربت"],["مرگ و گذر عمر","مرگ و گذر عمر"],
 ["فلسفی و تأملی","تأمل و اندیشه"],["رنج و دل‌شکستگی","رنج و دل‌شکستگی"]
].map(([a,b])=>[norm(a),b]));

const archiveFallback = new Map([
 ["اجتماعی و انتقادی",["اجتماعی و انتقادی","نقد جامعه و زمانه"]],
 ["حماسی و ملی",["حماسی و ملی","میهن و پهلوانی"]],
 ["حکمی و اخلاقی",["حکمت و اخلاق","فضیلت و رذیلت"]],
 ["روایی و داستانی",["روایت و داستان","روایت و حکایت"]],
 ["طبیعت و توصیف",["طبیعت و توصیف","فصل‌ها و پدیده‌های طبیعی"]],
 ["طنز و هجو",["طنز و هجو","طنز و نکته‌پردازی"]],
 ["عاشقانه و دلدادگی",["عاشقانه و دلدادگی","عشق و وصال"]],
 ["فلسفی و تأملی",["تأمل و اندیشه","هستی و شناخت"]],
 ["متفرقه و چندموضوعی",["موضوعات متنوع","چندموضوعی / نامشخص"]]
]);

const genericTags = new Set(["ادبیات کلاسیک","پیشنهاد‌ومیض","شعر","اشعار","متن","متون","غزل"].map(norm));
function matchRule(text, rules) { for (const rule of rules) if (rule[rule.length-1].test(text)) return rule; return null; }
function classify(item, isPinned) {
 const body=norm(item.body), tags=(Array.isArray(item.tags)?item.tags:[]).filter(x=>typeof x==="string").map(norm);
 const tagText=tags.filter(x=>x&&!genericTags.has(x)).join(" ");
 const sourceCategory=String(item.category||item.archiveCategory||"");
 let entity=null;
 for(const [name,re] of sacredEntities){if(re.test(tagText)){entity=name;break;}}
 if(!entity)for(const [name,re] of sacredEntities){if(re.test(body)){entity=name;break;}}
 let religious=null;
 if(!entity)religious=matchRule(tagText,religiousRules)||matchRule(body,religiousRules);
 let general=null;
 if(!entity&&!religious){
  const religiousAliases=new Set(["مناسبت‌ها و آیین‌های دینی","زیارت و عتبات","دعا و مناجات","قرآن و معارف قرآنی","معارف و اعتقادات","تاریخ و سیره دینی","سوگ و مرثیه"]);
  for(const tag of tags){
   const alias=aliases.get(tag);
   if(!alias)continue;
   if(religiousAliases.has(alias))religious=[alias,/./];
   else general=[alias,"موضوع برگرفته از برچسب موجود"];
   break;
  }
  if(!general&&!religious)general=matchRule(tagText,generalRules)||matchRule(body,generalRules);
 }
 let category1,category2,category3,confidence,review="";
 if(entity){category1="مذهبی";category2=entity;const sacredSubtopic=matchRule(tagText+" "+body,sacredSubtopics);category3=sacredSubtopic?sacredSubtopic[0]:"یادکرد و معارف";confidence=tagText? "high":"medium";}
 else if(religious){category1="مذهبی";category2=religious[0];category3="موضوع دینی";confidence=tagText?"high":"medium";}
 else if(general){category1="عمومی";category2=general[0];category3=general[1];confidence=tagText?"high":"medium";}
 else if(archiveFallback.has(sourceCategory)){
  [category2,category3]=archiveFallback.get(sourceCategory);category1="عمومی";confidence="low";review="برچسب کلی آرشیو؛ نیازمند بازبینی موضوعی";
 } else {
  category1="عمومی";category2=isPinned?"نوشته‌ها و گزیده‌ها":"موضوعات متنوع";category3="نامشخص";confidence="low";review="موضوع از متن و برچسب‌ها با اطمینان تشخیص داده نشد";
 }
 if(isPinned && tags.some(x=>/نامه‌ها و متون تاریخی|پیوندها و منابع/.test(x))){
  category1="عمومی";category2="متون و اسناد";category3="نامه‌ها و منابع";confidence="high";review="";
 }
 // Retain additional independently supplied topic tags as secondary facets.
 const secondary=[];
 for(const tag of tags){
  const alias=aliases.get(tag);
  if(alias&&alias!==category2&&!secondary.includes(alias))secondary.push(alias);
  for(const rule of generalRules){
   if(rule[2].test(tag)&&rule[0]!==category2&&!secondary.includes(rule[0]))secondary.push(rule[0]);
  }
  if(/وفاداری|همدمی|رفاقت/.test(tag)&&!secondary.includes("وفاداری و رفاقت"))secondary.push("وفاداری و رفاقت");
  if(/طنز و لطافت|طنز|هجو/.test(tag)&&!secondary.includes("طنز و هجو"))secondary.push("طنز و هجو");
 }
 item.category1=category1;item.category2=category2;item.category3=category3;
 item.category2Alternates=secondary;
 item.taxonomyTopics=[category2,...secondary].filter(Boolean);
 item.taxonomyConfidence=confidence;item.taxonomyReview=review;
 item.taxonomyVersion="1.8.0";
 if(sourceCategory)item.sourceCategory=sourceCategory;
 return item;
}
function apply(list){(Array.isArray(list)?list:[]).forEach(item=>{if(item&&typeof item==="object")classify(item,false);});}
function refreshSummary(){
 const all=entries.concat(pinned);
 const count=(field,value)=>all.filter(x=>x[field]===value).length;
 const review=all.filter(x=>x.taxonomyReview);
 window.YES_TAXONOMY={
  version:"1.8.0",total:all.length,libraryTotal:entries.length,
  poems:entries.filter(x=>x.section!=="texts").length,
  texts:entries.filter(x=>x.section==="texts").length,pinned:pinned.length,
  review:review.length,reviewIds:review.map(x=>x.id),
  firstLevel:["مذهبی","عمومی"],
  secondLevel:[...new Set(all.map(x=>x.category2).filter(Boolean))],
  thirdLevel:[...new Set(all.map(x=>x.category3).filter(Boolean))],
  count:(level,value)=>count(level==="first"? "category1":level==="second"?"category2":"category3",value),
  classify:item=>classify(item,false),apply:applyAll
 };
 return window.YES_TAXONOMY;
}
function applyAll(){
 apply(entries);pinned.forEach(item=>classify(item,true));
 // YESContent is a normalized copy used by the reader/search APIs. Keep its
 // derived taxonomy in sync without mutating the original text or tag arrays.
 apply(window.YESContent?.poems);
 (Array.isArray(window.YESContent?.pinned)?window.YESContent.pinned:[]).forEach(item=>classify(item,true));
 return refreshSummary();
}
window.YES_TAXONOMY={apply:applyAll,classify:item=>classify(item,false)};
applyAll();
window.addEventListener("yes:web-poems-loaded",applyAll);
window.addEventListener("yes:archive-loaded",event=>{
 const name=event.detail?.category;
 const records=name&&window.YESArchive?.items?window.YESArchive.items(name):[];
 apply(records);
 refreshSummary();
});
window.addEventListener("yes:archive-ready",applyAll);
})();