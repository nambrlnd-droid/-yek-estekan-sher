#!/usr/bin/env python3
"""Build an exact-couplet prosody index from the MIT / CC BY 4.0 P3R corpus.

Only exact normalized hemistich-pair matches are used. No fuzzy inference is
performed; conflicting meter votes are excluded from the published index.
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
OUT = ARCHIVE / "prosody-index.json.gz"
SUMMARY = ARCHIVE / "prosody-index-summary.json"
CORPUS_URL = "https://media.githubusercontent.com/media/m-shahrestani/Prosody-Recognition-in-Persian-Poetry/4a2dcea81967778fc42140dab57e45365723bf7d/dataset/P3R.csv"
CORPUS_NAME = "P3R — Prosody Recognition in Persian Poetry"
CORPUS_REPOSITORY = "https://github.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry"
CORPUS_REVISION = "4a2dcea81967778fc42140dab57e45365723bf7d"


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


def read_corpus() -> dict[tuple[str, str], Counter]:
    download_corpus()
    pair_labels: dict[tuple[str, str], Counter] = defaultdict(Counter)
    rows = 0
    with CORPUS.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"VERSE1", "VERSE2", "PROSODY"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            raise RuntimeError(f"Unexpected P3R columns: {reader.fieldnames}")
        for row in reader:
            first, second = norm(row.get("VERSE1")), norm(row.get("VERSE2"))
            meter = " ".join(str(row.get("PROSODY") or "").split())
            if first and second and meter:
                pair_labels[(first, second)][meter] += 1
            rows += 1
            if rows % 200_000 == 0:
                print(f"Read {rows:,} P3R couplets; unique exact pairs: {len(pair_labels):,}")
    print(f"Finished P3R: {rows:,} rows; {len(pair_labels):,} unique exact pairs")
    return pair_labels


def main() -> None:
    pair_labels = read_corpus()
    matches: dict[str, dict] = {}
    ambiguous = 0
    matched_couplets = 0
    total_archive = 0
    archive_files = sorted(ARCHIVE.glob("*.json.gz"))

    for shard in archive_files:
        with gzip.open(shard, "rt", encoding="utf-8") as handle:
            records = json.load(handle)
        for record in records:
            total_archive += 1
            if not isinstance(record, dict) or record.get("id") is None:
                continue
            lines = [line.strip() for line in str(record.get("body") or "").splitlines() if line.strip()]
            votes: Counter = Counter()
            exact_pairs = 0
            for index in range(0, len(lines) - 1, 2):
                key = (norm(lines[index]), norm(lines[index + 1]))
                labels = pair_labels.get(key)
                if not labels:
                    continue
                # Preserve source labels; a conflicting source pair contributes
                # only its majority label when the vote is unambiguous.
                total_votes = sum(labels.values())
                meter, count = labels.most_common(1)[0]
                if count / total_votes < 0.9:
                    continue
                votes[meter] += 1
                exact_pairs += 1
            if not votes:
                continue
            meter, count = votes.most_common(1)[0]
            support = count / sum(votes.values())
            if support < 0.8:
                ambiguous += 1
                continue
            item_id = str(record["id"])
            matches[item_id] = {
                "id": item_id,
                "meter": meter,
                "bahr": None,
                "arkan": meter,
                "scansion": None,
                "meterSource": "P3R exact couplet corpus",
                "sourceDataset": CORPUS_NAME,
                "sourceDatasetRevision": CORPUS_REVISION,
                "sourceDatasetUrl": CORPUS_REPOSITORY,
                "sourceLicense": "MIT and CC BY 4.0",
                "status": "external_source_matched",
                "confidence": "multiple_exact_couplets" if exact_pairs > 1 else "one_exact_couplet",
                "matchedCouplets": exact_pairs,
                "meterVoteShare": round(support, 4),
                "lineScansionAvailable": False,
                "reviewer": None,
                "reviewedAt": None,
            }
            matched_couplets += exact_pairs

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(matches, handle, ensure_ascii=False, separators=(",", ":"))

    summary = {
        "dataset": CORPUS_NAME,
        "datasetUrl": CORPUS_REPOSITORY,
        "datasetRevision": CORPUS_REVISION,
        "license": "MIT and CC BY 4.0",
        "matchingMethod": "exact adjacent hemistich-pair text after Unicode/Persian-character normalization; no fuzzy matching",
        "corpusRows": sum(sum(labels.values()) for labels in pair_labels.values()),
        "uniqueExactCoupletKeys": len(pair_labels),
        "archiveRecords": total_archive,
        "matchedArchiveRecords": len(matches),
        "unmatchedArchiveRecords": total_archive - len(matches),
        "ambiguousArchiveRecordsExcluded": ambiguous,
        "matchedExactCouplets": matched_couplets,
        "importedStatus": "external_source_matched (not human-reviewed)",
        "bahr": "not provided separately in source; left empty",
        "scansion": "binary per-line scansion not provided in source; left empty",
        "output": str(OUT.relative_to(ROOT)),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
