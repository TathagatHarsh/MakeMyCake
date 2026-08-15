/** Capture the plaque while the message is being typed, and after Done. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.SHOT_URL ?? "http://localhost:3000";

async function main() {
  const dir = path.resolve("docs/screens");
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on("console", m => { if (m.type() === "error") console.error("[page]", m.text()); });

  await page.goto(`${BASE}/build/toppings`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  // Something that would otherwise land on the words.
  await page.getByRole("button", { name: /^Sprinkles/ }).click();
  await page.waitForTimeout(1200);

  await page.getByRole("link", { name: "Message →" }).click();
  await page.getByPlaceholder("Happy Birthday Amma").type("Happy Birthday Amma", { delay: 40 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(dir, "message-composing.png") });
  console.log("message-composing.png");

  await page.getByRole("button", { name: /^Done/ }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(dir, "message-placed.png") });
  console.log("message-placed.png");

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
