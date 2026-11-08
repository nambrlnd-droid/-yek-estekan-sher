#!/usr/bin/env python3
"""Build a source-traceable prosody index from two openly licensed Ganjoor-derived corpora.

Priority:
1. Exact adjacent-hemistich matches in expert-annotated P3R couplets.
2. Exact full-poem matches in cnababaie/persian-poetry-meters, used as a
   supplement or to enrich a P3R match only when the meter pattern agrees.

No fuzzy matching or guessed meter labels are published.
"""
from __future__ import annotations

import csv
import gzip
import hashlib
import json
import re
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "poetry-archive"
CACHE = ROOT / ".cache"
CORPUS = CACHE / "P3R.csv"
SITE_POEMS = CACHE / "site-poems.json"
FULL_POEM_CORPUS = CACHE / "poems.csv"
OUT = ARCHIVE / "prosody-index.json.gz"
SUMMARY = ARCHIVE / "prosody-index-summary.json"

P3R_URL = "https://media.githubusercontent.com/media/m-shahrestani/Prosody-Recognition-in-Persian-Poetry/4a2dcea81967778fc42140dab57e45365723bf7d/dataset/P3R.csv"
P3R_NAME = "P3R — Prosody Recognition in Persian Poetry"
P3R_REPOSITORY = "https://github.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry"
P3R_REVISION = "4a2dcea81967778fc42140dab57e45365723bf7d"
P3R_LICENSE = "MIT and CC BY 4.0"
PROSODY_URL = "https://raw.githubusercontent.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry/4a2dcea81967778fc42140dab57e45365723bf7d/dataset/prosodies.txt"
PROSODY_FILE = CACHE / "prosodies.txt"

FULL_NAME = "cnababaie/persian-poetry-meters"
FULL_REPOSITORY = "https://huggingface.co/datasets/cnababaie/persian-poetry-meters"
FULL_REVISION = "408b79e"
FULL_URL = f"https://huggingface.co/datasets/cnababaie/persian-poetry-meters/resolve/{FULL_REVISION}/poems.csv?download=true"
FULL_SHA256 = "42830c43cfcd758debe88eefe8b8578d553a3218d940c60d7917447ba7075cf1"
FULL_LICENSE = "Apache-2.0"


def norm(value: object) -> str:
    value = unicodedata.normalize("NFKC", str(value or ""))
    value = value.translate(str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه",
        "\u200c": "", "\u200e": "", "\u200f": "", "\u0640": "",
    }))
    value = re.sub(r"[\u064b-\u065f\u0670]", "", value)
    return re.sub(r"[\s\W_]+", "", value, flags=re.UNICODE).lower()


