"use client";

import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { SIZES } from "@/lib/catalog";
import { deltaFor } from "@/lib/pricing";
import { blockerFor } from "@/lib/rules";
import { formatDelta } from "@/lib/format";
import { servingsLabel } from "@/lib/servings";
import { useConfig, useSetConfig } from "@/lib/store";

export default function SizeStep() {
  const config = useConfig();
  const set = useSetConfig();

  return (
    <>
      <StepHeader title="Size & tiers" hint="How many people are eating?" />

      <OptionGrid
        options={SIZES}
        selected={(c) => c.size}
        patch={(size) => ({ size })}
        columns={2}
      />

      <p className="mt-2 text-meta text-steel">
        {servingsLabel(config)} — based on standard 100g portions
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          Tiers
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((tiers) => {
            const patch = { tiers };
            const blocked = blockerFor(config, patch);
            const delta = deltaFor(config, patch);
            return (
              <button
                key={tiers}
                type="button"
                onClick={() => set(patch)}
                aria-pressed={config.tiers === tiers}
                title={blocked?.message}
                className={[
                  "rounded-sm border px-3 py-2.5 text-left transition-colors",
                  config.tiers === tiers ? "border-ink bg-paper" : "border-rule bg-paper/60 hover:border-steel",
                  blocked ? "border-dashed bg-slab-deep/40" : "",
                ].join(" ")}
              >
                <span className="block text-body font-medium">
                  {tiers} tier{tiers > 1 ? "s" : ""}
                </span>
                <span className="mt-0.5 block font-mono text-micro tabular-nums text-steel">
                  {formatDelta(delta)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          Sponge layers
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((layers) => (
            <button
              key={layers}
              type="button"
              onClick={() => set({ layers })}
              aria-pressed={config.layers === layers}
              className={[
                "rounded-sm border px-3 py-2.5 text-left transition-colors",
                config.layers === layers ? "border-ink bg-paper" : "border-rule bg-paper/60 hover:border-steel",
              ].join(" ")}
            >
              <span className="block text-body font-medium">{layers} layers</span>
              <span className="mt-0.5 block font-mono text-micro tabular-nums text-steel">
                {formatDelta(deltaFor(config, { layers }))}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-meta leading-snug text-steel">
          Three is standard. A fourth layer means more filling and a taller slice.
        </p>
      </fieldset>

      <ViolationCard />
      <StepFooter />
    </>
  );
}
