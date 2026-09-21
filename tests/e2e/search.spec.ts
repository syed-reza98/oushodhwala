import { test, expect } from "@playwright/test";
import { trackConsole } from "./helpers";

/** Controlled search input helper */
async function typeSearch(page: import("@playwright/test").Page, term: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const box = page.getByRole("combobox").first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  await box.click();
  await box.fill(term);
  await page.waitForTimeout(500);
  return box;
}

test.describe("search", () => {
  test("english query returns product suggestions", async ({ page }) => {
    const errors = trackConsole(page);
    await typeSearch(page, "para");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(
      errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("AbortError") &&
          !e.includes("404") &&
          !e.includes("Failed to load resource"),
      ),
    ).toEqual([]);
  });

  test("query submit goes to products results", async ({ page }) => {
    const box = await typeSearch(page, "para");
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    await box.press("Enter");
    await expect(page).toHaveURL(/\/products\?/ );
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible({ timeout: 15_000 });
  });

  test("selecting a suggestion opens the product page", async ({ page }) => {
    await typeSearch(page, "para");
    await page.getByRole("option").first().click({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/product\//);
  });

  test("products page filters by query string", async ({ page }) => {
    await page.goto("/products?q=paracetamol", { waitUntil: "domcontentloaded" });
    await expect(page.locator("a[href^='/product/']").first()).toBeVisible({ timeout: 15_000 });
  });
});
