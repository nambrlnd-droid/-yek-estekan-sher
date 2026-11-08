import { test, expect } from "@playwright/test";


test("external P3R exact matches are searchable but remain distinct from human confirmation", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
  const result = await page.evaluate(() => {
    const item = { id: "p3r-external", body: "مصراع یک\\nمصراع دو", prosody: {
      status: "external_source_matched", meter: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      bahr: null, arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلن"
    }};
    document.getElementById("prosodyMeterFilter").value = "فاعلاتن";
    document.getElementById("prosodyMeterFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const meterMatch = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyReviewFilter").value = "external_source_matched";
    document.getElementById("prosodyReviewFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const externalStatusMatch = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyReviewFilter").value = "confirmed";
    document.getElementById("prosodyReviewFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const humanConfirmedMatch = window.YESAdvancedSearch.matches(item);
    return { meterMatch, externalStatusMatch, humanConfirmedMatch };
  });
  expect(result.meterMatch).toBeTruthy();
  expect(result.externalStatusMatch).toBeTruthy();
  expect(result.humanConfirmedMatch).toBeFalsy();
});
