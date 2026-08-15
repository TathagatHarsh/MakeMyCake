/**
 * Screenshot any route, at a chosen viewport.
 *
 *   npm run shot -- /build/shape builder-desktop
 *   npm run shot -- /build/shape builder-mobile --mobile
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.SHOT_URL ?? "http://localhost:3001";

async function main() {
  const [route = "/", name = "shot"] = process.argv.slice(2);
  const mobile = process.argv.includes("--mobile");
  // Chromium resizes the viewport for a full-page capture, which leaves WebGL
  // content stale. Pass --fold to capture the viewport as it actually renders.
  const fold = process.argv.includes("--fold");
  const dir = path.resolve("docs/screens");
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader"],
  });

  const page = await browser.newPage(
    mobile
      ? { ...devices["Pixel 7"] }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  );

  page.on("console", m => { if (m.type() === "error") console.error("[page]", m.text()); });

  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: !mobile && !fold });
  console.log(`Wrote ${file}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
