import { test, expect } from "@playwright/test";

test.describe("Firms", () => {
  test("lists firms on /firms page", async ({ page }) => {
    await page.goto("/firms");
    await expect(page.locator("main h2").first()).toContainText("Firms");
    // Should have firm cards (we seeded 10 firms)
    await expect(page.getByText("Baker McKenzie")).toBeVisible();
  });

  test("navigates to firm detail page", async ({ page }) => {
    await page.goto("/firms");
    await page.getByText("Baker McKenzie").first().click();
    await page.waitForURL(/\/firms\//);
    // Detail page shows overview
    await expect(page.getByText("Overview")).toBeVisible();
    // Shows NPS section
    await expect(page.getByText("Internal Sentiment")).toBeVisible();
  });

  test("shows firm creation form", async ({ page }) => {
    await page.goto("/firms/new");
    await expect(page.getByText("New Firm")).toBeVisible();
    await expect(page.getByLabel("Firm Name")).toBeVisible();
    await expect(page.getByLabel("Country")).toBeVisible();
  });
});
