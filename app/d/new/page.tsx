import Link from "next/link";
import type { Metadata } from "next";
import { CakePreview } from "@/components/CakePreview";
import { LoadConfig } from "@/components/builder/LoadConfig";
import { PriceBreakdown } from "@/components/docket/PriceBreakdown";
import { decodeConfig } from "@/lib/share";
import { titleCase } from "@/lib/format";
import { priceCake } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "A shared cake — Makemycake",
  robots: { index: false, follow: false },
};

/** A design carried entirely in the URL — no database row, no expiry. */
export default async function InlineDesign({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const config = c ? decodeConfig(c) : null;

  if (!config) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl">That link didn&rsquo;t survive the journey</h1>
        <p className="mt-2 text-body text-steel">
          Cake designs travel in the address bar, and something trimmed this one.
          Ask whoever sent it to share it again, or build your own.
        </p>
        <Link
          href="/build/shape"
          className="mt-5 inline-block rounded-sm bg-ink px-4 py-2 text-meta text-paper"
        >
          Build one
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="font-mono text-body font-bold tracking-wider">
        MAKEMYCAKE
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="aspect-square overflow-hidden rounded-sm bg-paper paper-edge">
          <CakePreview config={config} autoRotate />
        </div>

        <div>
          <h1 className="text-3xl leading-tight">
            {titleCase(config.sponge)}, {config.size}
          </h1>
          <p className="mt-1 text-body text-steel">
            {titleCase(config.frosting)} · {titleCase(config.finish)} finish
          </p>

          <div className="mt-5 rounded-sm bg-paper p-4 paper-edge">
            <PriceBreakdown price={priceCake(config)} />
          </div>

          <div className="mt-5">
            <LoadConfig config={config} label="Open in the builder" />
          </div>
        </div>
      </div>
    </main>
  );
}
