#!/usr/bin/env python3
"""Build compact, lazy-loadable archive shards for the static poetry site."""
import argparse, collections, gzip, hashlib, json, re
from pathlib import Path

def slug(s):
    return {
      "طبیعت و توصیف":"nature",
      "متفرقه و چندموضوعی":"misc",
      "فلسفی و تأملی":"philosophical",
      "عاشقانه و دلدادگی":"romantic",
      "اجتماعی و انتقادی":"social",
      "طنز و هجو":"satire",
      "حکمی و اخلاقی":"ethical",
      "روایی و داستانی":"narrative",
      "حماسی و ملی":"epic",
    }.get(s, "topic-"+hashlib.sha1(s.encode()).hexdigest()[:8])

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--input",required=True)
    ap.add_argument("--output",required=True)
    args=ap.parse_args()
    out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
    groups=collections.defaultdict(list)
    seen=set()
    with open(args.input,encoding="utf-8") as f:
      for line in f:
        if not line.strip(): continue
        src=json.loads(line)
        sid=str(src.get("sourceId") or "").strip()
        body=str(src.get("body") or "").strip()
        if not sid or not body: continue
        ident="ganjoor-"+sid
        if ident in seen: raise SystemExit("duplicate source ID: "+ident)
        seen.add(ident)
        cat=str(src.get("category2") or "متفرقه و چندموضوعی").strip()
        item={
          "id":ident,"section":"poems","type":"poem","title":str(src.get("title") or ""),
          "author":str(src.get("author") or ""),"body":body,
          "tags":[x for x in [cat,src.get("category3"),src.get("sourceCategory"),src.get("form")] if x],
          "source":"گنجور؛ مجموعهٔ دادهٔ mabidan/ganjoor",
          "sourceUrl":str(src.get("sourceUrl") or "https://ganjoor.net"),
          "sourceId":sid,"sourceDatasetUrl":"https://huggingface.co/datasets/mabidan/ganjoor",
          "category1":"عمومی","category2":cat,
          "category3":str(src.get("category3") or "سایر"),
          "taxonomyConfidence":str(src.get("taxonomyConfidence") or "low"),
          "taxonomyMethod":str(src.get("taxonomyMethod") or "keyword_heuristic"),
          "publicationStatus":str(src.get("publicationStatus") or "دسته‌بندی ماشینی"),
          "rightsReview":str(src.get("rightsReview") or "مجوز مجموعه: CC-BY-4.0؛ وضعیت حقوق تک‌تک آثار مستقل بررسی نشده است"),
          "reviewFlags":src.get("reviewFlags") or []
        }
        groups[cat].append(item)
    manifest={"version":"1.0.0","total":sum(map(len,groups.values())),
      "source":"Ganjoor corpus via mabidan/ganjoor",
      "datasetUrl":"https://huggingface.co/datasets/mabidan/ganjoor",
      "sourceUrl":"https://ganjoor.net",
      "license":"CC-BY-4.0 (dataset card; underlying individual-work rights are not independently verified)",
      "attribution":"متن‌ها از گنجور (ganjoor.net)، از طریق مجموعهٔ دادهٔ mabidan/ganjoor گردآوری شده‌اند؛ گردآورندهٔ مجموعه: Navid Abbaspoor. این بازنشر به معنی تأیید یا وابستگی رسمی گنجور نیست.",
      "classification":"دسته‌بندی ماشینی؛ بدون تأیید انسانی",
      "categories":[]}
    for name,items in sorted(groups.items()):
      file=slug(name)+".json.gz"
      raw=json.dumps(items,ensure_ascii=False,separators=(",",":")).encode("utf-8")
      data=gzip.compress(raw,compresslevel=9,mtime=0)
      (out/file).write_bytes(data)
      manifest["categories"].append({"name":name,"slug":slug(name),"file":file,
        "count":len(items),"compressedBytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
    if manifest["total"]!=56880: raise SystemExit(f"expected 56880 records, got {manifest['total']}")
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"total":manifest["total"],"categories":[(x["name"],x["count"],x["compressedBytes"]) for x in manifest["categories"]]},ensure_ascii=False))
if __name__=="__main__": main()
