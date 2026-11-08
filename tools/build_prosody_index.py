#!/usr/bin/env python3
"""Build an exact-couplet prosody index from the MIT / CC BY 4.0 P3R corpus.

Only exact normalized hemistich-pair matches are used. No fuzzy inference is
performed; conflicting meter votes are excluded from the published index.
Both the compressed archive and all static site poem collections are scanned.
"""
from __future__ import annotations

import csv
import gzip
import json
import re
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "poetry-archive"
CORPUS = ROOT / ".cache" / "P3R.csv"
SITE_POEMS = ROOT / ".cache" / "site-poems.json"
OUT = ARCHIVE / "prosody-index.json.gz"
SUMMARY = ARCHIVE / "prosody-index-summary.json"
CORPUS_URL = "https://media.githubusercontent.com/media/m-shahrestani/Prosody-Recognition-in-Persian-Poetry/4a2dcea81967778fc42140dab57e45365723bf7d/dataset/P3R.csv"
CORPUS_NAME = "P3R — Prosody Recognition in Persian Poetry"
CORPUS_REPOSITORY = "https://github.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry"
CORPUS_REVISION = "4a2dcea81967778fc42140dab57e45365723bf7d"
PROSODY_URL = "https://raw.githubusercontent.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry/4a2dcea81967778fc42140dab57e45365723bf7d/dataset/prosodies.txt"
PROSODY_FILE = ROOT / ".cache" / "prosodies.txt"


def norm(value: object) -> str:
    value = unicodedata.normalize("NFKC", str(value or ""))
    value = value.translate(str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه",
        "\u200c": "", "\u200e": "", "\u200f": "", "\u0640": "",
    }))
    value = re.sub(r"[\u064b-\u065f\u0670]", "", value)
    return re.sub(r"[\s\W_]+", "", value, flags=re.UNICODE).lower()


