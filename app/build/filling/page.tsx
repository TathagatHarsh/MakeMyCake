"use client";

import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { FILLINGS } from "@/lib/catalog";
import { useConfig } from "@/lib/store";

export default function FillingStep() {
  const config = useConfig();

  return (
    <>
      <StepHeader title="Filling" hint="What sits between the layers." />

      <OptionGrid
        options={FILLINGS}
        selected={(c) => c.filling}
        patch={(filling) => ({ filling })}
      />

      {config.shape === "bundt" && (
        <p className="mt-3 text-body leading-snug text-steel">
          A bundt is baked in one piece in a ring mould, so there are no layers to
          fill. Your filling will be served alongside instead.
        </p>
      )}

      <ViolationCard field="filling" />
      <StepFooter />
    </>
  );
}
