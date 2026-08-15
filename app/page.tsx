import Link from "next/link";
import { CakePreview } from "@/components/CakePreview";
import { FSSAI_LICENCE } from "@/lib/docket";
import { PRESETS } from "@/lib/presets";
import { priceCake } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { servingsLabel } from "@/lib/servings";

const HERO = PRESETS.find(p => p.slug === "two-tier-celebration")!.config;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <span className="font-mono text-body font-bold tracking-wider">MAKEMYCAKE</span>
        <nav className="flex items-center gap-5 text-meta">
          <Link href="/presets" className="text-steel transition-colors hover:text-ink">
            Presets
          </Link>
          <Link
            href="/build/shape"
            className="inline-flex min-h-9 items-center rounded-md bg-ink px-3.5 font-medium text-paper transition-colors hover:bg-graphite"
          >
            Build a cake
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-4 pb-12 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[0.95]">
              Build your cake.<br />Watch it appear.
            </h1>
            {/* Was 58 words across five lines, and three of those sentences were
                the site describing its own mechanics. Nobody buying a cake reads
                that far before the first button. */}
            <p className="mt-5 max-w-sm text-lede leading-snug text-graphite">
              Change anything and the cake changes with it. The price moves at the
              same moment, and it says why.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/build/shape"
                className="inline-flex min-h-12 items-center rounded-md bg-ink px-6 text-item font-medium text-paper transition-colors duration-[--dur-ui] hover:bg-graphite"
              >
                Start building
              </Link>
              <Link
                href="/presets"
                className="inline-flex min-h-12 items-center rounded-md border border-rule-strong px-6 text-item transition-colors duration-[--dur-ui] hover:border-ink"
              >
                Start from a preset
              </Link>
            </div>

            <p className="mt-6 text-meta leading-relaxed text-steel">
              Jubilee Hills, Hyderabad. Lead time is stated on every slot. Nothing
              is charged until we have called you.
            </p>
          </div>

          <div className="cake-stage aspect-square overflow-hidden rounded-lg paper-edge">
            <CakePreview config={HERO} autoRotate />
          </div>
        </section>

        {/*
          Three equal cards in a row is the single most recognisable shape of a
          page that was generated rather than written. These are three claims of
          very different weight and they are now laid out that way: the one a
          customer is actually deciding on gets the room, the other two are
          supporting evidence underneath it.
        */}
        <section className="border-y border-rule bg-paper/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              <div>
                <h2 className="text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.05]">
                  The price is on screen the whole time, itemised.
                </h2>
                <p className="mt-4 max-w-lg text-lede leading-snug text-graphite">
                  Every line names a real thing: the sponge, the second tier, the
                  hand-piped border. It is never revealed at checkout, because by
                  then you have already spent twenty minutes on it.
                </p>
              </div>

              <dl className="grid gap-6 self-center border-l-0 lg:border-l lg:border-rule lg:pl-16">
                <div>
                  <dt className="text-item font-medium">Impossible cakes are stopped early</dt>
                  <dd className="mt-1.5 text-body leading-relaxed text-steel">
                    Whipped cream will not hold a second tier. The site says that,
                    in those words, with a one-tap fix, at the moment you choose it.
                  </dd>
                </div>
                <div>
                  <dt className="text-item font-medium">You get a docket, not a screenshot</dt>
                  <dd className="mt-1.5 text-body leading-relaxed text-steel">
                    Build, allergens, portions, storage. The form a kitchen works
                    from, so what arrives is what you designed.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-[clamp(1.5rem,3vw,2rem)]">Or start from one of these</h2>
            <Link
              href="/presets"
              className="shrink-0 text-meta text-steel underline underline-offset-4 transition-colors hover:text-ink"
            >
              See all eight
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.slice(0, 3).map((p) => (
              <Link
                key={p.slug}
                href="/presets"
                className="group overflow-hidden rounded-lg bg-paper paper-edge transition-transform duration-[--dur-ui] ease-[--ease-out] hover:-translate-y-1"
              >
                <div className="cake-stage aspect-square">
                  <CakePreview config={p.config} interactive={false} />
                </div>
                <div className="border-t border-rule px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-item font-medium">{p.name}</span>
                    <span className="shrink-0 font-mono text-meta tabular-nums">
                      {formatINR(priceCake(p.config).total)}
                    </span>
                  </div>
                  {/* How many people it feeds is the first question anyone
                      actually has about a cake, and it was nowhere on this page. */}
                  <p className="mt-1 text-meta text-steel">{servingsLabel(p.config)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-rule px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-meta text-steel">
          <span>Makemycake · Jubilee Hills, Hyderabad</span>
          {FSSAI_LICENCE && <span>FSSAI Lic. No. {FSSAI_LICENCE}</span>}
        </div>
      </footer>
    </>
  );
}
