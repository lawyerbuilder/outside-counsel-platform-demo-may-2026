import { test, expect } from "@playwright/test";

test.describe("Directory page", () => {
  test("loads and shows recommended firms", async ({ page }) => {
    await page.goto("/directory");
    await expect(page.locator("main h2").first()).toContainText("Directory");
    // Should show "Recommended for You" section
    await expect(page.getByText("Recommended for You")).toBeVisible();
    // Should show firm cards with fit scores
    await expect(page.getByText("Fit Score").first()).toBeVisible();
  });

  test("can switch between firms and lawyers tabs", async ({ page }) => {
    await page.goto("/directory");
    // Default is firms
    await expect(page.getByRole("button", { name: "Firms" })).toBeVisible();
    // Click lawyers tab
    await page.getByRole("button", { name: "Lawyers" }).click();
    await page.waitForURL(/type=lawyers/);
    await expect(page.getByText("Recommended for You")).toBeVisible();
  });

  test("can filter by practice area", async ({ page }) => {
    await page.goto("/directory");
    const select = page.locator("select").filter({ hasText: "All Practice Areas" });
    await select.selectOption({ index: 1 }); // Pick the first practice area
    // Wait for URL to update via client-side navigation
    await page.waitForURL(/practiceAreaId=/, { timeout: 5000 });
  });
});
