# Image Studio v2 — Template Manifest & Renderer Contract

Status: design contract / additive implementation stage  
Base: `main` at `60c7b57cf9fb7c17ab9d9070a30e7d77b2511987`  
Manifest: `assets/image-studio/manifest.v2.json`

## 1. Scope

This change introduces declarative data for 15 templates across five families and four output formats (60 explicit layout presets). It does not replace or modify the production renderer. The existing `js/image-studio.js` remains active until the adapter and regression suite are implemented.

## 2. Output dimensions

| Format | Width | Height |
|---|---:|---:|
| square | 1080 | 1080 |
| portrait | 1080 | 1350 |
| story | 1080 | 1920 |
| landscape | 1920 | 1080 |

The current v1 renderer uses 1200×1200 for square and 1600×900 for landscape. These are legacy dimensions. The v2 manifest defines the approved target dimensions; migration must not silently change legacy exports. The adapter must explicitly select v2 dimensions only for v2 templates or a deliberate format migration.

## 3. Manifest structure

- `schemaVersion`: manifest schema version.
- `families`: five family definitions.
- `templates`: fifteen stable template IDs.
- `palette`: background, text, accent and muted colors.
- `typography`: font family, fallbacks, weight and normalized sizing rules.
- `background`: solid base plus optional local texture ID.
- `frame`: local ornament/frame identifier.
- `formats`: exactly four independent layout presets per template.
- `safeArea`: normalized margins.
- `poem`: normalized poem text rectangle.
- `author`: normalized author anchor.
- `ornaments`: declarative local ornament placements.

Geometry values use normalized coordinates in the range 0–1. The origin is the top-right for RTL composition: `x` is the right edge of the element box, `y` is its top edge, and width/height are positive fractions of the canvas. The renderer converts this coordinate model into Canvas coordinates. Pixel coordinates do not belong in the manifest.

## 4. Text integrity and layout

1. The source poem string is immutable. No spelling correction, punctuation normalization, transliteration, line deletion or paraphrase is permitted.
2. Explicit source line breaks must be preserved. Automatic wrapping may add visual breaks but may not remove source breaks.
3. Rendering must use RTL shaping and bidi-aware measurement. Font fallback is allowed only when the selected font lacks glyph coverage.
4. Text must never be clipped or silently reduced below `minimumScale`.
5. Overflow is a structured result (format, measured height, available height, minimum font size, required action), not a successful export.
6. The solver follows `layoutRules.longPoemOrder`.
7. Author and brand labels are separate optional layers and may not consume the poem's source text.

## 5. Asset and licensing

Textures, frames, ornaments and fonts must be local files. Every third-party asset needs a record in `assets/image-studio/licenses/manifest.json` with source, author, license identifier, attribution requirements, retrieval date and file path. Unverified or remote-only assets are rejected. No paid API or backend dependency is permitted.

## 6. Legacy compatibility

The public API `window.YESImageStudio` and methods `open`, `render`, `applyTemplate` remain supported. The twelve current template IDs and persisted `YESStorage` settings remain readable. New IDs are additive. Do not overwrite or reinterpret old stored values. During migration, map old templates only through an explicit compatibility table; never infer a mapping from display labels.

Current legacy dimensions are square 1200×1200 and landscape 1600×900. New v2 dimensions are square 1080×1080 and landscape 1920×1080. Keep this distinction explicit until the user-facing version migration is implemented and tested.

## 7. Integration boundary

Recommended modules: `template-registry.js`, `poem-layout.js`, `asset-manager.js`, `renderer.js`, `quality-check.js`, `export-manager.js`. The current `js/image-studio.js` entry point becomes a compatibility facade only after new modules pass regression tests.

## 8. Acceptance

- Exactly five families and fifteen unique template IDs.
- Exactly four format presets per template.
- All dimensions match the approved values.
- All colors are six-digit hex values.
- All normalized geometry values are finite and between 0 and 1.
- Every poem rectangle remains inside the canvas.
- No remote asset URLs occur in the manifest.
- Legacy renderer files remain unchanged in this stage.
