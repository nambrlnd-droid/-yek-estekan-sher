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

Geometry values use normalized coordinates in the range 0–1. The origin is the top-right for RTL composition: `x` is the distance from the right canvas edge to the element box right edge, `y` is its top edge, and width/height are positive fractions of the canvas. Thus the Canvas left coordinate is `1 - x - width`; a point anchor such as the author uses Canvas x = `1 - x`. The renderer converts this coordinate model into Canvas coordinates. Pixel coordinates do not belong in the manifest.

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


## Local asset manager contract

The v2 asset manager is additive and deny-by-default. Its license catalog lives at
`assets/image-studio/licenses/manifest.json`. An empty catalog is intentional:
no image, texture, ornament, or font is considered approved merely because a
file exists in the repository.

Every future catalog entry must include:
- a stable unique ID and an asset kind;
- a path confined to the local `assets/image-studio/{backgrounds,textures,ornaments,fonts}/` tree;
- a license identifier, a verifiable HTTPS license reference, source/origin,
  and explicit attribution text (empty only when attribution is not required);
- a SHA-256 digest of the exact local file.

The manager rejects remote paths, traversal paths, duplicate IDs/paths, missing
license metadata, unknown assets, and files whose digest does not match the
catalog. It does not download assets or contact a remote licensing service.
Do not populate the catalog until both the local file and its license evidence
have been reviewed. In environments without Web Crypto, digest verification
fails closed by default.

This module is not yet connected to the production renderer. The current live
studio and its asset behavior remain unchanged.


## Renderer adapter and quality preflight

The isolated v2 Canvas renderer consumes the registry, poem-layout engine and
quality checker as explicit dependencies. It sizes the canvas from the selected
template/format, paints the declared solid background, applies RTL text
direction, lays out the poem, and optionally places the author credit.

The adapter deliberately does not emulate missing textures, frames or ornaments.
Until those assets are present in the approved local license catalog, the
quality report emits explicit availability warnings. This avoids silently
substituting unreviewed visual assets.

The preflight report checks canvas dimensions, poem bounds, safe-area placement,
overflow and text/background contrast. Overflow is a hard failure: the renderer
does not paint a clipped or truncated poem and returns `blocked: true` with
reason `POEM_OVERFLOW`. Strict mode can reject any quality issue or warning.

The adapter remains isolated from `js/image-studio.js`; no production UI,
legacy export dimensions, stored settings or service-worker behavior is changed.


## PNG export manager

The additive export manager accepts only a successful v2 renderer result. It
rejects blocked/overflow renders, failed quality reports, invalid canvases,
unsupported formats, empty PNG blobs and canvases above the 12-megapixel
safety limit. It enforces the canonical dimensions for each format rather than
trusting arbitrary caller-provided sizes:

- square: 1080×1080
- portrait: 1080×1350
- story: 1080×1920
- landscape: 1920×1080

PNG encoding uses the browser's `canvas.toBlob` API. The result includes the
Blob, MIME type, byte count, dimensions, template/format identifiers, safe
filename and any non-fatal quality warnings. Warnings such as unavailable
unlicensed textures remain visible but do not block a basic solid-background
export by default; callers may opt into strict warning rejection. Errors and
poem overflow always block export.

A separate explicit download method creates and revokes a temporary object URL.
Export does not trigger a download automatically, mutate persisted settings,
or alter the legacy renderer.