def download(url: str, path: Path, min_size: int = 1, expected_sha256: str | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size >= min_size:
        if not expected_sha256 or hashlib.sha256(path.read_bytes()).hexdigest() == expected_sha256:
            print(f"Using cached {path.name} ({path.stat().st_size:,} bytes)")
            return
        path.unlink()
    request = urllib.request.Request(url, headers={"User-Agent": "YekEstekanSher-ProsodyIndexer/1.0"})
    print(f"Downloading {path.name} from {url}")
    digest = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(request, timeout=120) as response, path.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
            digest.update(chunk)
            total += len(chunk)
            if total and total % (25 * 1024 * 1024) < 1024 * 1024:
                print(f"Downloaded {path.name}: {total / (1024 * 1024):.0f} MiB")
    if total < min_size:
        raise RuntimeError(f"Download looks incomplete for {path.name}: {total:,} bytes")
    actual = digest.hexdigest()
    if expected_sha256 and actual != expected_sha256:
        path.unlink(missing_ok=True)
        raise RuntimeError(f"SHA-256 mismatch for {path.name}: expected {expected_sha256}, got {actual}")
    print(f"Downloaded {path.name}: {total:,} bytes; SHA-256 {actual}")


def read_prosody_map() -> dict[str, str]:
    download(PROSODY_URL, PROSODY_FILE)
    mapping: dict[str, str] = {}
    digits = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
    for line in PROSODY_FILE.read_text(encoding="utf-8-sig").splitlines():
        if " - " not in line:
            continue
        label, raw_id = line.rsplit(" - ", 1)
        prosody_id = raw_id.strip().translate(digits)
        if prosody_id.isdigit():
            mapping[prosody_id] = label.strip()
    if not mapping:
        raise RuntimeError("Could not parse the upstream prosody ID mapping")
    return mapping


def read_p3r_corpus() -> tuple[dict[tuple[str, str], Counter], dict[str, str], int]:
    download(P3R_URL, CORPUS, min_size=100_000_000)
    prosody_map = read_prosody_map()
    pair_labels: dict[tuple[str, str], Counter] = defaultdict(Counter)
    rows = 0
    with CORPUS.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"VERSE1", "VERSE2", "PROSODY"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise RuntimeError(f"Unexpected P3R columns: {reader.fieldnames}")
        for row in reader:
            first, second = norm(row.get("VERSE1")), norm(row.get("VERSE2"))
            raw_id = str(row.get("PROSODY_ID") or "").strip()
            meter_key = raw_id if raw_id and raw_id.lower() != "nan" else " ".join(str(row.get("PROSODY") or "").split())
            if first and second and meter_key:
                pair_labels[(first, second)][meter_key] += 1
            rows += 1
            if rows % 200_000 == 0:
                print(f"Read {rows:,} P3R couplets; unique exact pairs: {len(pair_labels):,}")
    print(f"Finished P3R: {rows:,} rows; {len(pair_labels):,} unique exact pairs")
    return pair_labels, prosody_map, rows


def read_full_poem_corpus() -> tuple[dict[str, dict], set[str], int]:
    download(FULL_URL, FULL_POEM_CORPUS, min_size=150_000_000, expected_sha256=FULL_SHA256)
    profiles: dict[str, dict] = {}
    conflicts: set[str] = set()
    rows = 0
    with FULL_POEM_CORPUS.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"poem", "persian_meter", "arabic_meter", "persian_meter_with_diacritics", "meter_signs"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise RuntimeError(f"Unexpected full-poem corpus columns: {reader.fieldnames}")
        for row in reader:
            rows += 1
            key = norm(row.get("poem"))
            meter = " ".join(str(row.get("persian_meter") or "").split())
            if not key or not meter:
                continue
            profile = {
                "meter": meter,
                "bahr": " ".join(str(row.get("arabic_meter") or "").split()) or None,
                "arkan": " ".join(str(row.get("persian_meter_with_diacritics") or meter).split()),
                "scansion": " ".join(str(row.get("meter_signs") or "").split()) or None,
                "scansionType": "arkan-signs",
                "scansionSource": "meter_signs field in source dataset",
                "sourceDataset": FULL_NAME,
                "sourceDatasetRevision": FULL_REVISION,
                "sourceDatasetUrl": FULL_REPOSITORY,
                "sourceLicense": FULL_LICENSE,
                "meterSource": "dataset meter label; row-level origin is not included in poems.csv",
                "sourceProvenance": "در فایل CSV منشأ هر ردیف مشخص نشده؛ مستندات مجموعه می‌گوید بخشی از وزن/تقطیع‌ها بازسازی‌شده‌اند",
                "scansionProvenance": "در فایل CSV منشأ تقطیع هر ردیف مشخص نشده؛ مستندات مجموعه می‌گوید بخشی از تقطیع‌ها بازسازی شده‌اند",
                "status": "external_source_matched",
                "confidence": "exact_full_poem_match",
                "lineScansionAvailable": False,
                "reviewer": None,
                "reviewedAt": None,
            }
            previous = profiles.get(key)
            if previous and any(norm(previous.get(field)) != norm(profile.get(field)) for field in ("meter", "bahr", "arkan", "scansion")):
                conflicts.add(key)
            elif not previous:
                profiles[key] = profile
            if rows % 20_000 == 0:
                print(f"Read {rows:,} full poems; unique normalized texts: {len(profiles):,}; conflicts: {len(conflicts):,}")
    for key in conflicts:
        profiles.pop(key, None)
    print(f"Finished full-poem corpus: {rows:,} rows; usable exact keys: {len(profiles):,}; conflicts excluded: {len(conflicts):,}")
    return profiles, conflicts, rows


def classify_p3r(record: dict, pair_labels: dict[tuple[str, str], Counter], prosody_map: dict[str, str], record_type: str):
    lines = [line.strip() for line in str(record.get("body") or "").splitlines() if line.strip()]
    alignments = []
    for offset in (0, 1):
        votes: Counter = Counter()
        exact_pairs = 0
        for index in range(offset, len(lines) - 1, 2):
            labels = pair_labels.get((norm(lines[index]), norm(lines[index + 1])))
            if not labels:
                continue
            total_votes = sum(labels.values())
            meter_key, count = labels.most_common(1)[0]
            if count / total_votes < 0.9:
                continue
            votes[meter_key] += 1
            exact_pairs += 1
        if votes:
            meter_key, count = votes.most_common(1)[0]
            alignments.append((exact_pairs, count / sum(votes.values()), offset, meter_key))
    if not alignments:
        return None, False
    exact_pairs, support, _, meter_key = max(alignments, key=lambda item: (item[0], item[1], -item[2]))
    if support < 0.8:
        return None, True
    prosody_label = prosody_map.get(str(meter_key), str(meter_key))
    arkan = prosody_label.split(" (", 1)[0].strip()
    bahr = prosody_label.rsplit(" (", 1)[1][:-1].strip() if " (" in prosody_label and prosody_label.endswith(")") else None
    return {
        "id": str(record["id"]),
        "meter": arkan,
        "bahr": bahr,
        "arkan": arkan,
        "prosodyId": str(meter_key) if str(meter_key).isdigit() else None,
        "prosodyLabel": prosody_label,
        "scansion": None,
        "meterSource": "P3R exact couplet corpus",
        "sourceDataset": P3R_NAME,
        "sourceDatasetRevision": P3R_REVISION,
        "sourceDatasetUrl": P3R_REPOSITORY,
        "sourceLicense": P3R_LICENSE,
        "sourceRecordType": record_type,
        "status": "external_source_matched",
        "confidence": "multiple_exact_couplets" if exact_pairs > 1 else "one_exact_couplet",
        "matchedCouplets": exact_pairs,
        "meterVoteShare": round(support, 4),
        "lineScansionAvailable": False,
        "reviewer": None,
        "reviewedAt": None,
    }, False


def resolve_record(record: dict, pair_labels, prosody_map, full_poem_index, record_type: str):
    p3r_profile, p3r_ambiguous = classify_p3r(record, pair_labels, prosody_map, record_type)
    full_profile = full_poem_index.get(norm(record.get("body") or ""))
    if p3r_profile:
        if full_profile and norm(p3r_profile.get("meter")) == norm(full_profile.get("meter")):
            enriched = dict(p3r_profile)
            enriched["bahr"] = enriched.get("bahr") or full_profile.get("bahr")
            enriched["arkan"] = full_profile.get("arkan") or enriched.get("arkan")
            enriched["scansion"] = full_profile.get("scansion")
            enriched["scansionType"] = full_profile.get("scansionType")
            enriched["scansionSource"] = full_profile.get("scansionSource")
            enriched["scansionProvenance"] = full_profile.get("scansionProvenance")
            enriched["enrichedSourceProvenance"] = full_profile.get("sourceProvenance")
            enriched["enrichedByDataset"] = FULL_NAME
            enriched["enrichedByDatasetRevision"] = FULL_REVISION
            enriched["enrichedByDatasetUrl"] = FULL_REPOSITORY
            enriched["enrichedByLicense"] = FULL_LICENSE
            return enriched, "p3r_enriched", p3r_ambiguous
        return p3r_profile, "p3r", p3r_ambiguous
    if full_profile:
        return {
            "id": str(record["id"]),
            **full_profile,
            "sourceRecordType": record_type,
        }, "full_poem", p3r_ambiguous
    return None, "unmatched", p3r_ambiguous


def main() -> None:
    pair_labels, prosody_map, p3r_rows = read_p3r_corpus()
    full_poem_index, full_poem_conflicts, full_poem_rows = read_full_poem_corpus()
    matches: dict[str, dict] = {}
    counts = Counter()
    total_archive = 0
    site_data = json.loads(SITE_POEMS.read_text(encoding="utf-8")) if SITE_POEMS.exists() else {"poems": [], "pinned": []}
    local_records = [("site-poem", item) for item in site_data.get("poems", [])]
    local_records += [("pinned-entry", item) for item in site_data.get("pinned", [])]
    local_ids = {str(item.get("id")) for _, item in local_records if isinstance(item, dict) and item.get("id") is not None}
    archive_files = sorted(path for path in ARCHIVE.glob("*.json.gz") if path.name != OUT.name)

    def process(record: dict, record_type: str):
        profile, source_kind, p3r_ambiguous = resolve_record(record, pair_labels, prosody_map, full_poem_index, record_type)
        counts[f"{record_type}_{source_kind}"] += 1
        if p3r_ambiguous:
            counts[f"{record_type}_p3r_ambiguous"] += 1
        if profile:
            matches[str(record["id"])] = profile

    for shard in archive_files:
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            records = json.load(handle)
        for record in records:
            total_archive += 1
            if not isinstance(record, dict) or record.get("id") is None:
                continue
            if str(record["id"]) in local_ids:
                counts["archive_shadowed_by_static_site_ids"] += 1
                continue
            process(record, "archive")

    for record_type, record in local_records:
        if isinstance(record, dict) and record.get("id") is not None:
            process(record, record_type)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(matches, handle, ensure_ascii=False, separators=(",", ":"))

    archive_matched = sum(counts[f"archive_{kind}"] for kind in ("p3r", "p3r_enriched", "full_poem"))
    static_types = ("site-poem", "pinned-entry")
    static_matched = sum(counts[f"{kind}_{source}"] for kind in static_types for source in ("p3r", "p3r_enriched", "full_poem"))
    summary = {
        "sources": [
            {"name": P3R_NAME, "url": P3R_REPOSITORY, "revision": P3R_REVISION, "license": P3R_LICENSE, "rows": p3r_rows, "uniqueExactCoupletKeys": len(pair_labels), "meterDefinitions": len(prosody_map)},
            {"name": FULL_NAME, "url": FULL_REPOSITORY, "revision": FULL_REVISION, "license": FULL_LICENSE, "rows": full_poem_rows, "uniqueExactFullPoemKeys": len(full_poem_index), "conflictingFullPoemKeysExcluded": len(full_poem_conflicts), "sha256": FULL_SHA256},
        ],
        "matchingMethod": "P3R exact adjacent hemistich-pair text with both possible two-line offsets; secondary dataset exact full-poem text; Unicode/Persian normalization only; no fuzzy matching",
        "archiveRecords": total_archive,
        "matchedArchiveRecords": archive_matched,
        "unmatchedArchiveRecords": total_archive - archive_matched - counts["archive_shadowed_by_static_site_ids"],
        "archiveMatchedByP3R": counts["archive_p3r"] + counts["archive_p3r_enriched"],
        "archiveEnrichedByFullPoemDataset": counts["archive_p3r_enriched"],
        "archiveMatchedByFullPoemOnly": counts["archive_full_poem"],
        "archiveP3RAmbiguous": counts["archive_p3r_ambiguous"],
        "archiveRecordsShadowedByStaticSiteIds": counts["archive_shadowed_by_static_site_ids"],
        "staticSiteSourceRecords": len(local_records),
        "matchedStaticSiteSourceRecords": static_matched,
        "staticSiteMatchedByP3R": sum(counts[f"{kind}_p3r"] + counts[f"{kind}_p3r_enriched"] for kind in static_types),
        "staticSiteEnrichedByFullPoemDataset": sum(counts[f"{kind}_p3r_enriched"] for kind in static_types),
        "staticSiteMatchedByFullPoemOnly": sum(counts[f"{kind}_full_poem"] for kind in static_types),
        "unmatchedStaticSiteSourceRecords": len(local_records) - static_matched,
        "ambiguousStaticSiteRecordsExcluded": sum(counts[f"{kind}_p3r_ambiguous"] for kind in static_types),
        "totalMatchedSiteRecords": len(matches),
        "importedStatus": "external_source_matched (not independently human-reviewed in this project)",
        "bahr": "P3R parenthetical definitions and full-poem dataset arabic_meter field; absent values remain empty",
        "scansion": "full-poem dataset meter_signs are per-arkan signs, not line-by-line phonetic scansion; P3R-only records have no scansion",
        "output": str(OUT.relative_to(ROOT)),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
