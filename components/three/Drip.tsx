"use client";

import * as THREE from "three";
import { useMemo } from "react";
import type { CakeConfig } from "@/lib/schema";
import { achievable } from "@/lib/color";
import {
  dripGeometry, dripSpecs, outlinePoints, phiOf, rimGeometry, rimRadius, shellRimY,
  type OutlinePoint, type Sector, type TierDims,
} from "./geometry";
import { frostingNormal } from "./noise";
import { useDisposed } from "./useDisposable";

interface Props {
  config: CakeConfig;
  dims: TierDims;
  seed: number;
  castShadow: boolean;
  /**
   * The frosting shell's real outline. Without it the rim is re-derived from
   * the 2D shape, which does not match a bevelled extrude — on a heart the ring
   * ends up floating clear of the cake at the back and cutting through it at
   * the front.
   */
  silhouette?: OutlinePoint[];
  /** Nothing drips over the cut face. */
  sector?: Sector;
}

const DEFAULT_DRIP = "#3B2318";

/**
 * A pooled ring at the rim plus individual tapered drips at seeded angles. The
 * angles come from the config hash, so the drips do not reshuffle when React
 * re-renders — that single detail is the difference between "built" and "buggy".
 */
export function Drip({ config, dims, seed, castShadow, silhouette, sector }: Props) {
  const color = achievable(config.dripColor ?? DEFAULT_DRIP);
  const specs = useMemo(() => dripSpecs(seed, dims.radius), [seed, dims.radius]);

  const geo = useDisposed(useMemo(
    () => dripGeometry(),
    [],
  ));
  // Drips hang from the real silhouette, so a square cake drips off its corners.
  const anchors = useMemo(
    () => silhouette && silhouette.length
      ? silhouette
      : outlinePoints(config.shape, rimRadius(config.shape, dims.radius) + 0.018, 240),
    [silhouette, config.shape, dims.radius],
  );

  const ringGeo = useDisposed(useMemo(
    () => rimGeometry(config.shape, dims.radius, 0.045, anchors),
    [config.shape, dims.radius, anchors],
  ));

  const normalMap = useMemo(() => {
    const t = frostingNormal().clone();
    t.repeat.set(4, 1);
    t.needsUpdate = true;
    return t;
  }, []);

  const material = (
    <meshPhysicalMaterial
      color={color}
      roughness={0.26}
      metalness={0}
      clearcoat={0.42}
      clearcoatRoughness={0.24}
      sheen={0.12}
      sheenColor="#5A3A22"
      normalMap={normalMap}
      normalScale={new THREE.Vector2(0.2, 0.2)}
      envMapIntensity={0.9}
    />
  );

  // The top of the frosting's side wall, not the top of the sponge. The shell
  // is a thickness taller and wider than the tier it covers, so measuring from
  // dims.height put the whole rim inside the cake.
  const rimY = dims.y + shellRimY(dims.radius, dims.height);

  return (
    <group>
      {/* The pool that gathers at the top edge before it runs. A cut cake has
          no continuous rim to pool along, so it is left off. */}
      {!sector && (
        <mesh geometry={ringGeo} position={[0, rimY, 0]} castShadow={castShadow}>
          {material}
        </mesh>
      )}

      {specs.map((s, i) => {
        const a = anchors[Math.floor((s.angle / (Math.PI * 2)) * anchors.length + anchors.length) % anchors.length];
        if (sector) {
          let d = phiOf(a.x, a.z) - sector.centre;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) < sector.width / 2) return null;
        }
        return (
          <mesh
            key={i}
            geometry={geo}
            /* Proud of the wall by a third of its own width, so a drip on a
               flat face reads as chocolate hanging off the edge rather than as
               a thin dark line painted on it. A fixed offset only ever worked
               on a round cake, where the wall curves away from the drip; on a
               square it left nine tenths of every drip inside the frosting. */
            position={[
              a.x + a.nx * s.width * 0.34,
              rimY,
              a.z + a.nz * s.width * 0.34,
            ]}
            scale={[s.width, s.length, s.width]}
            castShadow={castShadow}
          >
            {material}
          </mesh>
        );
      })}
    </group>
  );
}
