#!/usr/bin/env python3
"""Stage 3 exact/near-duplicate audit and Stage 4 hierarchical taxonomy."""
import argparse, collections, hashlib, json, re, subprocess, sys, unicodedata
from pathlib import Path
from rapidfuzz.fuzz import ratio

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = Path("stage2-nonreligious-candidates.jsonl")
OUT = Path("stage3-stage4-output")
SITE_INDEX = OUT / "site-corpus-index.jsonl"

def norm(value):
    s = unicodedata.normalize("NFKC", str(value or "")).lower()
    s = s.translate(str.maketrans({"ي":"ی","ى":"ی","ك":"ک","ۀ":"ه","ة":"ه"}))
    s = re.sub(r"[\u064b-\u065f\u0670\u06d6-\u06edـ]", "", s)
    s = re.sub(r"[\u200c\u200e\u200f\u202a-\u202e]", "", s)
    return "".join(ch for ch in s if ch.isalnum())

def read_jsonl(path):
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)

def simhash(text):
    s = norm(text)
    if len(s) < 5:
        grams = [s]
    else:
        grams = [s[i:i+5] for i in range(len(s)-4)]
    vector = [0] * 64
    counts = collections.Counter(grams)
    for gram, weight in counts.items():
        h = int.from_bytes(hashlib.blake2b(gram.encode("utf-8"), digest_size=8).digest(), "big")
        for bit in range(64):
            vector[bit] += weight if (h >> bit) & 1 else -weight
    value = 0
    for bit, score in enumerate(vector):
        if score >= 0:
            value |= 1 << bit
    return value

def hamming(a, b):
    return (a ^ b).bit_count()

def bands(value):
    return [(value >> (16*i)) & 0xffff for i in range(4)]