def download_corpus() -> None:
    if CORPUS.exists() and CORPUS.stat().st_size > 100_000_000:
        print(f"Using cached corpus ({CORPUS.stat().st_size:,} bytes)")
        return
    CORPUS.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading P3R corpus from {CORPUS_URL}")
    request = urllib.request.Request(CORPUS_URL, headers={"User-Agent": "YekEstekanSher-ProsodyIndexer/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, CORPUS.open("wb") as output:
        total = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
            total += len(chunk)
            if total and total % (25 * 1024 * 1024) < 1024 * 1024:
                print(f"Downloaded {total / (1024 * 1024):.0f} MiB")
    if CORPUS.stat().st_size < 100_000_000:
        raise RuntimeError(f"Corpus download looks incomplete: {CORPUS.stat().st_size} bytes")


def read_prosody_map() -> dict[str, str]:
    PROSODY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not PROSODY_FILE.exists():
        request = urllib.request.Request(PROSODY_URL, headers={"User-Agent": "YekEstekanSher-ProsodyIndexer/1.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            PROSODY_FILE.write_bytes(response.read())
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


def read_corpus() -> tuple[dict[tuple[str, str], Counter], dict[str, str]]:
    download_corpus()
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
    return pair_labels, prosody_map


def classify_record(record: dict, pair_labels: dict[tuple[str, str], Counter], prosody_map: dict[str, str], record_type: str):
    lines = [line.strip() for line in str(record.get("body") or "").splitlines() if line.strip()]
    alignments = []
    for offset in (0, 1):
        votes: Counter = Counter()
        exact_pairs = 0
        for index in range(offset, len(lines) - 1, 2):
            key = (norm(lines[index]), norm(lines[index + 1]))
            labels = pair_labels.get(key)
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
            support = count / sum(votes.values())
            alignments.append((exact_pairs, support, offset, meter_key))
    if not alignments:
        return None, False
    exact_pairs, support, _, meter_key = max(alignments, key=lambda item: (item[0], item[1], -item[2]))
    if support < 0.8:
        return None, True
    prosody_label = prosody_map.get(str(meter_key), str(meter_key))
    arkan = prosody_label.split(" (", 1)[0].strip()
    bahr = None
    if " (" in prosody_label and prosody_label.endswith(")"):
        bahr = prosody_label.rsplit(" (", 1)[1][:-1].strip()
    item_id = str(record["id"])
    return {
        "id": item_id,
        "meter": arkan,
        "bahr": bahr,
        "arkan": arkan,
        "prosodyId": str(meter_key) if str(meter_key).isdigit() else None,
        "prosodyLabel": prosody_label,
        "scansion": None,
        "meterSource": "P3R exact couplet corpus",
        "sourceDataset": CORPUS_NAME,
        "sourceDatasetRevision": CORPUS_REVISION,
        "sourceDatasetUrl": CORPUS_REPOSITORY,
        "sourceLicense": "MIT and CC BY 4.0",
        "sourceRecordType": record_type,
        "status": "external_source_matched",
        "confidence": "multiple_exact_couplets" if exact_pairs > 1 else "one_exact_couplet",
        "matchedCouplets": exact_pairs,
        "meterVoteShare": round(support, 4),
        "lineScansionAvailable": False,
        "reviewer": None,
        "reviewedAt": None,
    }, False


def main() -> None:
    pair_labels, prosody_map = read_corpus()
    matches: dict[str, dict] = {}
    ambiguous_archive = 0
    ambiguous_local = 0
    matched_archive_couplets = 0
    matched_local_couplets = 0
    total_archive = 0
    matched_archive = 0
    shadowed_archive = 0
    site_data = json.loads(SITE_POEMS.read_text(encoding="utf-8")) if SITE_POEMS.exists() else {"poems": [], "pinned": []}
    local_records = [("site-poem", item) for item in site_data.get("poems", [])]
    local_records += [("pinned-entry", item) for item in site_data.get("pinned", [])]
    local_ids = {str(item.get("id")) for _, item in local_records if isinstance(item, dict) and item.get("id") is not None}
    archive_files = sorted(path for path in ARCHIVE.glob("*.json.gz") if path.name != OUT.name)

    for shard in archive_files:
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            records = json.load(handle)
        for record in records:
            total_archive += 1
            if not isinstance(record, dict) or record.get("id") is None:
                continue
            if str(record["id"]) in local_ids:
                shadowed_archive += 1
                continue
            profile, ambiguous = classify_record(record, pair_labels, prosody_map, "archive")
            if ambiguous:
                ambiguous_archive += 1
            if profile:
                matches[profile["id"]] = profile
                matched_archive += 1
                matched_archive_couplets += profile["matchedCouplets"]

    local_total = len(local_records)
    local_matched = 0
    for record_type, record in local_records:
        if not isinstance(record, dict) or record.get("id") is None:
            continue
        item_id = str(record["id"])
        profile, ambiguous = classify_record(record, pair_labels, prosody_map, record_type)
        if ambiguous:
            ambiguous_local += 1
        if profile:
            matches[item_id] = profile
            local_matched += 1
            matched_local_couplets += profile["matchedCouplets"]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(matches, handle, ensure_ascii=False, separators=(",", ":"))

    summary = {
        "dataset": CORPUS_NAME,
        "datasetUrl": CORPUS_REPOSITORY,
        "datasetRevision": CORPUS_REVISION,
        "license": "MIT and CC BY 4.0",
        "matchingMethod": "exact adjacent hemistich-pair text after Unicode/Persian-character normalization; both possible two-line offsets checked; no fuzzy matching",
        "corpusRows": sum(sum(labels.values()) for labels in pair_labels.values()),
        "uniqueExactCoupletKeys": len(pair_labels),
        "prosodyDefinitions": len(prosody_map),
        "prosodyDefinitionsSource": PROSODY_URL,
        "archiveRecords": total_archive,
        "matchedArchiveRecords": matched_archive,
        "unmatchedArchiveRecords": total_archive - matched_archive - shadowed_archive,
        "archiveRecordsShadowedByStaticSiteIds": shadowed_archive,
        "ambiguousArchiveRecordsExcluded": ambiguous_archive,
        "staticSiteSourceRecords": local_total,
        "matchedStaticSiteSourceRecords": local_matched,
        "unmatchedStaticSiteSourceRecords": local_total - local_matched,
        "ambiguousStaticSiteRecordsExcluded": ambiguous_local,
        "totalMatchedSiteRecords": len(matches),
        "matchedExactArchiveCouplets": matched_archive_couplets,
        "matchedExactStaticSiteCouplets": matched_local_couplets,
        "importedStatus": "external_source_matched (not human-reviewed)",
        "bahr": "mapped from the upstream prosodies.txt definition where an explicit parenthetical bahr label exists; otherwise left empty",
        "scansion": "binary per-line scansion not provided in source; left empty",
        "output": str(OUT.relative_to(ROOT)),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
