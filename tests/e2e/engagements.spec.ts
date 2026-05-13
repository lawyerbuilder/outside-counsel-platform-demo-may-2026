import { test, expect } from "@playwright/test";

test.describe("Engagements", () => {
  test("shows engagement list", async ({ page }) => {
    await page.goto("/engagements");
    await expect(page.locator("main h2").first()).toContainText("Engagements");
    // Should show seeded engagements
    await expect(page.getByText("SCG Packaging Acquisition").first()).toBeVisible();
    // Should show outcome badges
    await expect(page.getByText("COMPLETED").first()).toBeVisible();
  });
});
