/**
 * Walk the whole builder and record it. Produces a video plus a numbered still
 * for each beat, so the flow can be reviewed without a browser.
 *
 *   npm run demo
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.DEMO_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/demo");

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  page.on("console", m => { if (m.type() === "error") console.error("[page]", m.text()); });

  let n = 0;
  const beat = async (label: string, wait = 1600) => {
    await page.waitForTimeout(wait);
    const file = path.join(OUT, `${String(++n).padStart(2, "0")}-${label}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${path.basename(file)}`);
  };

  console.log("Recording:");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await beat("landing", 4000);

  await page.getByRole("link", { name: "Start building" }).click();
  await page.waitForSelector("canvas");
  await beat("shape", 3500);

  // A heart, so the shape change is unmistakable.
  await page.getByRole("button", { name: /^Heart/ }).click();
  await beat("shape-heart", 2200);

  await page.getByRole("link", { name: "Size & tiers →" }).click();
  await page.getByRole("button", { name: /^2 kg/ }).click();
  await beat("size-2kg");

  await page.getByRole("button", { name: /^2 tiers/ }).click();
  await beat("size-two-tier", 2400);

  await page.getByRole("link", { name: "Sponge →" }).click();
  await page.getByRole("button", { name: /^Belgian Chocolate/ }).click();
  await beat("sponge");

  await page.getByRole("link", { name: "Filling →" }).click();
  await page.getByRole("button", { name: /^Salted Caramel/ }).click();
  await beat("filling");

  // Cut it open: sponge layers and the caramel between them.
  await page.getByRole("button", { name: "Cut a slice" }).click();
  await beat("sliced", 3200);
  await page.getByRole("button", { name: "Whole cake" }).click();
  await beat("unsliced", 2000);

  // The compatibility rule, shown rather than described.
  await page.getByRole("link", { name: "Frosting →" }).click();
  await page.getByRole("button", { name: /^Whipped Cream/ }).click();
  await page.getByRole("main").getByRole("alert").scrollIntoViewIfNeeded();
  await beat("rule-blocked", 2600);

  await page.getByRole("button", { name: "Use Swiss meringue instead" }).click();
  await beat("rule-fixed", 2400);

  await page.getByRole("link", { name: "Colour & finish →" }).click();
  await page.getByRole("button", { name: "Blush" }).click();
  await beat("colour", 2200);

  await page.getByRole("button", { name: /^Ruffle/ }).click();
  await beat("finish-ruffle", 2800);

  await page.getByRole("button", { name: /Chocolate drip/ }).click().catch(async () => {
    await page.getByText("Chocolate drip").click();
  });
  await beat("drip", 2600);

  await page.getByRole("link", { name: "Toppings →" }).click();
  await page.getByRole("button", { name: /^Macaron/ }).click();
  await beat("topping-macaron", 2400);

  await page.getByRole("combobox").first().selectOption("crown");
  await beat("topping-crown", 2600);

  await page.getByRole("button", { name: /^Gold Leaf/ }).click();
  await beat("topping-gold", 2400);

  await page.getByRole("link", { name: "Message →" }).click();
  await page.getByPlaceholder("Happy Birthday Amma").type("Happy Birthday Amma", { delay: 45 });
  // Held clear of the cake, readable, while it is still being typed.
  await beat("message-lifted", 3000);

  await page.getByRole("button", { name: /^Done/ }).click();
  await beat("message-placed", 3000);

  await page.getByPlaceholder("500081").fill("500081");
  await beat("delivery", 1600);

  // And the cut again, now with the plaque and the toppings on it.
  await page.getByRole("button", { name: "Cut a slice" }).click();
  await beat("sliced-finished", 3200);
  await page.getByRole("button", { name: "Whole cake" }).click();
  await beat("whole-finished", 2000);

  // Undo, to show the config coming back.
  await page.getByRole("button", { name: "↩ Undo" }).click();
  await beat("undo", 1800);
  await page.getByRole("button", { name: "Redo ↪" }).click();
  await beat("redo", 1600);

  await page.getByRole("link", { name: "Review →" }).click();
  await beat("review", 3200);

  await page.mouse.wheel(0, 1200);
  await beat("review-price", 1400);

  await page.getByLabel("Name").fill("Aryu");
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByRole("button", { name: /^Place order/ }).click();
  await beat("order-placed", 3000);

  await context.close();
  await browser.close();

  // Give the recording a name worth keeping.
  const webm = readdirSync(OUT).find(f => f.endsWith(".webm"));
  if (webm) {
    renameSync(path.join(OUT, webm), path.join(OUT, "makemycake-demo.webm"));
    console.log(`\nVideo: docs/demo/makemycake-demo.webm`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
