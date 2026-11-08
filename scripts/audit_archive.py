#!/usr/bin/env python3
"""Read-only integrity audit for the compressed poetry archive."""
from __future__ import annotations
import hashlib, json, re, sys, gzip, unicodedata
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "poetry-archive"
MANIFEST = ARCHIVE / "manifest.json"

def norm(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("ي", "ی").replace("ى", "ی").replace("ك", "ک")
    value = re.sub(r"[\u064b-\u065f\u0670\u200c\u200e\u200fـ]", "", value)
    return re.sub(r"[\s\W_]+", "", value, flags=re.UNICODE).lower()

def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors, warnings = [], []
    declared_total = int(manifest.get("total", -1))
    categories = manifest.get("categories", [])
    declared_sum = sum(int(c.get("count", 0)) for c in categories)
    if declared_sum != declared_total:
        errors.append(f"manifest category sum {declared_sum} != total {declared_total}")

    ids, bodies = set(), {}
    category_results = []
    duplicate_body_count = 0
    missing_author_count = 0
    missing_title_count = 0
    record_total = 0

    for category in categories:
        name, filename = category.get("name", ""), category.get("file", "")
        path = ARCHIVE / filename
        if not path.is_file():
            errors.append(f"{name}: missing file {filename}")
            continue
        raw = path.read_bytes()
        if len(raw) != int(category.get("compressedBytes", -1)):
            errors.append(f"{name}: compressed byte count mismatch")
        digest = hashlib.sha256(raw).hexdigest()
        if digest != category.get("sha256"):
            errors.append(f"{name}: SHA-256 mismatch")
        try:
            payload = gzip.decompress(raw)
            records = json.loads(payload.decode("utf-8"))
        except Exception as exc:
            errors.append(f"{name}: gzip/JSON decode failed: {exc}")
            continue
        if not isinstance(records, list):
            errors.append(f"{name}: JSON root is not an array")
            continue
        if len(records) != int(category.get("count", -1)):
            errors.append(f"{name}: record count {len(records)} != manifest {category.get('count')}")
        local_ids = set()
        for index, item in enumerate(records):
            if not isinstance(item, dict):
                errors.append(f"{name}[{index}]: record is not an object")
                continue
            rid = str(item.get("id") or "").strip()
            body = str(item.get("body") or "").strip()
            if not rid:
                errors.append(f"{name}[{index}]: missing id")
            elif rid in local_ids or rid in ids:
                errors.append(f"{name}[{index}]: duplicate id {rid}")
            else:
                local_ids.add(rid)
                ids.add(rid)
            if not body:
                errors.append(f"{name}[{index}]: empty body")
            else:
                key = norm(body)
                if key in bodies:
                    duplicate_body_count += 1
                else:
                    bodies[key] = rid or f"{name}:{index}"
            if not str(item.get("author") or "").strip():
                missing_author_count += 1
            if not str(item.get("title") or "").strip():
                missing_title_count += 1
        record_total += len(records)
        category_results.append({
            "name": name, "file": filename, "records": len(records),
            "compressed_bytes": len(raw), "sha256": digest,
            "unique_ids_in_shard": len(local_ids)
        })

    if record_total != declared_total:
        errors.append(f"decoded total {record_total} != manifest total {declared_total}")
    if duplicate_body_count:
        warnings.append(f"{duplicate_body_count} normalized body duplicates found; none were changed or removed")

    result = {
        "status": "passed" if not errors else "failed",
        "manifest_total": declared_total,
        "decoded_total": record_total,
        "category_count": len(categories),
        "unique_ids": len(ids),
        "duplicate_normalized_bodies": duplicate_body_count,
        "missing_author": missing_author_count,
        "missing_title": missing_title_count,
        "categories": category_results,
        "warnings": warnings,
        "errors": errors,
        "read_only": True
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if "GITHUB_STEP_SUMMARY" in __import__("os").environ:
        with open(__import__("os").environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as out:
            out.write("## V1.8 archive audit\n\n")
            out.write(f"- Status: **{result['status']}**\n")
            out.write(f"- Records: **{record_total:,} / {declared_total:,}**\n")
            out.write(f"- Unique IDs: **{len(ids):,}**\n")
            out.write(f"- Duplicate normalized bodies: **{duplicate_body_count:,}** (reported only; no deletion)\n")
            out.write(f"- Missing author/title: **{missing_author_count:,} / {missing_title_count:,}**\n")
            for error in errors:
                out.write(f"- ERROR: {error}\n")
            for warning in warnings:
                out.write(f"- WARNING: {warning}\n")
    return 1 if errors else 0

if __name__ == "__main__":
    raise SystemExit(main())
