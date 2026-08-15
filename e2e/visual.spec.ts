import { expect, test } from "@playwright/test";

/**
 * Pixel baselines for the render.
 *
 * Every render bug in this project so far was found by a person looking at a
 * PNG — the inside-out bundt, the mirrored plaque, the drip ring hovering off
 * a heart. None of them would have survived a diff. This is that diff.
 *
 * It only works because the cake is deterministic: scatter, drips and layer
 * jitter are all seeded from a hash of the config, so the same config renders
 * the same pixels every time.
 */

/** Give the environment cubemap, the camera easing and the plaque time to settle. */
async function settle(page: import("@playwright/test").Page) {
  await page.waitForSelector("canvas");
  await page.waitForTimeout(6000);
}

test.describe("render baselines", () => {
  test("the twelve extremes, whole", async ({ page }) => {
    await page.goto("/lab");
    await settle(page);
    await expect(page).toHaveScreenshot("lab-whole.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("the twelve extremes, cut", async ({ page }) => {
    await page.goto("/lab");
    await page.waitForSelector("canvas");
    await page.getByLabel("Cut a slice").check();
    await settle(page);
    await expect(page).toHaveScreenshot("lab-cut.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("the builder, with the docket", async ({ page }) => {
    await page.goto("/build/frosting");
    await settle(page);
    await expect(page).toHaveScreenshot("builder.png", { maxDiffPixelRatio: 0.02 });
  });

  test("the plaque hovers while the message is being typed", async ({ page }) => {
    await page.goto("/build/message");
    await page.waitForSelector("canvas");
    await page.getByPlaceholder("Happy Birthday Amma").fill("Happy Birthday Amma");
    await settle(page);
    await expect(page).toHaveScreenshot("message-composing.png", { maxDiffPixelRatio: 0.02 });
  });

  test("the plaque settles onto the cake when it is done", async ({ page }) => {
    await page.goto("/build/message");
    await page.waitForSelector("canvas");
    await page.getByPlaceholder("Happy Birthday Amma").fill("Happy Birthday Amma");
    await page.getByRole("button", { name: /^Done/ }).click();
    await settle(page);
    await expect(page).toHaveScreenshot("message-placed.png", { maxDiffPixelRatio: 0.02 });
  });

  test("the landing hero", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page).toHaveScreenshot("landing.png", { maxDiffPixelRatio: 0.02 });
  });
});
