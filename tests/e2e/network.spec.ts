import { test, expect } from "@playwright/test";

test.describe("Network", () => {
  test("shows boutique network page", async ({ page }) => {
    await page.goto("/network");
    await expect(page.locator("main h2").first()).toContainText("Boutique Network");
    // Should show the network graph section
    await expect(page.getByText("Firm Network")).toBeVisible();
    // Should show spin-off comparison section
    await expect(page.getByText("Spin-off Performance Comparison")).toBeVisible();
    // Should show alumni search
    await expect(page.getByText("Alumni Search")).toBeVisible();
  });

  test("alumni search dropdown shows firms", async ({ page }) => {
    await page.goto("/network");
    const select = page.locator("select").filter({ hasText: "Select a firm" });
    await expect(select).toBeVisible();
    // Should have firm options
    const options = select.locator("option");
    expect(await options.count()).toBeGreaterThan(1);
  });
});
