import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test("shows preference weights", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("main h2").first()).toContainText("Settings");
    // Should show scoring weights section
    await expect(page.getByText("Scoring Weights")).toBeVisible();
    // Should show the 6 weight sliders
    await expect(page.getByText("Responsiveness")).toBeVisible();
    await expect(page.getByText("Quality of Work")).toBeVisible();
    await expect(page.getByText("Commercial Awareness")).toBeVisible();
    await expect(page.getByText("Value for Money")).toBeVisible();
    await expect(page.getByText("Subject-Matter Expertise")).toBeVisible();
    await expect(page.getByText("Peer Sentiment (NPS)")).toBeVisible();
    // Should show save button
    await expect(page.getByRole("button", { name: "Save Preferences" })).toBeVisible();
  });

  test("shows user info", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("About You")).toBeVisible();
    await expect(page.getByText("Sarah Scales")).toBeVisible();
  });
});
