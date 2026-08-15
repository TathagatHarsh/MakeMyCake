import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * WCAG 2.1 AA, checked rather than assumed. The plan's definition of done says
 * "the whole thing works with a keyboard" — this is the part of that claim a
 * machine can settle.
 */
const ROUTES = [
  ["/", "landing"],
  ["/presets", "presets"],
  ["/build/shape", "shape step"],
  ["/build/size", "size and tiers"],
  ["/build/frosting", "frosting step"],
  ["/build/finish", "colour and finish"],
  ["/build/toppings", "toppings step"],
  ["/build/message", "message step"],
  ["/build/review", "review"],
] as const;

test.describe("accessibility", () => {
  for (const [route, name] of ROUTES) {
    test(`${name} has no WCAG A/AA violations`, async ({ page }) => {
      await page.goto(route);
      await page.waitForSelector("canvas, main");
      await page.waitForTimeout(1500);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const summary = results.violations.map(v =>
        `${v.id} (${v.impact}) — ${v.help}\n    ${v.nodes.map(n => n.target.join(" ")).join("\n    ")}`,
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

  test("the builder can be driven with the keyboard alone", async ({ page }) => {
    await page.goto("/build/shape");
    await page.waitForSelector("canvas");

    // The shape options are a radiogroup with a roving tabindex, so Tab reaches
    // the group once and the arrow keys move within it. That is the behaviour
    // a screen-reader user is taught to expect from a single-select group, and
    // it is what replaced eleven independently-tabbable toggle buttons.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(() => document.activeElement?.textContent ?? "");
      if (label.startsWith("Round")) break;
    }

    // Round → Square → Rectangle → Heart.
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");

    await expect(page.getByRole("radio", { name: /^Heart/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const docket = page.getByRole("complementary", { name: "Order docket" });
    await expect(docket).toContainText("HEART");
  });
});
