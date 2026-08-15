"use client";

import * as THREE from "three";
import { useMemo } from "react";
import type { CakeConfig, Shape } from "@/lib/schema";
import { frostingMaterial, tileRepeat } from "./materials";
import {
  phiOf, ruffleGeometry, rosetteGeometry, shellOutline, outlinePerimeter,
  type Sector, type TierDims,
} from "./geometry";
import { useDisposed } from "./useDisposable";
import { mulberry32 } from "@/lib/seed";

interface Props {
  config: CakeConfig;
  dims: TierDims;
  seed: number;
  castShadow: boolean;
  /** Built by the tier, which also needs it to place the drip. */
  geometry: THREE.BufferGeometry;
  /** Decoration stops at the cut rather than hanging over open sponge. */
  sector?: Sector;
}

export function FrostingShell({ config, dims, seed, castShadow, geometry, sector }: Props) {
  const mat = useMemo(
    () => frostingMaterial(
      config.frosting, config.frostingColor, config.finish,
      tileRepeat(config.shape, dims.radius, dims.height),
    ),
    [config.frosting, config.frostingColor, config.finish, config.shape, dims.radius, dims.height],
  );

  return (
    <group position={[0, dims.y, 0]}>
      <mesh geometry={geometry} castShadow={castShadow} receiveShadow>
        <meshPhysicalMaterial
          {...mat}
          color={config.finish === "ombre" ? "#ffffff" : mat.color}
          vertexColors={config.finish === "ombre"}
          /* Open at the cut, so the far inner surface has to render too. */
          side={sector ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {config.finish === "ruffle" && (
        <Ruffles shape={config.shape} dims={dims} seed={seed} mat={mat} castShadow={castShadow} sector={sector} />
      )}
      {config.finish === "rosette" && (
        <Rosettes shape={config.shape} dims={dims} seed={seed} mat={mat} castShadow={castShadow} sector={sector} />
      )}
    </group>
  );
}

type Mat = ReturnType<typeof frostingMaterial>;

interface DecorProps {
  /** Decoration is laid out on the shell's exact outline, derived per shape. */
  shape: Shape;
  dims: TierDims;
  seed: number;
  mat: Mat;
  castShadow: boolean;
  sector?: Sector;
}

/** Skip anything that would sit over the missing wedge. */
function inCut(x: number, z: number, sector?: Sector): boolean {
  if (!sector) return false;
  let d = phiOf(x, z) - sector.centre;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) < sector.width / 2;
}

/** Overlapping frills, piped by hand. Instanced — this is slow work in a kitchen
 * and it should not also be slow on the GPU. */
