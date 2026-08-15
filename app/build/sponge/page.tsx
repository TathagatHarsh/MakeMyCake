"use client";

import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { SPONGES } from "@/lib/catalog";
import { useConfig, useSetConfig } from "@/lib/store";

export default function SpongeStep() {
  const config = useConfig();
  const set = useSetConfig();

  return (
    <>
      <StepHeader title="Sponge" hint="The cake itself. This is what people taste first." />

      <OptionGrid
        options={SPONGES}
        selected={(c) => c.sponge}
        patch={(sponge) => ({ sponge })}
      />

      <fieldset className="mt-6 space-y-2">
        <legend className="mb-2 text-meta text-steel">
          Dietary
        </legend>

        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-rule bg-paper/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={config.eggless}
            onChange={(e) => set({ eggless: e.target.checked })}
            className="mt-0.5 size-4 accent-ink"
          />
          <span>
            <span className="block text-body font-medium">Eggless</span>
            <span className="mt-0.5 block text-meta leading-snug text-steel">
              Our default. The crumb is slightly denser and holds moisture better.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-rule bg-paper/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={config.sugarFree}
            onChange={(e) => set({ sugarFree: e.target.checked })}
            className="mt-0.5 size-4 accent-ink"
          />
          <span>
            <span className="block text-body font-medium">Sugar-free</span>
            <span className="mt-0.5 block text-meta leading-snug text-steel">
              Sweetened with stevia and dates. Separate batch, so it costs more.
            </span>
          </span>
        </label>
      </fieldset>

      <ViolationCard />
      <StepFooter />
    </>
  );
}
