/** Measure what a route actually downloads. The 3D bundle is the whole cost centre. */
import { chromium } from "@playwright/test";
import { gzipSync } from "node:zlib";

const BASE = process.env.SHOT_URL ?? "http://localhost:3100";

async function measure(route: string) {
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=default", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let js = 0, css = 0, jsGz = 0, threeGz = 0;
  const seen = new Set<string>();

  page.on("response", async (res) => {
    const url = res.url();
    if (seen.has(url)) return;
    seen.add(url);
    try {
      const body = await res.body();
      if (url.endsWith(".js")) {
        js += body.length;
        const gz = gzipSync(body).length;
        jsGz += gz;
        // Chunks that mention three's own internals are the 3D cost centre.
        if (/WebGLRenderer|BufferGeometry|MeshPhysicalMaterial/.test(body.toString("utf8"))) {
          threeGz += gz;
        }
      }
      if (url.endsWith(".css")) css += body.length;
    } catch { /* redirects and the like */ }
  });

  const t0 = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30_000 }).catch(() => {});
  const ms = Date.now() - t0;

  const kb = (n: number) => (n / 1024).toFixed(0).padStart(5) + " KB";
  console.log(
    `${route.padEnd(14)} js ${kb(js)} raw / ${kb(jsGz)} gz` +
    `   of which 3D ${kb(threeGz)} gz   css ${kb(css)}   canvas in ${ms}ms`,
  );

  await browser.close();
}

async function main() {
  console.log("Transfer per route, gzip measured rather than guessed.\n");
  for (const r of ["/", "/build/shape", "/presets"]) await measure(r);
}

main().catch(e => { console.error(e); process.exit(1); });
