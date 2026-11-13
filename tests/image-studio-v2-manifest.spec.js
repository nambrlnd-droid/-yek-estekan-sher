const { test, expect } = require("@playwright/test");

test("image studio v2 manifest defines 15 templates and 60 format layouts", async ({ page }) => {
  await page.goto("./");
  const url = new URL("./assets/image-studio/manifest.v2.json", page.url()).toString();
  const response = await page.request.get(url);
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();

  expect(manifest.schemaVersion).toBe("2.0.0");
  expect(manifest.families).toHaveLength(5);
  expect(new Set(manifest.families.map(f => f.id)).size).toBe(5);
  expect(manifest.templates).toHaveLength(15);
  expect(new Set(manifest.templates.map(t => t.id)).size).toBe(15);

  const expected = { square:[1080,1080], portrait:[1080,1350], story:[1080,1920], landscape:[1920,1080] };
  for (const template of manifest.templates) {
    expect(Object.keys(template.formats).sort()).toEqual(Object.keys(expected).sort());
    for (const [format, dimensions] of Object.entries(expected)) {
      const layout = template.formats[format];
      expect([layout.canvas.width, layout.canvas.height]).toEqual(dimensions);
      for (const box of [layout.safeArea, layout.poem]) {
        for (const value of Object.values(box)) {
          expect(Number.isFinite(value)).toBeTruthy();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
      expect(layout.poem.x + layout.poem.w).toBeLessThanOrEqual(1);
      expect(layout.poem.y + layout.poem.h).toBeLessThanOrEqual(1);
      expect(layout.author.x).toBeGreaterThanOrEqual(0);
      expect(layout.author.x).toBeLessThanOrEqual(1);
      expect(layout.author.y).toBeGreaterThanOrEqual(0);
      expect(layout.author.y).toBeLessThanOrEqual(1);
    }
    for (const color of Object.values(template.palette)) expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }
  expect(manifest.assetPolicy.remoteAssetsAllowed).toBe(false);
  expect(manifest.legacyCompatibility.preserveMethods).toEqual(["open","render","applyTemplate"]);
});
