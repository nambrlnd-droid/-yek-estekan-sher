#!/usr/bin/env python3
"""Bulk discovery and conservative non-religious screening for the 10k poetry project.

Source snapshot: mabidan/ganjoor, train.csv (119,061 rows), dataset card declares
CC-BY-4.0. This script is a candidate-discovery pipeline, NOT final publication approval.
Every record keeps source dataset ID and attribution metadata. Ambiguous/religious records
are excluded from the non-religious pool and counted separately.
"""
from __future__ import annotations
import csv, json, re, sys, urllib.request, unicodedata
from collections import Counter
from pathlib import Path

SOURCE_URL = "https://huggingface.co/datasets/mabidan/ganjoor/resolve/main/train.csv?download=true"
DATASET_URL = "https://huggingface.co/datasets/mabidan/ganjoor"
OUT = Path("corpus-stage-output")
OUT.mkdir(exist_ok=True)
CSV_PATH = OUT / "ganjoor-train.csv"
INDEX_PATH = OUT / "stage1-source-index.jsonl"
POOL_PATH = OUT / "stage2-nonreligious-candidates.jsonl"
EXCLUDED_PATH = OUT / "stage2-excluded-religious-or-ambiguous.jsonl"
REPORT_PATH = OUT / "stage-report.json"

def download():
    if CSV_PATH.exists() and CSV_PATH.stat().st_size > 1_000_000:
        return
    req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "YekEstekanSher-CorpusPipeline/1.0"})
    with urllib.request.urlopen(req, timeout=180) as response, CSV_PATH.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk: break
            out.write(chunk)

