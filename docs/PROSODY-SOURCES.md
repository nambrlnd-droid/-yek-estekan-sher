# Prosody data sources and attribution

The archive's imported prosody annotations are matched against the P3R dataset distributed with:

- Mohammadreza Shahrestani and Mostafa Haghir Chehreghani, “Prosody recognition in Persian poetry,” *Speech Communication*, vol. 170, 2025, article 103222.
- Paper: https://doi.org/10.1016/j.specom.2025.103222
- Source repository: https://github.com/m-shahrestani/Prosody-Recognition-in-Persian-Poetry
- Dataset file: `dataset/P3R.csv`
- Pinned source revision: `4a2dcea81967778fc42140dab57e45365723bf7d`
- The repository README declares MIT and CC BY 4.0 licensing.

The P3R file contains paired hemistichs (`VERSE1`, `VERSE2`) and their source meter label (`PROSODY`), with a numeric `PROSODY_ID`. The archive builder uses exact normalized adjacent-hemistich matches only. It does not use fuzzy matching or generate a guessed meter label.

Imported records are marked `external_source_matched`. This means the archive text matched a labelled couplet in the external corpus; it does **not** mean that a human reviewer independently checked the poem's pronunciation, meter, or scansion. Where the source has conflicting labels, or where a poem has inconsistent meter votes, the record is excluded from the imported index.

P3R does not provide a separately resolved bahr name or binary syllabic scansion for every line in this CSV. Those fields are therefore left empty rather than inferred. The source meter string is preserved as the meter/arkan label.

The generated index is a derived matching artifact. Keep this attribution document with any redistribution of the imported index and comply with the upstream license terms.
