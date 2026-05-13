import { test, expect } from "@playwright/test";

test.describe("Rankings", () => {
  test("shows ranking leaderboard", async ({ page }) => {
    await page.goto("/rankings");
    await expect(page.locator("main h2").first()).toContainText("Rankings");
    // Should show ranked firms (default tab)
    await expect(page.getByText("Chambers").first()).toBeVisible();
  });

  test("admin rankings page loads", async ({ page }) => {
    await page.goto("/admin/rankings");
    await expect(page.getByText("Manage Rankings")).toBeVisible();
    // Should show ranking sources table
    await expect(page.getByText("Chambers").first()).toBeVisible();
    // Should show CSV import section
    await expect(page.getByText("Import Firm Rankings from CSV")).toBeVisible();
    // Should show export button
    await expect(page.getByText("Export Firms CSV")).toBeVisible();
  });
});
