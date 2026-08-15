"use client";

import { useMemo } from "react";
import type { CakeConfig } from "@/lib/schema";
import { seedFrom } from "@/lib/seed";
import { CakeBoard } from "./CakeBoard";
import { MessagePlaque, plaqueFootprint } from "./MessagePlaque";
import { Tier } from "./Tier";
import { Toppings } from "./Toppings";
import { DEFAULT_SLICE, footprintRadius, tierDims } from "./geometry";

interface Props {
  config: CakeConfig;
  segments?: number;
  castShadow?: boolean;
  maxInstances?: number;
  showBoard?: boolean;
  /** Cut a wedge out so the sponge and filling are visible. */
  sliced?: boolean;
  /** The message is still being typed; the plaque hovers clear of the cake. */
  composingMessage?: boolean;
}

/**
 * Reads the config and composes tiers. This is the only place that knows how a
 * cake is put together; every other three component knows about one part of it.
 */
export function Cake({
  config,
  segments = 72,
  castShadow = true,
  maxInstances = 80,
  showBoard = true,
  sliced = false,
  composingMessage = false,
}: Props) {
  const seed = useMemo(() => seedFrom(config), [config]);
  const tiers = useMemo(
    () => tierDims(config.size, config.tiers, config.shape),
    [config.size, config.tiers, config.shape],
  );

  // Worked out once and handed to the toppings, so nothing lands on the words.
  const keepOff = useMemo(() => plaqueFootprint(config, tiers), [config, tiers]);

  return (
    <group>
      {showBoard && <CakeBoard radius={tiers[0].radius} />}

      {tiers.map((dims, i) => (
        <Tier
          key={i}
          config={config}
          dims={dims}
          index={i}
          seed={seed}
          segments={segments}
          castShadow={castShadow}
          isTop={i === tiers.length - 1}
          sliced={sliced}
        />
      ))}

      <Toppings
        config={config}
        tiers={tiers}
        seed={seed}
        castShadow={castShadow}
        maxInstances={maxInstances}
        keepOff={keepOff}
        sector={sliced ? DEFAULT_SLICE : undefined}
      />

      <MessagePlaque
        config={config}
        tiers={tiers}
        castShadow={castShadow}
        composing={composingMessage}
      />
    </group>
  );
}

/** Where the camera should look, given how tall the cake ended up. */
export function cakeFocus(config: CakeConfig): { height: number; radius: number } {
  const tiers = tierDims(config.size, config.tiers, config.shape);
  const top = tiers[tiers.length - 1];
  return {
    height: top.y + top.height,
    radius: footprintRadius(config.shape, tiers[0].radius),
  };
}
