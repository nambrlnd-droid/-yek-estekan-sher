# Prosody data sources and attribution

The archive's imported prosody annotations are matched against the P3R dataset distributed with:

- Mohammadreza Shahrestani and Mostafa Haghir Chehreghani, “Prosody recognition in Persian poetry,” *Speech Communication*, vol. 170, 2025, article 103222.
- Paper: https://doi.org/10.1016/j.specom.2025.103222
- Source repository: https://github.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry
- Dataset file: `dataset/P3R.csv`
- Meter-ID definitions and parenthetical bahr labels: `dataset/prosodies.txt`
- Pinned source revision: `4a2dcea81967778fc42140dab57e45365723bf7d`
- The repository README declares MIT and CC BY 4.0 licensing.

The P3R file contains paired hemistichs (`VERSE1`, `VERSE2`) and their source meter label (`PROSODY`), with a numeric `PROSODY_ID`. The dataset README states that these labels are taken from Ganjoor as-is, without correction or rewriting; their accuracy therefore depends on the upstream Ganjoor annotations. The archive builder uses exact normalized adjacent-hemistich matches only. It does not use fuzzy matching or generate a guessed meter label.

Imported records are marked `external_source_matched`. This means the archive text matched a labelled couplet in the external corpus; it does **not** mean that a human reviewer independently checked the poem's pronunciation, meter, or scansion. Where the source has conflicting labels, or where a poem has inconsistent meter votes, the record is excluded from the imported index.

P3R provides meter patterns and a separate meter-ID definition file; some definitions include a named bahr in parentheses, which is preserved as a separate field. A bahr is not inferred when the source does not specify one. The source meter pattern is preserved as the meter/arkan pattern. P3R does not provide binary syllabic scansion for every line in the CSV, so line-by-line scansion remains empty rather than being fabricated.

The generated index is a derived matching artifact. Keep this attribution document with any redistribution of the imported index and comply with the upstream license terms.


## Secondary exact full-poem source

A second source is used only as an exact full-poem match or to enrich a P3R record when its meter pattern agrees:

- Dataset: `cnababaie/persian-poetry-meters`
- Repository: https://huggingface.co/datasets/cnababaie/persian-poetry-meters
- File: `poems.csv`
- File revision: `408b79e`
- SHA-256: `42830c43cfcd758debe88eefe8b8578d553a3218d940c60d7917447ba7075cf1`
- License declared by the dataset page: Apache-2.0

The dataset provides the full poem text, Persian meter pattern, Arabic meter name, diacritized Persian feet, and `meter_signs`. Only exact normalized full-poem matches are imported. If a P3R match and this source disagree on the meter pattern, the P3R record is retained without enrichment and the conflict is counted. If the P3R source has no usable match, the exact full-poem record can be used as a separately identified external match.

The `meter_signs` field represents quantitative signs by foot/arkan, not an independently verified phonetic scansion for each individual hemistich. The reader therefore labels it as «نشانه‌های کمّی ارکان», not as line-by-line scansion. Records from this dataset are not treated as independently human-reviewed by this project.


## Current archive match report

Latest successful corpus build:

- Compressed archive: 53,344 of 56,880 records have an exact source match; 3,536 remain unmatched.
- Static site collections: 560 of 2,214 records have an exact source match; 1,654 remain unmatched.
- Total: 53,904 of 59,094 site records have source-matched prosody.
- 41,477 archive records were enriched with named bahr and arkan-sign data from the full-poem corpus after the P3R meter pattern agreed.
- 536 archive records were matched by the exact full-poem corpus alone.
- 19 archive records had ambiguous P3R meter votes and were not assigned a P3R label.
- 5,190 records remain without an exact source match. No guessed meter is assigned to them.

These counts are from the generated `data/poetry-archive/prosody-index-summary.json` report. They describe corpus matching, not independent human review of the website archive.
