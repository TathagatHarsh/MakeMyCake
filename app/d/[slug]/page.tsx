import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CakePreview } from "@/components/CakePreview";
import { LoadConfig } from "@/components/builder/LoadConfig";
import { PriceBreakdown } from "@/components/docket/PriceBreakdown";
import { db, hasDatabase } from "@/lib/db";
import { allergenLine } from "@/lib/allergens";
import { formatINR, titleCase } from "@/lib/format";
import { priceCake } from "@/lib/pricing";
import { migrateConfig } from "@/lib/schema";
import { deriveHandling, servingsLabel } from "@/lib/servings";

async function load(slug: string) {
  if (!hasDatabase()) return null;
  const design = await db.design.findUnique({ where: { slug } });
  if (!design) return null;
  const config = migrateConfig(design.config);
  return config ? { design, config } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug).catch(() => null);
  if (!found) return { title: "Design not found — Makemycake" };

  const c = found.config;
  return {
    title: `${titleCase(c.size)} ${titleCase(c.sponge)} cake — Makemycake`,
    description: `${titleCase(c.frosting)}, ${titleCase(c.finish)} finish. ${formatINR(priceCake(c).total)} including GST.`,
  };
}

export default async function SharedDesign({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) notFound();

  const { config } = found;
  const price = priceCake(config);
  const handling = deriveHandling(config);

  // Views are interesting and nobody is harmed if one is lost to a race.
  db.design.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {});

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
            {titleCase(config.frosting)} · {titleCase(config.coverage)} coverage ·{" "}
            {titleCase(config.finish)} finish
            {config.tiers > 1 ? ` · ${config.tiers} tiers` : ""}
          </p>

          {config.message?.trim() && (
            <p className="mt-3 text-body">
              Plaque reads <span className="font-medium">&ldquo;{config.message.trim()}&rdquo;</span>
            </p>
          )}

          <div className="mt-5 rounded-sm bg-paper p-4 paper-edge">
            <PriceBreakdown price={price} />
          </div>

          <p className="mt-3 text-meta text-steel">
            {allergenLine(config)}
          </p>
          <p className="mt-1 text-meta text-steel">
            {servingsLabel(config)} · {handling.storage} · best before {handling.bestBefore}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <LoadConfig config={config} label="Make this one mine" />
            <Link
              href="/build/shape"
              className="rounded-sm border border-rule px-4 py-2 text-meta hover:border-ink"
            >
              Start from scratch
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
