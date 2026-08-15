"use client";

import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { COVERAGES, FROSTINGS } from "@/lib/catalog";

export default function FrostingStep() {
  return (
    <>
      <StepHeader title="Frosting" hint="What covers it, and how much of it." />

      <OptionGrid
        options={FROSTINGS}
        selected={(c) => c.frosting}
        patch={(frosting) => ({ frosting })}
      />

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          Coverage
        </legend>
        <OptionGrid
          options={COVERAGES}
          selected={(c) => c.coverage}
          patch={(coverage) => ({ coverage })}
        />
      </fieldset>

      <ViolationCard />
      <StepFooter />
    </>
  );
}
