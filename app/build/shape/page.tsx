"use client";

import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { SHAPES } from "@/lib/catalog";

export default function ShapeStep() {
  return (
    <>
      <StepHeader title="Shape" hint="Start with the outline." />
      <OptionGrid
        options={SHAPES}
        selected={(c) => c.shape}
        patch={(shape) => ({ shape })}
      />
      <ViolationCard field="shape" />
      <StepFooter />
    </>
  );
}
