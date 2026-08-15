"use client";

import { ColorPicker } from "@/components/builder/ColorPicker";
import { OptionGrid } from "@/components/builder/OptionGrid";
import { StepFooter } from "@/components/builder/StepNav";
import { StepHeader } from "@/components/builder/StepHeader";
import { ViolationCard } from "@/components/builder/ViolationCard";
import { DRIP_PALETTE, FINISHES, FROSTING_PALETTE } from "@/lib/catalog";
import { deltaFor } from "@/lib/pricing";
import { blockerFor } from "@/lib/rules";
import { formatDelta } from "@/lib/format";
import { FROSTING_MATERIALS } from "@/components/three/materials";
import { useConfig, useSetConfig } from "@/lib/store";

export default function FinishStep() {
  const config = useConfig();
  const set = useSetConfig();

  const fixedColour = FROSTING_MATERIALS[config.frosting].fixedColor;
  const dripBlocked = blockerFor(config, { hasDrip: true });

  return (
    <>
      <StepHeader title="Colour & finish" hint="Surface texture and hue." />

      {fixedColour ? (
        <p className="mb-4 rounded-sm border border-rule bg-paper/60 px-3 py-2.5 text-body leading-snug text-steel">
          Ganache is chocolate and cream — its colour comes from the chocolate, so
          there is nothing to tint. Pick a different frosting if you want a colour.
        </p>
      ) : (
        <ColorPicker
          label="Frosting colour"
          value={config.frostingColor}
          onChange={(frostingColor) => set({ frostingColor })}
          palette={FROSTING_PALETTE}
        />
      )}

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          Finish
        </legend>
        <OptionGrid
          options={FINISHES}
          selected={(c) => c.finish}
          patch={(finish) => ({ finish })}
        />
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-meta text-steel">
          Drip
        </legend>

        <label
          title={dripBlocked?.message}
          className={[
            "flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-2.5",
            config.hasDrip ? "border-ink bg-paper" : "border-rule bg-paper/60",
            dripBlocked && !config.hasDrip ? "border-dashed bg-slab-deep/40" : "",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={config.hasDrip}
            onChange={(e) => set({ hasDrip: e.target.checked })}
            className="mt-0.5 size-4 accent-ink"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-body font-medium">Chocolate drip</span>
              <span className="font-mono text-micro tabular-nums text-steel">
                {formatDelta(deltaFor(config, { hasDrip: !config.hasDrip }))}
              </span>
            </span>
            <span className="mt-0.5 block text-meta leading-snug text-steel">
              Poured warm at the rim so it runs a little way down the side.
            </span>
            {dripBlocked && (
              <span className="mt-1 block font-mono text-micro leading-snug text-seal">
                {dripBlocked.message}
              </span>
            )}
          </span>
        </label>

        {config.hasDrip && (
          <div className="mt-4">
            <ColorPicker
              label="Drip colour"
              value={config.dripColor ?? "#3B2318"}
              onChange={(dripColor) => set({ dripColor })}
              palette={DRIP_PALETTE}
            />
          </div>
        )}
      </fieldset>

      <ViolationCard />
      <StepFooter />
    </>
  );
}
