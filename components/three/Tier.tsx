"use client";

import * as THREE from "three";
import { useMemo } from "react";
import type { CakeConfig } from "@/lib/schema";
import { Drip } from "./Drip";
import { FrostingShell } from "./FrostingShell";
import { SpongeLayers } from "./SpongeLayers";
import { frostingMaterial, ombreBase, ombreTop } from "./materials";
import {
  DEFAULT_SLICE, shellGeometry, shellOutline, topDiscGeometry,
  type Sector, type TierDims,
} from "./geometry";
import { applyVerticalGradient, useDisposed } from "./useDisposable";

interface Props {
  config: CakeConfig;
  dims: TierDims;
  index: number;
  seed: number;
  segments: number;
  castShadow: boolean;
  /** The drip runs off the topmost tier, and only that one. */
  isTop: boolean;
  /** A wedge is cut out so the inside is visible. */
  sliced?: boolean;
}

/**
 * Full coverage is normally a single closed shell — there is no point rendering
 * a sponge nobody can see. A cutaway changes that: the whole reason for the cut
 * is the sponge and the filling, so the interior gets built regardless of
 * coverage and both are clipped to the same wedge.
 *
 * The shell geometry is built here rather than inside FrostingShell because the
 * drip needs the cake's real outline, and measuring it off the finished
 * geometry is the only way to get it right for a bevelled extrude.
 */
export function Tier({
  config, dims, index, seed, segments, castShadow, isTop, sliced = false,
}: Props) {
  const tierSeed = seed ^ ((index + 1) * 0x9e3779b9);
  const sector: Sector | undefined = sliced ? DEFAULT_SLICE : undefined;

  // A bundt is glazed, not frosted — the glaze is poured over and coats the
  // whole ring. There is no partial-coverage version of that.
  const covered = config.coverage === "full" || config.shape === "bundt";

  const shell = useDisposed(useMemo(() => {
    if (!covered) return null;
    const g = shellGeometry({
      shape: config.shape,
      radius: dims.radius,
      height: dims.height,
      finish: config.finish,
      seed: tierSeed,
      segments,
      sector,
    });
    if (config.finish === "ombre") {
      applyVerticalGradient(g, ombreBase(config.frostingColor), ombreTop(config.frostingColor));
    }
    return g;
  }, [covered, config.shape, config.finish, config.frostingColor, dims.radius, dims.height, tierSeed, segments, sector]));

  // Measured across the top band only, which is where frosting actually pools
  // before it runs.
  const rimOutline = useMemo(
    () => (shell && !sliced
      ? shellOutline(config.shape, dims.radius, dims.height, 200, "rim")
      : undefined),
    [shell, sliced, config.shape, dims.radius, dims.height],
  );

  const drip = isTop && config.hasDrip && config.coverage !== "naked" ? (
    <Drip
      config={config}
      dims={dims}
      seed={seed}
      castShadow={castShadow}
      silhouette={rimOutline}
      sector={sector}
    />
  ) : null;

  // The interior shows whenever there is a cut, or whenever the coverage
  // already exposes it.
  const interior = (sliced || !covered) ? (
    <SpongeLayers
      config={config}
      dims={dims}
      seed={tierSeed}
      segments={segments}
      castShadow={castShadow}
      sector={sector}
    />
  ) : null;

  if (covered && shell) {
    return (
      <>
        {interior}
        <FrostingShell
          config={config}
          dims={dims}
          seed={tierSeed}
          geometry={shell}
          castShadow={castShadow}
          /* Ruffles and rosettes follow a measured silhouette, which a cut
             makes meaningless — they are suppressed on the cut face instead. */
          sector={sector}
        />
        {drip}
      </>
    );
  }

  return (
    <group>
      {interior}
      <TopFrosting
        config={config}
        dims={dims}
        index={index}
        seed={tierSeed}
        segments={segments}
        castShadow={castShadow}
        isTop={isTop}
        sector={sector}
        /* On a stacked naked cake only the bottom tier gets a crown of frosting. */
        hidden={config.coverage === "naked" && index !== 0}
      />
      {drip}
    </group>
  );
}

function TopFrosting({
  config, dims, seed, segments, castShadow, hidden, sector,
}: Props & { hidden: boolean; sector?: Sector }) {
  const geometry = useDisposed(useMemo(
    () => topDiscGeometry({
      shape: config.shape,
      radius: dims.radius,
      height: dims.height,
      finish: config.finish,
      seed,
      segments,
      sector,
    }),
    [config.shape, config.finish, dims.radius, dims.height, seed, segments, sector],
  ));

  const mat = useMemo(
    () => frostingMaterial(config.frosting, config.frostingColor, config.finish, 3),
    [config.frosting, config.frostingColor, config.finish],
  );

  if (hidden) return null;

  return (
    <mesh
      geometry={geometry}
      position={[0, dims.y + dims.height - 0.02, 0]}
      castShadow={castShadow}
      receiveShadow
    >
      <meshPhysicalMaterial
        {...mat}
        side={sector ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}