MAIN_RULES = [
 ("عاشقانه و دلدادگی", [
  r"عشق|عاشق|معشوق|دلدار|دلبر|نگار|جانان|وصال|بوسه|آغوش|دلداد|یار|محبوب",
  r"فراق|هجران|جدایی|دوری|دلتنگ|بی تو|بی‌تو|انتظار دیدار|چشم به راه",
 ]),
 ("اجتماعی و انتقادی", [
  r"وطن|ایران|ملت|مردم|جامعه|آزادی|ستم|ظلم|عدالت|فقیر|غنی|حاکم|سلطان|شاه|وزیر|استبداد|قانون|جنگ|صلح",
 ]),
 ("حکمی و اخلاقی", [
  r"خرد|دانش|نادان|جهل|اخلاق|نیکی|بدی|راستی|دروغ|غرور|تواضع|انصاف|قناعت|حرص|آز|بخشش|جوانمرد",
 ]),
 ("طبیعت و توصیف", [
  r"بهار|پاییز|زمستان|تابستان|باران|دریا|کوه|گل|بلبل|باغ|آسمان|خورشید|ماه|ستاره|ابر|باد|چشمه|رود|دشت|صحرا|لاله|سنبل",
 ]),
 ("حماسی و ملی", [
  r"رستم|سهراب|اسفندیار|زال|تهمتن|کاوه|فریدون|جمشید|ضحاک|ایرج|سیاوش|افراسیاب|توران|ایران زمین|پهلوان|سپاه|نبرد|رزْم|شمشیر",
 ]),
 ("فلسفی و تأملی", [
  r"هستی|نیستی|جهان|زندگی|مرگ|عمر|زمان|روزگار|سرنوشت|اختیار|قضا|قدر|حقیقت|معنا|راز|فنا|بقا|عدم|وجود|هستی",
 ]),
 ("روایی و داستانی", [
  r"حکایت|روایت|داستان|قصه|گفتا|گفتم|بگفت|بشنو|روزی|پادشاه|درویش|بازرگان|مردی بود|زنی بود|شبی",
 ]),
 ("طنز و هجو", [
  r"خنده|خندید|بخند|طنز|هجو|مسخره|ریشخند|شوخی|لطیفه|مضحک|احمق|خر|دزد|بخندید",
 ]),
]
COMPILED = [(name, [re.compile(p) for p in patterns]) for name, patterns in MAIN_RULES]
SUB_RULES = {
 "عاشقانه و دلدادگی": [
  ("فراق و دلتنگی", r"فراق|هجران|جدایی|دوری|دلتنگ|بی تو|بی‌تو|مهجور"),
  ("وصال و دیدار", r"وصال|دیدار|بازآ|بازگرد|رسیدن|به هم رسیدن"),
  ("وفاداری و پیمان", r"وفا|وفادار|پیمان|عهد|قرار"),
  ("زیبایی و ستایش معشوق", r"چشم|زلف|گیسو|رخ|لب|قامت|جمال|زیبا|نگار"),
 ],
 "اجتماعی و انتقادی": [
  ("آزادی و عدالت", r"آزادی|عدالت|حق|حقوق|برابری|قانون"),
  ("نقد قدرت و فساد", r"شاه|سلطان|حاکم|وزیر|دزد|فساد|ستم|ظلم|استبداد"),
  ("وطن و هویت ملی", r"وطن|ایران|ملت|میهن|ایرانی"),
  ("جنگ و صلح", r"جنگ|صلح|سپاه|نبرد|خون|شمشیر"),
 ],
 "حکمی و اخلاقی": [
  ("خرد و دانش", r"خرد|عقل|دانش|جهل|نادان|آموختن"),
  ("فضایل اخلاقی", r"نیکی|راستی|انصاف|تواضع|بخشش|جوانمرد|وفا"),
  ("رذایل اخلاقی", r"غرور|حسد|حرص|آز|دروغ|ریا|ستم"),
 ],
 "طبیعت و توصیف": [
  ("فصل‌ها و آب‌وهوا", r"بهار|پاییز|زمستان|تابستان|باران|برف|باد|ابر"),
  ("گل و باغ", r"گل|بلبل|باغ|لاله|سنبل|سرو|چمن|شکوفه"),
  ("آسمان و اجرام", r"آسمان|خورشید|ماه|ستاره|سپهر|فلک"),
  ("آب و سرزمین", r"دریا|رود|چشمه|کوه|دشت|صحرا|موج"),
 ],
 "حماسی و ملی": [
  ("اسطوره و پهلوانی", r"رستم|سهراب|اسفندیار|زال|تهمتن|کاوه|پهلوان"),
  ("تاریخ و هویت ایران", r"ایران|ایرانی|فریدون|جمشید|ضحاک|سیاوش|افراسیاب"),
  ("نبرد و دلاوری", r"سپاه|نبرد|شمشیر|خون|رزم|جنگ"),
 ],
 "فلسفی و تأملی": [
  ("مرگ و گذر عمر", r"مرگ|عمر|پیری|اجل|قبر|خاک|فنا"),
  ("هستی و حقیقت", r"هستی|نیستی|وجود|عدم|حقیقت|معنا|جهان"),
  ("زمان و سرنوشت", r"زمان|روزگار|سرنوشت|قضا|قدر|بخت"),
 ],
 "روایی و داستانی": [
  ("حکایت و تمثیل", r"حکایت|قصه|روزی|پادشاه|درویش|بازرگان|حیوان"),
  ("روایت عاشقانه", r"عاشق|معشوق|یار|دلبر|وصال|فراق"),
  ("روایت تاریخی", r"تاریخ|شاه|سلطان|وزیر|جنگ|سپاه"),
 ],
 "طنز و هجو": [
  ("هجو و نقد طنزآمیز", r"هجو|مسخره|ریشخند|دزد|شاه|وزیر|حاکم"),
  ("طنز اجتماعی", r"مردم|جامعه|فقیر|غنی|بازار|قاضی"),
  ("لطافت و شوخی", r"خنده|خندید|شوخی|لطیفه|بخند"),
 ],
}
RELIGIOUS_REVIEW = re.compile(
 r"قرآن|پیامبر|رسول خدا|امام|اهل بیت|اهل‌بیت|علی بن ابی|فاطمه|حسن بن علی|حسین بن علی|"
 r"کربلا|عاشورا|غدیر|نماز|مسجد|حرم|زیارت|دعا|مناجات|رمضان|محرم|اربعین|"
 r"بهشت|دوزخ|قیامت|فرشته|ملائکه|وحی|نبوت|امامت|ولایت|شریعت|دین|ایمان|مؤمن|مومن"
)
FORM_RULES = [
 ("رباعی", r"رباعی|رباعیات"),
 ("غزل", r"غزل|غزلیات"),
 ("قصیده", r"قصیده|قصاید"),
 ("مثنوی", r"مثنوی"),
 ("قطعه", r"قطعه|قطعات"),
 ("دوبیتی", r"دوبیتی"),
 ("ترکیب‌بند/ترجیع‌بند", r"ترکیب بند|ترجیع بند"),
 ("قالب نو", r"شعر نو|نیمایی|سپید|آزاد"),
]

