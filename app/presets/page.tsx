import type { Metadata } from "next";
import Link from "next/link";
import { CakePreview } from "@/components/CakePreview";
import { LoadConfig } from "@/components/builder/LoadConfig";
import { PRESETS } from "@/lib/presets";
import { priceCake } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { servingsLabel } from "@/lib/servings";

export const metadata: Metadata = {
  title: "Start from one of these — Makemycake",
  description: "Eight cakes worth stealing. Open one and change whatever you like.",
};

export default function PresetsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/" className="font-mono text-body font-bold tracking-wider">
        MAKEMYCAKE
      </Link>

      <header className="mt-6 mb-6">
        <h1 className="text-3xl">Start from one of these</h1>
        <p className="mt-1 max-w-xl text-body text-steel">
          Eight designs that work. Open any of them and change whatever you like —
          nothing here is fixed.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((p) => (
          <article key={p.slug} className="overflow-hidden rounded-sm bg-paper paper-edge">
            <div className="aspect-square">
              <CakePreview config={p.config} interactive={false} />
            </div>
            <div className="border-t border-rule px-3 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-item font-medium">{p.name}</h2>
                <span className="font-mono text-meta tabular-nums text-steel">
                  {formatINR(priceCake(p.config).total)}
                </span>
              </div>
              <p className="mt-1 text-body leading-snug text-steel">{p.blurb}</p>
              <p className="mt-1 text-meta text-steel">
                {servingsLabel(p.config)}
              </p>
              <div className="mt-3">
                {/* A preset is a finished cake. Loading one and then dropping
                    the customer at step 1 of 9 asks them to walk through every
                    decision that was already made for them, which is the
                    opposite of what a preset is for. Land on Review; the step
                    nav is right there if they want to change something. */}
                <LoadConfig config={p.config} to="/build/review" label="Make it mine" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
