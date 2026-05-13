import { test, expect } from "@playwright/test";

test.describe("Lawyers", () => {
  test("lists lawyers on /lawyers page", async ({ page }) => {
    await page.goto("/lawyers");
    await expect(page.locator("main h2").first()).toContainText("Lawyers");
    // Should show seeded lawyers
    await expect(page.getByText("Kullarat Phongsathaporn").first()).toBeVisible();
  });

  test("navigates to lawyer detail page", async ({ page }) => {
    await page.goto("/lawyers");
    await page.getByText("Kullarat Phongsathaporn").first().click();
    await page.waitForURL(/\/lawyers\//);
    // Detail page should show career history and rankings
    await expect(page.getByText("Overview")).toBeVisible();
    await expect(page.getByText("Career History")).toBeVisible();
  });

  test("shows lawyer creation form", async ({ page }) => {
    await page.goto("/lawyers/new");
    await expect(page.getByText("New Lawyer")).toBeVisible();
    await expect(page.getByLabel("Full Name")).toBeVisible();
  });
});
