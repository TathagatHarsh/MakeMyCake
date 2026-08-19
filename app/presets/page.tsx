import type { Metadata } from "next";
import Link from "next/link";
import { CakePreview } from "@/components/CakePreview";
import { LoadConfig } from "@/components/builder/LoadConfig";
import { PRESETS } from "@/lib/presets";
import { priceCake } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { servingsLabel } from "@/lib/servings";
import { btn, eyebrow } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Cakes we already know by heart — Makemycake",
  description: "Eight finished designs. Open one and change whatever you like.",
};

export default function PresetsPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-[78px] items-center justify-between gap-6 border-b border-rule px-4 sm:px-8 lg:px-14">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link href="/" className="font-mono text-meta font-bold tracking-[0.2em]">
            MAKEMYCAKE
          </Link>
          <span aria-hidden className="hidden size-1 rounded-full bg-rule sm:block" />
          <span className="hidden font-mono text-micro tracking-[0.1em] text-steel sm:block">
            PRESETS
          </span>
        </div>
        <Link href="/build/shape" className={btn("primary", "md")}>
          Start from scratch
        </Link>
      </header>

      <main className="px-4 sm:px-8 lg:px-14">
        <div className="flex flex-col items-start justify-between gap-8 pt-14 pb-10 lg:flex-row lg:items-end lg:gap-16">
          <div className="flex flex-col gap-4">
            <span className={`${eyebrow} tracking-[0.22em]`}>
              {PRESETS.length} finished designs
            </span>
            <h1 className="text-display">
              Cakes we already <span className="italic">know by heart.</span>
            </h1>
          </div>
          <p className="max-w-[44ch] text-lede leading-relaxed text-steel">
            Every one of these is a real configuration, not a photograph. Open any
            of them and it lands in the builder exactly as shown — then change
            whatever you like.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 border-t border-rule pt-10 pb-20 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRESETS.map((p) => (
            <li
              key={p.slug}
              className="flex flex-col overflow-hidden rounded-panel border border-rule bg-paper shadow-elev-1 transition-[box-shadow,border-color] duration-[--dur-ui] hover:border-steel hover:shadow-elev-3"
            >
              <div className="cake-stage h-[14.375rem] border-b border-rule">
                <CakePreview config={p.config} interactive={false} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <h2 className="font-sans text-item font-medium">{p.name}</h2>
                  <span className="shrink-0 font-mono text-meta font-bold tabular-nums">
                    {formatINR(priceCake(p.config).total)}
                  </span>
                </div>
                <p className="flex-1 text-meta leading-normal text-steel">{p.blurb}</p>
                <span className="font-mono text-micro tracking-[0.14em] text-steel uppercase">
                  {servingsLabel(p.config)}
                </span>
                {/* A preset is a finished cake. Loading one and then dropping
                    the customer at step 1 of 9 asks them to walk through every
                    decision that was already made for them, which is the
                    opposite of what a preset is for. Land on Review; the step
                    nav is right there if they want to change something. */}
                <LoadConfig
                  config={p.config}
                  to="/build/review"
                  label="Make it mine"
                  className="w-full"
                />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