def classify(row):
    title = str(row.get("title") or "")
    author = str(row.get("author") or "").strip()
    body = str(row.get("body") or "")
    text = norm(title + " " + body)
    scores = collections.Counter()
    for category, patterns in COMPILED:
        for pattern in patterns:
            scores[category] += len(pattern.findall(text))
    ranked = scores.most_common()
    if not ranked or ranked[0][1] == 0:
        main, confidence = "نیازمند دسته‌بندی", "low"
    else:
        main, top = ranked[0]
        second = ranked[1][1] if len(ranked) > 1 else 0
        if top == second:
            main, confidence = "نیازمند دسته‌بندی", "low"
        elif top >= 3 and top >= second + 2:
            confidence = "medium"
        else:
            confidence = "low"
    sub = "سایرِ " + main if main != "نیازمند دسته‌بندی" else "بازبینی موضوعی"
    sub_scores = []
    for label, pattern in SUB_RULES.get(main, []):
        n = len(re.findall(pattern, text))
        if n:
            sub_scores.append((n, label))
    if sub_scores:
        sub_scores.sort(reverse=True)
        sub = sub_scores[0][1]
        if len(sub_scores) > 1 and sub_scores[0][0] == sub_scores[1][0]:
            sub = "چندموضوعی؛ بازبینی لازم"
            confidence = "low"
    form = "قالب نامشخص"
    for label, pattern in FORM_RULES:
        if re.search(pattern, norm(row.get("sourceCategory") or "")):
            form = label
            break
    flags = []
    if not author:
        flags.append("انتساب نامعلوم")
    if RELIGIOUS_REVIEW.search(title + " " + body):
        flags.append("بازبینی انسانی برای احتمال محتوای مذهبی")
    if confidence == "low":
        flags.append("موضوع نیازمند بازبینی")
    if not row.get("sourceUrl") or row.get("sourceUrl") == "https://ganjoor.net":
        flags.append("پیوند مستقیم اثر باید تکمیل شود")
    row["category1"] = "عمومی"
    row["category2"] = main
    row["category3"] = sub
    row["form"] = form
    row["taxonomyMethod"] = "weighted-keyword-v1"
    row["taxonomyConfidence"] = confidence
    row["taxonomyScores"] = dict(scores)
    row["reviewFlags"] = flags
    row["publicationStatus"] = "نامزد؛ انتشار ممنوع تا کنترل مرحلهٔ ۵ و حقوق"
    return row

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact-dir", default=".")
    ap.add_argument("--site-exporter", default="scripts/export-site-corpus.js")
    args = ap.parse_args()
    artifact = Path(args.artifact_dir)
    candidates_path = artifact / CANDIDATE
    if not candidates_path.exists():
        raise SystemExit(f"Missing candidate file: {candidates_path}")
    OUT.mkdir(parents=True, exist_ok=True)
    subprocess.run(["node", args.site_exporter, str(SITE_INDEX)], cwd=ROOT, check=True)
    site = list(read_jsonl(SITE_INDEX))
    site_by_hash = {}
    site_by_id = {}
    for row in site:
        key = norm(row.get("body"))
        if not key:
            continue
        site_by_hash.setdefault(hashlib.sha256(key.encode()).hexdigest(), row)
        if row.get("id"):
            site_by_id[row["id"]] = row

    exact_groups = {}
    unique = []
    duplicate_rows = []
    for row in read_jsonl(candidates_path):
        key = norm(row.get("body"))
        if not key:
            duplicate_rows.append({**row, "duplicateType":"empty_after_normalization", "duplicateOf":None})
            continue
        digest = hashlib.sha256(key.encode()).hexdigest()
        if digest in site_by_hash:
            target = site_by_hash[digest]
            duplicate_rows.append({**row, "duplicateType":"exact_match_existing_site", "duplicateOf":target.get("id"), "duplicateCollection":target.get("_siteCollection")})
            continue
        if digest in exact_groups:
            target = exact_groups[digest]
            duplicate_rows.append({**row, "duplicateType":"exact_match_candidate_pool", "duplicateOf":target.get("sourceId")})
            continue
        exact_groups[digest] = row
        row["normalizedTextSha256"] = digest
        row["duplicateStatus"] = "exact_unique"
        unique.append(row)

    # Conservative near-duplicate review: SimHash locality bands, then full-string similarity.
    # These pairs are flagged, never automatically discarded.
    combined = []
    for row in site:
        body = norm(row.get("body"))
        if len(body) >= 40:
            combined.append(("site", row, body, simhash(body)))
    near_pairs = []
    buckets = collections.defaultdict(list)
    candidate_near = collections.defaultdict(list)
    checked = set()
    for idx, row in enumerate(unique):
        body = norm(row.get("body"))
        if len(body) < 40:
            continue
        signature = simhash(body)
        possible = set()
        for band_index, band in enumerate(bands(signature)):
            possible.update(buckets[(band_index, band)])
        for previous_index in possible:
            kind, previous, previous_body, previous_sig = combined[previous_index]
            if abs(len(body)-len(previous_body)) / max(len(body),len(previous_body)) > 0.12:
                continue
            if hamming(signature, previous_sig) > 5:
                continue
            score = ratio(body, previous_body)
            if score >= 92:
                pair = {
                    "candidateSourceId": row.get("sourceId"),
                    "candidateTitle": row.get("title"),
                    "candidateAuthor": row.get("author"),
                    "matchType": "near_duplicate_existing_site" if kind == "site" else "near_duplicate_candidate_pool",
                    "matchedId": previous.get("id") if kind == "site" else previous.get("sourceId"),
                    "matchedTitle": previous.get("title"),
                    "matchedAuthor": previous.get("author"),
                    "similarity": round(score, 2),
                }
                near_pairs.append(pair)
                candidate_near[row.get("sourceId")].append(pair)
        # Insert this candidate only after checking earlier records.
        pos = len(combined)
        combined.append(("candidate", row, body, signature))
        for band_index, band in enumerate(bands(signature)):
            buckets[(band_index, band)].append(pos)

    for row in unique:
        matches = candidate_near.get(row.get("sourceId"), [])
        if matches:
            row["duplicateStatus"] = "near_duplicate_review"
            row["nearDuplicateMatches"] = matches[:10]

    classified = [classify(row) for row in unique]
    def write_jsonl(path, rows):
        with path.open("w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    write_jsonl(OUT / "stage3-deduplicated-candidates.jsonl", unique)
    write_jsonl(OUT / "stage3-exact-duplicates.jsonl", duplicate_rows)
    write_jsonl(OUT / "stage3-near-duplicate-review.jsonl", near_pairs)
    write_jsonl(OUT / "stage4-hierarchical-taxonomy.jsonl", classified)
    write_jsonl(OUT / "site-corpus-index.jsonl", site)

    topic_counts = collections.Counter(x["category2"] for x in classified)
    subtopic_counts = collections.Counter((x["category2"], x["category3"]) for x in classified)
    flag_counts = collections.Counter(flag for x in classified for flag in x["reviewFlags"])
    author_counts = collections.Counter(x.get("author") or "بدون انتساب" for x in classified)
    duplicate_types = collections.Counter(x["duplicateType"] for x in duplicate_rows)
    report = {
      "pipelineVersion":"stage3-4-v1.0.0",
      "sourceCandidateCount":sum(1 for _ in read_jsonl(candidates_path)),
      "siteMainCount":sum(1 for x in site if x.get("_siteCollection")=="main"),
      "sitePinnedCount":sum(1 for x in site if x.get("_siteCollection")=="pinned"),
      "siteTotalCount":len(site),
      "stage3ExactUniqueCount":len(unique),
      "stage3ExactDuplicateCount":len(duplicate_rows),
      "exactDuplicateTypes":dict(duplicate_types),
      "stage3NearDuplicatePairCount":len(near_pairs),
      "stage3CandidatesFlaggedForNearReview":sum(1 for x in unique if x.get("duplicateStatus")=="near_duplicate_review"),
      "stage4TopicCounts":dict(topic_counts),
      "stage4SubtopicCounts":{f"{a} / {b}":n for (a,b),n in sorted(subtopic_counts.items())},
      "stage4ReviewFlagCounts":dict(flag_counts),
      "topAuthors":author_counts.most_common(30),
      "notes":[
        "Exact duplicates are excluded from the Stage 3 unique pool; the original site data is never modified.",
        "Near duplicates are only flagged for human review and remain in the unique pool.",
        "Stage 4 categories are machine-generated editorial suggestions, not verified classifications.",
        "All candidates remain blocked from publication pending Stage 5 text, attribution, religious-content, source-URL and rights review.",
        "Religious vocabulary triggers a manual review flag; it does not silently delete or approve a candidate.",
        "The first-level category is 'عمومی' for this non-religious discovery pool; form is recorded separately from subject."
      ]
    }
    (OUT / "stage3-stage4-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({
      "candidateCount":report["sourceCandidateCount"],
      "siteCount":len(site),
      "exactUnique":len(unique),
      "exactDuplicates":len(duplicate_rows),
      "nearDuplicatePairs":len(near_pairs),
      "topicCounts":dict(topic_counts),
      "reviewFlags":dict(flag_counts),
      "outputDir":str(OUT)
    },ensure_ascii=False))
if __name__ == "__main__":
    main()
