"use client";

import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { PLACEMENTS, TOPPINGS } from "@/lib/catalog";
import { deltaFor } from "@/lib/pricing";
import { formatDelta } from "@/lib/format";
import type { Topping, ToppingPlacement } from "@/lib/schema";
import { useConfig, useSetConfig } from "@/lib/store";

const MAX = 4;

export default function ToppingsStep() {
  const config = useConfig();
  const set = useSetConfig();
  const chosen = config.toppings;

  const add = (kind: Topping) => {
    if (chosen.length >= MAX) return;
    set({
      toppings: [...chosen, { kind, placement: "top-scatter" as ToppingPlacement, density: 3 }],
    });
  };

  const remove = (i: number) =>
    set({ toppings: chosen.filter((_, n) => n !== i) });

  const update = (i: number, patch: Partial<(typeof chosen)[number]>) =>
    set({ toppings: chosen.map((t, n) => (n === i ? { ...t, ...patch } : t)) });

  return (
    <>
      <StepHeader title="Toppings" hint="What lands on it. Up to four." />

      {chosen.length === 0 ? (
        <p className="rounded-sm border border-dashed border-rule px-3 py-4 text-body text-steel">
          No toppings. Plenty of cakes don&rsquo;t need any.
        </p>
      ) : (
        <ul className="space-y-3">
          {chosen.map((t, i) => {
            const meta = TOPPINGS.find(x => x.value === t.kind)!;
            return (
              <li key={`${t.kind}-${i}`} className="rounded-sm border border-ink bg-paper px-3 py-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 size-6 shrink-0 rounded-full border border-black/10"
                    style={{ background: meta.swatch }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-body font-medium">{meta.name}</span>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-meta text-steel underline underline-offset-2 hover:text-seal"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-0.5 text-meta leading-snug text-steel">{meta.blurb}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 @md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-meta text-steel">
                      Placement
                    </span>
                    <select
                      value={t.placement}
                      onChange={(e) => update(i, { placement: e.target.value as ToppingPlacement })}
                      className="w-full rounded-sm border border-rule bg-paper px-2 py-1.5 text-body"
                    >
                      {PLACEMENTS.map(p => (
                        <option key={p.value} value={p.value}>{p.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 flex items-baseline justify-between text-meta text-steel">
                      <span>Density</span>
                      <span className="tabular-nums">{t.density}/5</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={t.density}
                      onChange={(e) => update(i, { density: Number(e.target.value) })}
                      className="w-full accent-ink"
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          {chosen.length >= MAX ? "Four is the limit" : "Add a topping"}
        </legend>

        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
          {TOPPINGS.map((o) => {
            const already = chosen.some(t => t.kind === o.value);
            const full = chosen.length >= MAX;
            const delta = deltaFor(config, {
              toppings: [...chosen, { kind: o.value, placement: "top-scatter", density: 3 }],
            });

            return (
              <button
                key={o.value}
                type="button"
                disabled={already || full}
                onClick={() => add(o.value)}
                className={[
                  "flex gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors",
                  "border-rule bg-paper/60 enabled:hover:border-ink",
                  already || full ? "border-dashed bg-slab-deep/40" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className="mt-0.5 size-6 shrink-0 rounded-full border border-black/10"
                  style={{ background: o.swatch }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body font-medium">{o.name}</span>
                    <span className="shrink-0 font-mono text-micro tabular-nums text-steel">
                      {already ? "added" : formatDelta(delta)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-meta leading-snug text-steel">
                    {o.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <ViolationCard field="toppings" />
      <StepFooter />
    </>
  );
}
