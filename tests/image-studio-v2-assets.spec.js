const { test, expect } = require("@playwright/test");

test("asset manager defaults to an empty deny-by-default catalog", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/asset-manager.js" });
  const result = await page.evaluate(async () => {
    const response = await fetch("assets/image-studio/licenses/manifest.json");
    const manifest = await response.json();
    const catalog = window.YESImageStudioV2Assets.create(manifest);
    return { policy: manifest.policy, count: catalog.list().length, unknown: catalog.get("unapproved") };
  });
  expect(result).toEqual({ policy: "deny-by-default", count: 0, unknown: null });
});

test("asset manager rejects remote, traversal and incomplete-license entries", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/asset-manager.js" });
  const rejected = await page.evaluate(() => {
    const api = window.YESImageStudioV2Assets;
    const base = { id: "paper", path: "assets/image-studio/textures/paper.png", kind: "texture",
      license: "CC0-1.0", licenseUrl: "https://example.org/license", source: "Local approved source",
      attribution: "", fileSha256: "a".repeat(64) };
    const cases = [
      { ...base, path: "https://example.org/paper.png" },
      { ...base, path: "assets/image-studio/../../secret.txt" },
      { ...base, licenseUrl: "" },
      { ...base, fileSha256: "not-a-digest" }
    ];
    return cases.map(asset => {
      try { api.validateManifest({ schemaVersion: "1.0.0", policy: "deny-by-default", assets: [asset] }); return false; }
      catch (_) { return true; }
    });
  });
  expect(rejected).toEqual([true, true, true, true]);
});

test("asset manager verifies local file digest before returning bytes", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/asset-manager.js" });
  const result = await page.evaluate(async () => {
    const bytes = new TextEncoder().encode("local-test-asset");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const manifest = { schemaVersion: "1.0.0", policy: "deny-by-default", assets: [{
      id: "test-texture", path: "assets/image-studio/textures/test.bin", kind: "texture",
      license: "CC0-1.0", licenseUrl: "https://example.org/license", source: "Test fixture",
      attribution: "", fileSha256: sha
    }] };
    const catalog = window.YESImageStudioV2Assets.create(manifest, {
      fetch: async () => ({ ok: true, arrayBuffer: async () => bytes.buffer, headers: { get: () => "application/octet-stream" } })
    });
    const loaded = await catalog.load("test-texture");
    return { id: loaded.id, byteLength: loaded.bytes.byteLength };
  });
  expect(result).toEqual({ id: "test-texture", byteLength: 16 });
});