def norm(s):
    s = unicodedata.normalize("NFKC", s or "").replace("ي", "ی").replace("ى", "ی").replace("ك", "ک")
    s = re.sub(r"[\u064B-\u065F\u0670]", "", s)
    s = re.sub(r"[\u200c\u200e\u200f]", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()

# Deliberately conservative: explicit sacred figures, rites, religious institutions,
# devotional genres and religious vocabulary all go to the excluded/review bucket.
RELIGIOUS_PATTERNS = [
 r"پیامبر|رسول خدا|محمد مصطفی|مصطفی احمد|خاتم الانبیا",
 r"امام|ائمه|معصوم|اهل.?بیت|آل.?الله|چهارده معصوم",
 r"علی بن ابی.?طالب|امیرالمؤمنین|امیر مومنان|امام علی|یا علی|حیدر|غدیر|نهج.?البلاغه",
 r"فاطمه زهرا|حضرت زهرا|صدیقه|ام.?ابیها|حسن مجتبی|امام حسن|امام حسین|سیدالشهدا|کربلا|عاشورا|نینوا|اباعبدالله|یا حسین",
 r"امام سجاد|زین العابدین|امام باقر|امام صادق|امام کاظم|امام رضا|امام جواد|امام هادی|امام حسن عسکری|امام زمان|صاحب الزمان|مهدی موعود",
 r"حضرت زینب|زینب کبری|ابوالفضل|قمر بنی هاشم|عباس بن علی|علی اکبر|علی اصغر",
 r"قرآن|آیه|سوره|کلام وحی|بسم الله|آیت الکرسی",
 r"دعا|مناجات|زیارت|روضه|مرثیه|مدیحه|مدح اهل.?بیت|نوحه|مولودی|مقتل|تعزیه",
 r"محرم|صفر|اربعین|فاطمیه|شب قدر|رمضان|نیمه شعبان|عید غدیر|عید مبعث|ولادت|شهادت",
 r"مسجد|محراب|منبر|کعبه|حرم|عتبات|نجف|کربلا|مدینه|مکه|بقیع",
 r"خدا|الله|پروردگار|ایزد|یزدان|ربّ|ربوبیت|توحید|نبوت|امامت|معاد|قیامت|بهشت|دوزخ|جهنم|فرشته|ملک",
 r"دین|ایمان|مؤمن|مومن|کافر|کفر|نماز|روزه|حج|زکات|فقه|شرع|شریعت|گناه|ثواب|عقاب|استغفار|توبه"
]
RELIGIOUS_RE = re.compile("|".join("(?:%s)" % p for p in RELIGIOUS_PATTERNS), re.I)

TOPIC_RULES = [
 ("عاشقانه و دلدادگی", r"عشق|عاشق|معشوق|دلدار|دلبر|نگار|جانان|وصال|بوسه|دلداد"),
 ("اجتماعی و انتقادی", r"ستم|ظلم|عدالت|آزادی|آزاد|وطن|ملت|فقیر|غنی|ستمگر|حاکم|استبداد|جنگ|صلح|کارگر|رنجبر|جامعه"),
 ("حکمی و اخلاقی", r"اخلاق|انصاف|نیکی|بدی|خرد|دانش|جهل|آز|طمع|قناعت|تجربه|پند|عبرت|دوستی|وفا"),
 ("طبیعت و توصیف", r"بهار|پاییز|زمستان|تابستان|گل|بلبل|باغ|چمن|کوه|دریا|باران|ابر|باد|آفتاب|ماه|ستاره|صبح|شب"),
 ("حماسی و ملی", r"شاهنامه|رستم|سهراب|اسفندیار|ایران|ایرانی|توران|ضحاک|افراسیاب|تهمتن|پهلوان|نبرد|سپاه"),
 ("فلسفی و تأملی", r"هستی|وجود|عدم|جهان|زمان|مرگ|زندگی|معنا|سرنوشت|عمر|فنا|بقا|آفرینش|اندیشه|فلسفه"),
 ("روایی و داستانی", r"حکایت|داستان|روایت|بود یکی|روزی|پادشاه|درویش|مردی|زنی|گفتا|بگفت"),
 ("طنز و هجو", r"هجو|هزل|طنز|خنده|بخند|مسخره|ریشخند|عیب|مضحک|شوخی")
]
TOPIC_RES = [(name, re.compile(pattern, re.I)) for name, pattern in TOPIC_RULES]

def classify(title, category, body):
    source = norm(category + " " + title)
    text = norm(title + " " + category + " " + body[:5000])
    category_hints = [
      ("عاشقانه و دلدادگی", ("غزلیات عاشقانه", "عاشقانه", "عشق")),
      ("اجتماعی و انتقادی", ("اجتماعی", "سیاسی", "انتقادی", "حبسیه", "وطنی")),
      ("حماسی و ملی", ("حماسی", "شاهنامه", "ملی")),
      ("طبیعت و توصیف", ("طبیعت", "بهاریه", "خزان", "توصیف")),
      ("طنز و هجو", ("هجویات", "هزل", "طنز", "مطایبه")),
      ("روایی و داستانی", ("حکایت", "داستان", "روایی", "مثنوی")),
      ("فلسفی و تأملی", ("فلسفی", "حکمی", "عرفانی")),
    ]
    for topic, hints in category_hints:
        if any(norm(h) in source for h in hints):
            return topic, "category_hint"
    scores = [(topic, len(rx.findall(text))) for topic, rx in TOPIC_RES]
    scores.sort(key=lambda x: x[1], reverse=True)
    if scores and scores[0][1] > 0:
        return scores[0][0], "keyword_heuristic"
    return "نیازمند دسته‌بندی", "unclassified"

def main():
    download()
    counts = Counter()
    topic_counts = Counter()
    seen_ids = set()
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as src, \
         INDEX_PATH.open("w", encoding="utf-8") as idx, \
         POOL_PATH.open("w", encoding="utf-8") as pool, \
         EXCLUDED_PATH.open("w", encoding="utf-8") as excluded:
        reader = csv.DictReader(src)
        required = {"id", "poem", "poet", "cat", "text"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise SystemExit("Unexpected CSV schema: " + repr(reader.fieldnames))
        for row in reader:
            counts["source_rows"] += 1
            rid = str(row.get("id", "")).strip()
            title = (row.get("poem") or "").strip()
            poet = (row.get("poet") or "").strip()
            category = (row.get("cat") or "").strip()
            body = (row.get("text") or "").strip()
            if not rid or rid in seen_ids:
                counts["missing_or_duplicate_id"] += 1
                continue
            seen_ids.add(rid)
            if not body or len(norm(body)) < 20:
                counts["empty_or_short_text"] += 1
                continue
            record = {
              "sourceId": rid, "title": title, "author": poet, "sourceCategory": category,
              "source": "Ganjoor corpus via mabidan/ganjoor (CC-BY-4.0 dataset card)",
              "sourceDatasetUrl": DATASET_URL, "sourceUrl": "https://ganjoor.net",
              "body": body
            }
            idx.write(json.dumps({k:v for k,v in record.items() if k != "body"}, ensure_ascii=False) + "\n")
            counts["stage1_extracted"] += 1
            signal = RELIGIOUS_RE.search(norm(title + " " + category + " " + body))
            if signal:
                record["exclusionReason"] = "religious_or_ambiguous_signal:" + signal.group(0)
                excluded.write(json.dumps(record, ensure_ascii=False) + "\n")
                counts["stage2_excluded_religious_or_ambiguous"] += 1
                continue
            topic, method = classify(title, category, body)
            record.update({
              "category1": "عمومی", "category2": topic,
              "classificationStatus": method,
              "rightsReview": "نیازمند بررسی مستقل پیش از انتشار",
              "reviewStatus": "نامزد استخراج انبوه؛ متن/انتساب/منبع اصلی باید در مرحلهٔ کنترل کیفیت تطبیق شود"
            })
            pool.write(json.dumps(record, ensure_ascii=False) + "\n")
            counts["stage2_nonreligious_candidates"] += 1
            topic_counts[topic] += 1
    report = {
      "source": DATASET_URL, "sourceDatasetLicense": "CC-BY-4.0 (as declared by dataset card)",
      "pipelineVersion": "1.0.0", "counts": dict(counts),
      "candidateTopics": dict(topic_counts),
      "outputs": [INDEX_PATH.name, POOL_PATH.name, EXCLUDED_PATH.name],
      "limitations": [
        "This is a discovery/filtering pool, not a publication-ready corpus.",
        "Religious screening is deliberately conservative and may exclude secular poems containing religious vocabulary.",
        "Non-religious candidates require official-source verification, full-text/attribution checks, deduplication, and rights review before website inclusion.",
        "The dataset is a 2024-derived 119,061-row snapshot, not the latest 138,382-poem official Ganjoor export."
      ]
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