function Ruffles({ shape, dims, seed, mat, castShadow, sector }: DecorProps) {
  const geo = useDisposed(useMemo(
    () => ruffleGeometry(),
    [],
  ));

  const instances = useMemo(() => {
    const rng = mulberry32(seed ^ 0x1f83d9ab);
    const size = Math.min(0.34, dims.radius * 0.38);
    const rows = Math.max(3, Math.round(dims.height / (size * 0.52)));

    // Measure the real perimeter and space the frills along it. `2πr` is the
    // perimeter of a circle; a square of the same radius is 8r, a third longer
    // again, so a square used to get a circle's worth of frills stretched
    // around a longer edge and came out visibly sparse on the flats.
    const probe = shellOutline(shape, dims.radius, dims.height, 256, "widest");
    const perRow = Math.max(12, Math.round(outlinePerimeter(probe) / (size * 0.72)));
    const ring = shellOutline(shape, dims.radius, dims.height, perRow, "widest");
    const out: { pos: THREE.Vector3; rot: THREE.Euler; scale: number }[] = [];

    for (let r = 0; r < rows; r++) {
      const y = ((r + 0.5) / rows) * dims.height;
      const stagger = r % 2 ? 0.5 : 0;
      for (let i = 0; i < perRow; i++) {
        const p = ring[(i + (stagger ? 1 : 0)) % perRow];
        if (inCut(p.x, p.z, sector)) continue;
        // Sit just proud of the surface so the frill reads as applied, not sunk.
        const push = 0.02;
        out.push({
          pos: new THREE.Vector3(p.x + p.nx * push, y, p.z + p.nz * push),
          rot: new THREE.Euler(-0.4 + (rng() - 0.5) * 0.14, p.yaw + Math.PI / 2, 0),
          scale: size * (0.9 + rng() * 0.2),
        });
      }
    }
    return out;
  }, [shape, dims.radius, dims.height, seed, sector]);

  return (
    <instancedMesh
      args={[geo, undefined, instances.length]}
      castShadow={castShadow}
      ref={(m) => {
        if (!m) return;
        const o = new THREE.Object3D();
        instances.forEach((inst, i) => {
          o.position.copy(inst.pos);
          o.rotation.copy(inst.rot);
          o.scale.setScalar(inst.scale);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
      }}
    >
      <meshPhysicalMaterial {...mat} />
    </instancedMesh>
  );
}

/** Piped spirals covering the whole surface. */
function Rosettes({ shape, dims, seed, mat, castShadow, sector }: DecorProps) {
  const geo = useDisposed(useMemo(
    () => rosetteGeometry(),
    [],
  ));

  const instances = useMemo(() => {
    const rng = mulberry32(seed ^ 0x2c1b3a55);
    const out: { pos: THREE.Vector3; rot: THREE.Euler; scale: number }[] = [];
    const size = Math.min(0.32, dims.radius * 0.4);

    const rows = Math.max(2, Math.round(dims.height / (size * 1.05)));
    const probe = shellOutline(shape, dims.radius, dims.height, 256, "widest");
    const perRow = Math.max(8, Math.round(outlinePerimeter(probe) / (size * 1.15)));
    const ring = shellOutline(shape, dims.radius, dims.height, perRow, "widest");

    for (let r = 0; r < rows; r++) {
      const y = ((r + 0.5) / rows) * dims.height;
      for (let i = 0; i < perRow; i++) {
        const p = ring[i];
        if (inCut(p.x, p.z, sector)) continue;
        // A rosette is a spiral swept with a 0.155-radius tube that also rises
        // 0.2 along its own axis, so roughly a third of its own scale sticks out
        // behind its origin. 0.18 buried half of every one of them in the cake —
        // it only ever looked passable because the old radial placement pushed
        // them outward along the diagonal as well.
        const push = size * 0.34;
        out.push({
          pos: new THREE.Vector3(p.x + p.nx * push, y, p.z + p.nz * push),
          // rosetteGeometry now faces local +Z, so aiming it is a single yaw
          // about Y and the third Euler term becomes a roll about the facing
          // axis — which is what varying a piped swirl actually means.
          //
          // The old Euler(π/2, 0, yaw) composed to R = Rx(π/2)·Rz(yaw), which
          // sends local +Y to (-sin yaw, 0, cos yaw) — ninety degrees off the
          // outward normal. Every rosette in the product has been edge-on since
          // it was written; on a round cake they overlapped into something that
          // read as texture, so nobody caught it.
          rot: new THREE.Euler(0, Math.atan2(p.nx, p.nz), rng() * Math.PI * 2),
          scale: size * (0.92 + rng() * 0.16),
        });
      }
    }

    // Top face, worked inward by shrinking the measured silhouette.
    const steps = Math.max(1, Math.round(dims.radius / size));
    for (let k = 1; k <= steps; k++) {
      const shrink = 1 - k / (steps + 0.4);
      const inner = ring.map(p => ({
        ...p,
        x: p.x * shrink,
        z: p.z * shrink,
      }));
      // Perimeter of this ring, not 2π times a radius sampled from one
      // arbitrary point of it — on a square that point could be a corner or a
      // flat, so the ring count swung by 40% depending on where the outline
      // happened to start.
      const ringLength = outlinePerimeter(inner);
      if (ringLength <= size * 2.6) {
        out.push({
          pos: new THREE.Vector3(0, dims.height + size * 0.16, 0),
          rot: new THREE.Euler(-Math.PI / 2, 0, rng() * Math.PI * 2),
          scale: size * (0.92 + rng() * 0.16),
        });
        break;
      }
      const n = Math.max(4, Math.round(ringLength / (size * 1.15)));
      for (let i = 0; i < n; i++) {
        const p = inner[Math.floor((i / n) * inner.length)];
        if (inCut(p.x, p.z, sector)) continue;
        out.push({
          pos: new THREE.Vector3(p.x, dims.height + size * 0.16, p.z),
          rot: new THREE.Euler(-Math.PI / 2, 0, rng() * Math.PI * 2),
          scale: size * (0.92 + rng() * 0.16),
        });
      }
    }
    return out;
  }, [shape, dims.radius, dims.height, seed, sector]);

  return (
    <instancedMesh
      args={[geo, undefined, instances.length]}
      castShadow={castShadow}
      ref={(m) => {
        if (!m) return;
        const o = new THREE.Object3D();
        instances.forEach((inst, i) => {
          o.position.copy(inst.pos);
          o.rotation.copy(inst.rot);
          o.scale.setScalar(inst.scale);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
      }}
    >
      <meshPhysicalMaterial {...mat} />
    </instancedMesh>
  );
}
