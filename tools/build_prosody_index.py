#!/usr/bin/env python3
"""Build an exact-text prosody index for the site's archive from the CC BY 4.0 corpus.

Only exact normalized full-poem matches are imported. Conflicting matches are
excluded. Imported labels remain externally sourced, not human-reviewed.
"""
from __future__ import annotations

import gzip
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from datasets import load_dataset

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "poetry-archive"
OUT = ARCHIVE / "prosody-index.json.gz"
SUMMARY = ARCHIVE / "prosody-index-summary.json"
DATASET_ID = "nafisehNik/ganjoor-ipa-scansion"
DATASET_REVISION = "main"

CHAR_MAP = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه"})
REMOVE_RE = re.compile(r"[\s\W_]+", re.UNICODE)


def norm(value: object) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).translate(CHAR_MAP)
    value = value.replace("\u200c", "").replace("\u200e", "").replace("\u200f", "")
    return REMOVE_RE.sub("", value).lower()


def dataset_key(row: dict) -> str:
    verses = row.get("verses") or []
    parts = []
    for verse in verses:
        if not isinstance(verse, dict):
            continue
        for field in ("fa_1", "fa_2"):
            text = verse.get(field)
            if text:
                parts.append(str(text))
    return norm("".join(parts))


def archive_key(record: dict) -> str:
    return norm(record.get("body", ""))


def profile_for(row: dict) -> dict | None:
    meter = row.get("meter") or {}
    if not isinstance(meter, dict):
        return None
    rhythm = meter.get("rhythm_fa") or meter.get("rhythm_name_fa")
    feet = meter.get("feet_fa") or []
    scansion = meter.get("scansion")
    if not rhythm or not feet or not scansion:
        return None
    return {
        "meter": str(rhythm),
        "bahr": str(meter.get("base_meter") or meter.get("rhythm_name_fa") or ""),
        "arkan": " / ".join(str(x) for x in feet),
        "scansion": str(scansion),
        "meterSource": str(meter.get("source") or "dataset"),
        "sourceDataset": DATASET_ID,
        "sourceDatasetRevision": DATASET_REVISION,
        "sourcePoemId": row.get("poem_id"),
        "sourcePoemUrl": row.get("poem_url"),
        "status": "external_source_matched",
        "confidence": "exact_text_match_external_corpus",
        "reviewer": None,
        "reviewedAt": None,
        "lineScansionAvailable": False,
    }


def main() -> None:
    print(f"Loading streaming dataset: {DATASET_ID}")
    stream = load_dataset(DATASET_ID, split="train", streaming=True)
    index_by_text: dict[str, dict] = {}
    conflicts: set[str] = set()
    corpus_rows = 0
    valid_rows = 0

    for row in stream:
        corpus_rows += 1
        key = dataset_key(row)
        profile = profile_for(row)
        if not key or not profile:
            continue
        valid_rows += 1
        previous = index_by_text.get(key)
        if previous is None:
            index_by_text[key] = profile
        elif any(previous.get(k) != profile.get(k) for k in ("meter", "arkan", "scansion")):
            conflicts.add(key)

        if corpus_rows % 10000 == 0:
            print(f"Corpus rows: {corpus_rows:,}; usable keys: {len(index_by_text):,}; conflicts: {len(conflicts):,}")

    for key in conflicts:
        index_by_text.pop(key, None)

    matches: dict[str, dict] = {}
    duplicate_texts = 0
    total_archive = 0
    archive_files = sorted(ARCHIVE.glob("*.json.gz"))
    for shard in archive_files:
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            records = json.load(handle)
        for record in records:
            total_archive += 1
            if not isinstance(record, dict):
                continue
            key = archive_key(record)
            profile = index_by_text.get(key) if key else None
            if not profile:
                continue
            item_id = record.get("id")
            if item_id is None:
                continue
            item_id = str(item_id)
            if item_id in matches:
                duplicate_texts += 1
                continue
            matches[item_id] = {"id": item_id, **profile}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(matches, handle, ensure_ascii=False, separators=(",", ":"))

    summary = {
        "dataset": DATASET_ID,
        "datasetRevision": DATASET_REVISION,
        "license": "CC BY 4.0",
        "matchingMethod": "exact full-poem text after Unicode/Persian-character normalization; no fuzzy matching",
        "corpusRowsRead": corpus_rows,
        "corpusRowsWithUsableMeter": valid_rows,
        "ambiguousCorpusTextKeysExcluded": len(conflicts),
        "archiveRecords": total_archive,
        "matchedArchiveRecords": len(matches),
        "unmatchedArchiveRecords": total_archive - len(matches),
        "duplicateArchiveTextMatches": duplicate_texts,
        "importedStatus": "external_source_matched (not human-reviewed)",
        "lineScansion": "not provided by source dataset; do not infer",
        "output": str(OUT.relative_to(ROOT)),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
