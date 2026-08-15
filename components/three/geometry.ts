import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Finish, Shape, SizeBand } from "@/lib/schema";
import { DIAMETER_IN } from "@/lib/servings";
import { fbm3 } from "./noise";
import { mulberry32 } from "@/lib/seed";

/**
 * Everything is a primitive. Procedural means every combination works and there
 * is no modeller in the loop. Real cakes have no sharp corners, so every profile
 * here is bevelled — sharp edges are the second-biggest CG tell after gloss.
 */

/** 1 world unit ≈ 3.6 inches. An 8in cake comes out 2.24 units across. */
const IN = 0.28;

export function baseRadius(size: SizeBand): number {
  return (DIAMETER_IN[size] / 2) * IN;
}

/** A single tier is about 4in tall; bigger cakes get a touch more height. */
export function baseHeight(size: SizeBand): number {
  return (3.6 + DIAMETER_IN[size] * 0.06) * IN;
}

/** Bundt tins are deeper than a sandwich tin, and it shows. */
export function heightFor(shape: Shape, size: SizeBand): number {
  return baseHeight(size) * (shape === "bundt" ? 1.16 : 1);
}

const TIER_RADIUS_RATIO: Record<number, number[]> = {
  1: [1],
  2: [1, 0.68],
  3: [1, 0.76, 0.54],
};

const TIER_HEIGHT_RATIO: Record<number, number[]> = {
  1: [1],
  2: [1, 0.86],
  3: [1, 0.9, 0.8],
};

export interface TierDims {
  radius: number;
  height: number;
  /** World Y of the tier's base. */
  y: number;
}

export function tierDims(size: SizeBand, tiers: number, shape: Shape = "round"): TierDims[] {
  const r0 = baseRadius(size);
  const h0 = heightFor(shape, size) * (tiers === 1 ? 1 : 0.82);
  const rr = TIER_RADIUS_RATIO[tiers] ?? TIER_RADIUS_RATIO[1];
  const hr = TIER_HEIGHT_RATIO[tiers] ?? TIER_HEIGHT_RATIO[1];

  const out: TierDims[] = [];
  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const height = h0 * hr[i];
    out.push({ radius: r0 * rr[i], height, y });
    y += height;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 2D profiles
 * ------------------------------------------------------------------ */

function roundedPolygon(pts: [number, number][], r: number): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;

  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] =>
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];

    const dPrev = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const dNext = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const tPrev = Math.min(0.5, r / dPrev);
    const tNext = Math.min(0.5, r / dNext);

    const a = lerp(cur, prev, tPrev);
    const b = lerp(cur, next, tNext);

    if (i === 0) s.moveTo(a[0], a[1]);
    else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(cur[0], cur[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

function heartShape(r: number): THREE.Shape {
  // Two bézier lobes meeting at a point, mirrored so the lobes face the camera
  // and the point runs away from it — the way a heart cake is photographed.
  // The point itself gets a small radius; a knife-edge corner is not a cake.
  const s = new THREE.Shape();
  const k = r * 1.02;
  const tip = k * 0.95;
  const nib = k * 0.07;

  s.moveTo(-nib * 0.6, tip - nib * 0.5);
  s.quadraticCurveTo(0, tip, nib * 0.6, tip - nib * 0.5);
  s.bezierCurveTo(k * 0.62, k * 0.35, k * 1.06, -k * 0.36, k * 0.52, -k * 0.72);
  s.bezierCurveTo(k * 0.22, -k * 0.94, 0, -k * 0.66, 0, -k * 0.5);
  s.bezierCurveTo(0, -k * 0.66, -k * 0.22, -k * 0.94, -k * 0.52, -k * 0.72);
  s.bezierCurveTo(-k * 1.06, -k * 0.36, -k * 0.62, k * 0.35, -nib * 0.6, tip - nib * 0.5);
  return s;
}

function polygonFor(shape: Shape, r: number): THREE.Shape {
  switch (shape) {
    case "square":
      return roundedPolygon(
        [[-r, -r], [r, -r], [r, r], [-r, r]],
        r * 0.16,
      );
    case "rectangle": {
      const w = r * 1.28, d = r * 0.82;
      return roundedPolygon([[-w, -d], [w, -d], [w, d], [-w, d]], d * 0.2);
    }
    case "hexagon": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return roundedPolygon(pts, r * 0.12);
    }
    case "heart":
      return heartShape(r);
    default:
      return roundedPolygon([[-r, -r], [r, -r], [r, r], [-r, r]], r);
  }
}

/**
 * LatheGeometry spaces V by point index, not by arc length. A profile with
 * bevel arcs — which is every profile here — therefore gives the long side wall
 * a sliver of the texture and stretches it into vertical streaks. Remap V to
 * real arc length so a normal map tiles evenly.
 */
function latheWithUV(
  points: THREE.Vector2[],
  segments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(points, segments, phiStart, phiLength);

  const lens: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    lens.push(lens[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  const total = lens[lens.length - 1] || 1;

  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = points.length;
  for (let i = 0; i < uv.count; i++) uv.setY(i, lens[i % n] / total);
  uv.needsUpdate = true;

  // NOT computeVertexNormals(). LatheGeometry ships analytic normals that are
  // already averaged across the φ=0 wrap and across the fan apex at the centre
  // of a flat top. Recomputing them from face winding breaks both: every round
  // cake got a hard vertical crease down one side and a star-shaped shading
  // artifact on its lid.
  weldNormals(g);
  return g;
}

/**
 * Average the normals of vertices that occupy the same point in space.
 *
 * Any geometry whose vertices have been moved has to have its normals
 * recomputed, and computeVertexNormals() treats duplicated seam vertices as
 * unrelated — so a closed lathe comes back with a visible seam. Welding after
 * the fact keeps the split UVs (which have to stay split) while making the
 * shading continuous (which it has to be).
 */
function weldNormals(g: THREE.BufferGeometry) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
  if (!nor) return;

  const buckets = new Map<string, number[]>();
  const q = (v: number) => Math.round(v * 1e4);

  for (let i = 0; i < pos.count; i++) {
    const key = `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
    const list = buckets.get(key);
    if (list) list.push(i);
    else buckets.set(key, [i]);
  }

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    let x = 0, y = 0, z = 0;
    for (const i of list) { x += nor.getX(i); y += nor.getY(i); z += nor.getZ(i); }
    const len = Math.hypot(x, y, z) || 1;
    x /= len; y /= len; z /= len;
    for (const i of list) nor.setXYZ(i, x, y, z);
  }
  nor.needsUpdate = true;
}

/**
 * Round tiers get a lathe so the base can flare very slightly, as cakes settle.
 *
 * `wallSteps` subdivides the straight side wall. The profile used to jump
 * bevel-top straight to bevel-bottom in one segment, giving the whole side of
 * the cake two vertices to work with. The combed finish displaces by
 * sin(y · 62), which is about eleven ridges over the height of a tier — sampled
 * twice. So a customer could pay ₹94 for "horizontal ridges from a serrated
 * scraper" and get a perfectly smooth cake, on every round shape, which is most
 * of them.
 */
function lathePoints(
  r: number, h: number, bevel: number, flare = 1.012, wallSteps = 26,
): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const rb = r * flare;
  const arc = (
    cx: number, cy: number, rad: number,
    from: number, to: number, steps = 6,
  ) => {
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * (i / steps);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
  };

  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(rb - bevel, 0));
  arc(rb - bevel, bevel, bevel, -Math.PI / 2, 0);

  // The side wall, sampled densely enough for a finish to live on it. The wall
  // tapers from the flared base radius to r over its height, which is what a
  // stacked cake actually does under its own weight.
  const y0 = bevel;
  const y1 = h - bevel;
  const x0 = rb;
  for (let i = 1; i <= wallSteps; i++) {
    const t = i / wallSteps;
    pts.push(new THREE.Vector2(x0 + (r - x0) * t, y0 + (y1 - y0) * t));
  }

  arc(r - bevel, h - bevel, bevel, 0, Math.PI / 2);

  // Same argument for the lid: one segment from the rim to the centre meant the
  // top of a rustic cake was mirror-flat while its sides were swirled.
  const topSteps = Math.max(1, Math.round(wallSteps * 0.5));
  const xTop = r - bevel;
  for (let i = 1; i <= topSteps; i++) {
    pts.push(new THREE.Vector2(xTop * (1 - i / topSteps), h));
  }

  return pts;
}

/* ------------------------------------------------------------------ *
 * Tier bodies
 * ------------------------------------------------------------------ */

/**
 * A wedge taken out of the cake, so the sponge layers and the filling between
 * them read as a cross-section. `phi` is measured the way LatheGeometry
 * measures it — from +Z towards +X — so the same angle means the same place on
 * a lathe and on an extruded shape.
 */
export interface Sector {
  /** Centre of the *removed* wedge, in radians. */
  centre: number;
  /** Angular width of the removed wedge, in radians. */
  width: number;
}

/** Facing the default camera, opened slightly to its right. */
export const DEFAULT_SLICE: Sector = { centre: 0.34, width: Math.PI * 0.3 };

/** Where a point sits on the cut circle. Shared by every shape. */
export function phiOf(x: number, z: number): number {
  return Math.atan2(x, z);
}

function angleKept(phi: number, sector: Sector): boolean {
  let d = phi - sector.centre;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) > sector.width / 2;
}

export interface BodyOpts {
  shape: Shape;
  radius: number;
  height: number;
  /** Radial segments for round shapes. Dropped on low-power devices. */
  segments?: number;
  bevel?: number;
  /** Omit for a whole cake; supply to cut a wedge out of it. */
  sector?: Sector;
  /**
   * Close the cut with a flat face. True for anything solid — the sponge, the
   * filling. False for the frosting: a capped frosting shell puts a slab of
   * buttercream across the whole cross-section and hides the very layers the
   * cut exists to show. Left open, it reads as the thin skin it actually is.
   */
  capCut?: boolean;
}

export function tierGeometry({
  shape, radius, height, segments = 72, bevel, sector, capCut = true,
}: BodyOpts): THREE.BufferGeometry {
  const b = bevel ?? Math.min(radius * 0.09, height * 0.18, 0.07);

  if (shape === "round") {
    const profile = lathePoints(radius, height, b);
    return sector
      ? cutLathe(profile, segments, sector, capCut)
      : latheWithUV(profile, segments);
  }

  if (shape === "bundt") return bundtGeometry(radius, height, segments, sector, capCut);

  const full = polygonFor(shape, radius - b);
  const inset = sector ? cutShape(full, sector, capCut) : full;
  const g = new THREE.ExtrudeGeometry(inset, {
    depth: Math.max(0.01, height - b * 2),
    bevelEnabled: true,
    bevelSize: b,
    bevelThickness: b,
    bevelSegments: 4,
    curveSegments: 28,
    // The side wall needs vertical tessellation or the frosting displacement has
    // nothing to push and the surface comes out looking hammered.
    steps: 14,
  });
  // Extrusion runs from -bevelThickness to depth + bevelThickness, so the base
  // lands one bevel below zero. Lift it back onto the board.
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * A lathe swept over everything except the wedge, plus a flat cap at each cut.
 * `LatheGeometry` leaves a sector open, and an open cake is a cake you can see
 * straight through — the caps are what make the cut read as a cut.
 */
function cutLathe(
  profile: THREE.Vector2[],
  segments: number,
  sector: Sector,
  capped = true,
): THREE.BufferGeometry {
  const half = sector.width / 2;
  const phiStart = sector.centre + half;
  const phiLength = Math.PI * 2 - sector.width;

  const kept = Math.max(8, Math.round(segments * (phiLength / (Math.PI * 2))));
  const wall = latheWithUV(profile, kept, phiStart, phiLength);
  if (!capped) return wall;

  // The two cut faces look in opposite directions — away from the missing
  // wedge on each side. One of them therefore needs its winding reversed, or it
  // is back-face culled and you see straight through the cake.
  const caps = [
    capGeometry(profile, phiStart, true),
    capGeometry(profile, phiStart + phiLength, false),
  ];
  const merged = mergeGeometries([wall, ...caps], false);

  if (!merged) return wall;
  wall.dispose();
  caps.forEach(c => c.dispose());
  // No computeVertexNormals here: the wall's normals are the lathe's analytic
  // ones and the caps carry their own flat normals. Recomputing would weld the
  // cut face to the wall and round off the very edge that makes a cut read as
  // a cut — and would put the lathe seam back.
  return merged;
}

/**
 * The profile itself, triangulated flat and stood up in the plane at `phi`.
 * Rendered double-sided, because a cut face is looked at from whichever side
 * the customer happens to have rotated towards.
 */
function capGeometry(
  profile: THREE.Vector2[],
  phi: number,
  flip: boolean,
): THREE.BufferGeometry {
  const shape = new THREE.Shape(profile.map(p => new THREE.Vector2(Math.max(0, p.x), p.y)));
  const g = new THREE.ShapeGeometry(shape);

  // ShapeGeometry lies in XY. Lathe places a profile point at
  // (x·sin φ, y, x·cos φ), so rotating about Y by (π/2 − φ) lands it correctly.
  g.rotateY(Math.PI / 2 - phi);

  if (flip) {
    // Reverse the triangle winding, and flip the normals to match. The normals
    // used to be left to a computeVertexNormals() after the merge, but that
    // pass also destroyed the wall's seam-continuous normals, so the cap now
    // owns its own.
    const idx = g.getIndex();
    if (idx) {
      const a = Array.from(idx.array);
      for (let i = 0; i < a.length; i += 3) {
        const t = a[i];
        a[i] = a[i + 2];
        a[i + 2] = t;
      }
      g.setIndex(a);
    }
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < nor.count; i++) {
      nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
    }
    nor.needsUpdate = true;
  }

  // Give the cap its own UVs; the shape's are in world units.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const spanY = Math.max(1e-6, box.max.y - box.min.y);
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    uv[i * 2] = r;
    uv[i * 2 + 1] = (pos.getY(i) - box.min.y) / spanY;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/**
 * Clip a 2D outline to the kept sector and close it through the centre, so an
 * extruded shape loses the same wedge a lathe does. Extrude caps the result on
 * its own, which is why this does not need explicit cut faces.
 */
function cutShape(shape: THREE.Shape, sector: Sector, capped = true): THREE.Shape {
  const pts = shape.getSpacedPoints(288);

  // The extrude is rotated -90° about X, which sends shape Y to world -Z.
  const phi = (p: THREE.Vector2) => phiOf(p.x, -p.y);

  const kept: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (angleKept(phi(pts[i]), sector)) kept.push(pts[i]);
  }
  if (kept.length < 3) return shape;

  // Rotate the list so the run of kept points is contiguous rather than wrapped.
  let breakAt = 0;
  for (let i = 0; i < kept.length; i++) {
    const prev = kept[(i - 1 + kept.length) % kept.length];
    if (kept[i].distanceTo(prev) > shape.getLength() / 12) { breakAt = i; break; }
  }
  const ordered = [...kept.slice(breakAt), ...kept.slice(0, breakAt)];

  const out = new THREE.Shape();
  if (capped) {
    // Closed through the centre, so the extrude fills the cut face.
    out.moveTo(0, 0);
    for (const p of ordered) out.lineTo(p.x, p.y);
  } else {
    // Closed just inside the outline instead, leaving a thin band rather than
    // a solid wedge of frosting across the cross-section.
    const inner = ordered.map(p => new THREE.Vector2(p.x, p.y).multiplyScalar(0.965));
    out.moveTo(ordered[0].x, ordered[0].y);
    for (const p of ordered.slice(1)) out.lineTo(p.x, p.y);
    for (const p of inner.reverse()) out.lineTo(p.x, p.y);
  }
  out.closePath();
  return out;
}

function bundtGeometry(
  r: number,
  h: number,
  segments: number,
  sector?: Sector,
  capCut = true,
): THREE.BufferGeometry {
  const ri = r * 0.36;
  const b = Math.min(r * 0.1, h * 0.2);
  // Wound so the surface normals face out of the ring, not into it. Reverse this
  // order and the cake renders inside-out.
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(ri, 0),
    new THREE.Vector2(r - b, 0),
    new THREE.Vector2(r, b),
    new THREE.Vector2(r, h * 0.5),
    new THREE.Vector2(r * 0.97, h * 0.74),
    new THREE.Vector2(r * 0.86, h * 0.92),
    new THREE.Vector2(r * 0.68, h),
    new THREE.Vector2(r * 0.5, h * 0.98),
    new THREE.Vector2(ri * 1.3, h * 0.9),
    new THREE.Vector2(ri, h * 0.72),
    new THREE.Vector2(ri, 0),
  ];

  const g = sector ? cutLathe(pts, segments, sector, capCut) : latheWithUV(pts, segments);
  // Radial fluting — the thing that makes a bundt a bundt.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const flutes = 12;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad < 1e-5) continue;
    const t = THREE.MathUtils.clamp((rad - ri) / (r - ri), 0, 1);
    const theta = Math.atan2(z, x);
    const k = 1 + 0.11 * t * Math.cos(flutes * theta);
    pos.setX(i, (x / rad) * rad * k);
    pos.setZ(i, (z / rad) * rad * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  weldNormals(g);
  return g;
}

/* ------------------------------------------------------------------ *
 * Frosting shell
 * ------------------------------------------------------------------ */

const FINISH_AMPLITUDE: Record<Finish, number> = {
  smooth: 0.006,
  rustic: 0.042,
  combed: 0.022,
  ombre: 0.008,
  ruffle: 0.008,   // the ruffles themselves are instanced on top
  rosette: 0.008,  // ditto
};

// Low frequencies sample slowly around the circumference and come out as
// vertical brush streaks. These are tuned to stay isotropic on a cylinder.
const FINISH_FREQUENCY: Record<Finish, number> = {
  smooth: 13,
  rustic: 8.5,
  combed: 11,
  ombre: 13,
  ruffle: 10,
  rosette: 10,
};

/**
 * The shell is the tier profile grown by the frosting thickness, then pushed
 * along its own normals by seeded noise. Seeded, because a cake that reshuffles
 * on every React render looks broken.
 */
export function shellGeometry(
  opts: BodyOpts & { finish: Finish; seed: number; thickness?: number },
): THREE.BufferGeometry {
  const t = opts.thickness ?? Math.max(0.022, opts.radius * 0.035);
  const g = tierGeometry({
    ...opts,
    // Frosting is a skin, not a solid. Leaving the cut open lets the sponge
    // cross-section behind it show through.
    capCut: false,
    radius: opts.radius + t,
    height: opts.height + t,
    bevel: Math.min((opts.radius + t) * 0.13, (opts.height + t) * 0.2, 0.1),
  });

  const amp = FINISH_AMPLITUDE[opts.finish] * (opts.radius / 1.1);
  const freq = FINISH_FREQUENCY[opts.finish];
  const rng = mulberry32(opts.seed);
  const ox = rng() * 100, oy = rng() * 100, oz = rng() * 100;

  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);

    let d = (fbm3(x * freq + ox, y * freq + oy, z * freq + oz, 3) - 0.5) * 2 * amp;

    // These two were tuned against a lathe that had two vertices down the whole
    // side wall, so their amplitudes had to be enormous to survive the
    // aliasing. Now that the wall is properly subdivided the same numbers came
    // out as coil pottery and a stack of plates. Retuned to what the tools
    // actually leave: a serrated scraper cuts 2-3mm ridges, a bench scraper
    // leaves a track you have to catch in the light.
    if (opts.finish === "combed") {
      const sideness = 1 - Math.abs(nor.getY(i));
      d += Math.sin(y * 78) * amp * 1.15 * sideness;
    }
    if (opts.finish === "smooth" || opts.finish === "ombre") {
      const sideness = 1 - Math.abs(nor.getY(i));
      d += Math.sin(y * 16 + ox) * amp * 0.4 * sideness;
    }
    if (opts.finish === "rustic") {
      // Palette-knife swirl: a second, lower-frequency band.
      const theta = Math.atan2(z, x);
      d += Math.sin(theta * 9 + y * 14) * amp * 0.55;
    }

    pos.setX(i, x + nor.getX(i) * d);
    pos.setY(i, y + nor.getY(i) * d);
    pos.setZ(i, z + nor.getZ(i) * d);
  }

  pos.needsUpdate = true;
  g.computeVertexNormals();
  weldNormals(g);
  return g;
}

/** A frosting disc for top-only and naked builds. */
export function topDiscGeometry(opts: BodyOpts & { finish: Finish; seed: number }) {
  return shellGeometry({
    ...opts,
    radius: opts.radius * 0.94,
    height: Math.max(0.04, opts.radius * 0.07),
    thickness: 0.01,
  });
}

/* ------------------------------------------------------------------ *
 * Sponge and filling slabs
 * ------------------------------------------------------------------ */

export interface Slab {
  kind: "sponge" | "filling";
  y: number;
  height: number;
  radius: number;
}

/**
 * Layer heights get ±2% of seeded jitter so the stack is not mechanically
 * identical, which is what gives away a generated cake.
 */
/**
 * Every layer gets a band under it — jam, mousse, or just the scrape of
 * frosting that holds a plain sponge together. Without one the cut face of a
 * three-layer cake is a single flat panel of colour and reads as a solid block.
 */
export function slabStack(
  layers: number,
  height: number,
  radius: number,
  hasFilling: boolean,
  seed: number,
): Slab[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const bandCount = Math.max(0, layers - 1);
  const bandH = bandCount
    ? Math.min(hasFilling ? 0.035 : 0.02, height * (hasFilling ? 0.045 : 0.028))
    : 0;
  const spongeH = (height - bandH * bandCount) / layers;

  const out: Slab[] = [];
  let y = 0;
  for (let i = 0; i < layers; i++) {
    const h = spongeH * (0.98 + rng() * 0.04);
    out.push({ kind: "sponge", y, height: h, radius });
    y += h;
    if (i < layers - 1) {
      out.push({ kind: "filling", y, height: bandH, radius: radius * 1.004 });
      y += bandH;
    }
  }

  // Normalise so the stack lands exactly on the tier height.
  const scale = height / y;

  // Overlap every boundary by a hair. Stacked slabs share exact planes
  // otherwise, and a cut cake puts that z-fighting on full display.
  const bleed = 0.005;
  return out.map(s => ({
    ...s,
    y: s.y * scale - bleed / 2,
    height: s.height * scale + bleed,
  }));
}

/* ------------------------------------------------------------------ *
 * Drip
 * ------------------------------------------------------------------ */

export interface DripSpec {
  angle: number;
  length: number;
  width: number;
}

export function dripSpecs(seed: number, radius: number, count?: number): DripSpec[] {
  const rng = mulberry32(seed ^ 0x5bf03635);
  // Twelve drips 2mm across, spaced two inches apart, read as candle wax
  // running down a wall. A poured ganache drip is 5-10mm wide and they land
  // close enough together that the rim between them still reads as one pour.
  const n = count ?? Math.round(THREE.MathUtils.clamp(radius * 22, 14, 34));
  const out: DripSpec[] = [];
  for (let i = 0; i < n; i++) {
    const jitter = (rng() - 0.5) * (Math.PI / n) * 1.1;
    out.push({
      angle: (i / n) * Math.PI * 2 + jitter,
      // Long ones next to short ones is most of what makes a pour look poured.
      length: 0.14 + rng() * 0.34,
      width: 0.10 + rng() * 0.06,
    });
  }
  return out;
}

/** The radius the frosting actually pools at, which is not the tier radius on a
 * domed bundt. */
export function rimRadius(shape: Shape, radius: number): number {
  return shape === "bundt" ? radius * 0.88 : radius;
}

/** The pooled ring of frosting at the top edge, following the real silhouette. */
export function rimGeometry(
  shape: Shape,
  radius: number,
  tube = 0.028,
  outline?: OutlinePoint[],
): THREE.BufferGeometry {
  const ring = outline?.length
    ? outline.map(p => ({ ...p, x: p.x + p.nx * tube * 0.5, z: p.z + p.nz * tube * 0.5 }))
    : outlinePoints(shape, rimRadius(shape, radius) + tube * 0.9, 96);

  const pts = ring.map(p => new THREE.Vector3(p.x, 0, p.z));
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const g = new THREE.TubeGeometry(curve, 128, tube, 10, true);
  g.computeVertexNormals();
  return g;
}

/**
 * One drip: fat at the rim, a long parallel run, rounded at the tip.
 *
 * The profile has to touch the axis at both ends. It used to start at radius
 * 0.18 and finish at 0.04, so the lathe produced an open-ended cone with no
 * caps — and since the frosting renders FrontSide, you looked straight through
 * every drip and saw the cake behind it. They read as little hollow V-shaped
 * notches cut out of the rim rather than as chocolate hanging off it.
 */
export function dripGeometry(): THREE.BufferGeometry {
  // (t along the run, radius). Closed at t=0 and t=1.
  const keys: [number, number][] = [
    [0, 0], [0.05, 0.42], [0.14, 0.50], [0.45, 0.47],
    [0.72, 0.42], [0.88, 0.34], [0.96, 0.21], [1, 0],
  ];

  const pts: THREE.Vector2[] = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let k = 0;
    while (k < keys.length - 2 && keys[k + 1][0] < t) k++;
    const [t0, r0] = keys[k];
    const [t1, r1] = keys[k + 1];
    const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    pts.push(new THREE.Vector2(r0 + (r1 - r0) * u, -t));
  }
  return latheWithUV(pts, 18);
}

/* ------------------------------------------------------------------ *
 * Ruffle and rosette decoration
 * ------------------------------------------------------------------ */

export function ruffleGeometry(): THREE.BufferGeometry {
  // A shallow curved frill; instanced around the circumference.
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.bezierCurveTo(-0.36, 0.42, 0.36, 0.42, 0.5, 0);
  s.bezierCurveTo(0.34, 0.14, -0.34, 0.14, -0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.02, bevelEnabled: true, bevelSize: 0.012,
    bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

export function rosetteGeometry(): THREE.BufferGeometry {
  // A spiral sweep — the piped swirl, not a sphere pretending to be one. Wound
  // from the outside in, so the centre sits proud the way a real rose does.
  const turns = 1.85;
  const pts: THREE.Vector3[] = [];
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const r = 0.46 * (1 - t) + 0.03;
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * t * 0.2, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, 60, 0.155, 9, false);
  // Built in XZ rising along +Y, so its face is +Y. Turn it to face +Z instead:
  // every other piece of decoration here is aimed by a yaw about Y, and a
  // +Z-facing rosette can be aimed the same way instead of by a three-term
  // Euler that has to be reasoned about from the composition order.
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ *
 * Board and plaque
 * ------------------------------------------------------------------ */

export function boardGeometry(radius: number): THREE.BufferGeometry {
  const h = 0.05;
  const r = radius * 1.28;
  // No wall or lid subdivision: a board carries no finish, so the extra rings
  // would be vertices spent on nothing.
  return latheWithUV(lathePoints(r, h, 0.016, 1, 1), 64);
}

export function plaqueGeometry(width: number, height: number): THREE.BufferGeometry {
  const s = roundedPolygon(
    [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]],
    height * 0.34,
  );
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.018, bevelEnabled: true, bevelSize: 0.012,
    bevelThickness: 0.01, bevelSegments: 3, curveSegments: 16,
  });
  g.rotateX(-Math.PI / 2);
  // ExtrudeGeometry's cap UVs are world coordinates, not 0–1, so the lettering
  // texture would be sampled from a single corner of the canvas. Renormalise.
  normaliseUV(g);
  g.computeVertexNormals();
  return g;
}

/** Remap UVs to the geometry's own XZ footprint, 0–1 on both axes. */
function normaliseUV(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const spanX = Math.max(1e-6, box.max.x - box.min.x);
  const spanZ = Math.max(1e-6, box.max.z - box.min.z);

  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - box.min.x) / spanX;
    uv[i * 2 + 1] = 1 - (pos.getZ(i) - box.min.z) / spanZ;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export interface OutlinePoint {
  x: number;
  z: number;
  /** Outward normal in the XZ plane. */
  nx: number;
  nz: number;
  /** Rotation about Y that faces the point outward. */
  yaw: number;
}

/**
 * Evenly spaced points around the actual silhouette. Ruffles and rosettes on a
 * square cake have to follow the square, not a circle inscribed in it.
 */
export function outlinePoints(shape: Shape, radius: number, count: number): OutlinePoint[] {
  const n = Math.max(6, Math.round(count));

  if (shape === "round" || shape === "bundt") {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, nx: Math.cos(a), nz: Math.sin(a), yaw: -a };
    });
  }

  // `tierGeometry` rotates the extrude by -90° about X, which sends shape Y to
  // world **-Z**, not +Z. This used to return `z: p.y`, so every outline for a
  // non-round shape was mirrored front-to-back. On a square, a rectangle and a
  // hexagon that is invisible — they are symmetric about the axis. On a heart it
  // is not: the cleft and the point swap ends, so the decoration ran round a
  // heart that was facing the other way. (cutShape has always had this right —
  // it measures `phiOf(p.x, -p.y)`.)
  const pts = polygonFor(shape, radius).getSpacedPoints(n);
  const world = pts.map(p => ({ x: p.x, z: -p.y }));

  // Which way the outline is wound, measured once for the whole loop. The old
  // test was per-point — flip the normal if it does not point away from the
  // origin — which is only valid for a shape whose every edge faces away from
  // its centre. A heart's cleft does not: the correct outward normal there
  // points back towards the middle of the cake, so the test inverted it and the
  // frills at the top of the heart were driven into the cake.
  let area = 0;
  for (let i = 0; i < world.length; i++) {
    const a = world[i];
    const b = world[(i + 1) % world.length];
    area += a.x * b.z - b.x * a.z;
  }
  const ccw = area > 0;

  return world.map((p, i) => {
    const next = world[(i + 1) % world.length];
    const prev = world[(i - 1 + world.length) % world.length];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    // Outward is the tangent turned 90° away from the interior, and which side
    // the interior is on is exactly what the winding tells us.
    const nx = (ccw ? tz : -tz) / len;
    const nz = (ccw ? -tx : tx) / len;
    return { x: p.x, z: p.z, nx, nz, yaw: -Math.atan2(nz, nx) };
  });
}

/** Push a measured outline out along its own normals — what a bevel does. */
export function offsetOutline(pts: OutlinePoint[], d: number): OutlinePoint[] {
  return pts.map(p => ({ ...p, x: p.x + p.nx * d, z: p.z + p.nz * d }));
}

/** The frosting thickness `shellGeometry` will use, so callers cannot drift. */
export function shellThickness(radius: number): number {
  return Math.max(0.022, radius * 0.035);
}

/**
 * The exact outline of the frosting shell, at the height band a given piece of
 * decoration hangs from.
 *
 * This replaces measuring the built mesh with a polar histogram. That approach
 * had three faults that all pointed the same way — towards a circle:
 *
 *  - it reconstructed each point as (cos θ · r, sin θ · r) and handed back
 *    (cos θ, sin θ) as the *normal*, which is the radial direction. On a flat
 *    face the surface normal is not radial, so every frill was pushed out along
 *    a diagonal and yawed to face the middle of the cake. That is why they
 *    splayed off the corners of a square and sank into its sides;
 *  - empty angular bins were filled by taking `max(prev, next)`, so the corner
 *    radius spread outward into its neighbours and inflated the whole outline
 *    towards the circumscribed circle;
 *  - a histogram of max-radius-per-angle cannot represent a concave outline at
 *    all, so a heart's cleft was filled in and the frills ran straight across
 *    the notch.
 *
 * Deriving it from the 2D shape is exact and handles all three. The reason the
 * original comment gave for not doing it — that a bevel offsets an outline
 * along its normal, which is not the same as scaling it — is right, and is why
 * this offsets rather than scales.
 */
export function shellOutline(
  shape: Shape,
  radius: number,
  height: number,
  count: number,
  band: "rim" | "widest",
): OutlinePoint[] {
  const { R, B } = shellMetrics(radius, height);

  if (shape === "bundt") {
    // A bundt's glaze pools well inside its widest point.
    return outlinePoints(shape, rimRadius(shape, R) + B, count);
  }

  if (shape === "round") {
    // lathePoints flares the base to R·1.012 and tapers back to R at the top of
    // the wall, which is where the frosting gathers before it runs.
    return outlinePoints(shape, band === "widest" ? R * 1.012 : R, count);
  }

  // ExtrudeGeometry insets the outline by bevelSize and then bevels back out
  // along the normals, so the side wall — the widest band, and the edge a drip
  // runs off — is the inset outline pushed back out by exactly one bevel.
  return offsetOutline(outlinePoints(shape, R - B, count), B);
}

/** The shell's outer radius and bevel, shared by everything that measures it. */
function shellMetrics(radius: number, height: number) {
  const t = shellThickness(radius);
  const R = radius + t;
  const H = height + t;
  return { R, H, B: Math.min(R * 0.13, H * 0.2, 0.1) };
}

/**
 * Height, above the tier's base, of the edge a drip runs off: the top of the
 * side wall, where the top bevel starts.
 *
 * The drip used to be pinned to `height + 0.012`, which is the top of the
 * *sponge* — but the frosting shell is built one thickness taller and one
 * thickness wider than that, so the entire rim and every drip on it was
 * rendered inside the frosting. Combined with an outline taken at the top of
 * the bevel rather than at the wall, the drip a customer paid ₹120 for did not
 * appear anywhere on any shape.
 */
export function shellRimY(radius: number, height: number): number {
  const { H, B } = shellMetrics(radius, height);
  return H - B;
}

/** Perimeter of a measured outline. A square's is 8r, not 2πr. */
export function outlinePerimeter(pts: OutlinePoint[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return sum;
}

/**
 * Radius of the circle that contains the whole footprint, whichever way the
 * cake is turned. The camera framing assumed every shape was as wide as a
 * round one of the same size, so a rectangle — which is 2.56 radii across its
 * long axis, and 3.04 across its diagonal — was framed as if it were 2 radii
 * wide and ran off both sides of the canvas.
 */
export function footprintRadius(shape: Shape, radius: number): number {
  switch (shape) {
    case "square": return radius * 1.42;
    case "rectangle": return radius * 1.52;
    case "heart": return radius * 1.08;
    default: return radius;
  }
}

/** Where a topping can sit, given the shape. Round-ish bound is close enough. */
export function surfaceRadius(shape: Shape, radius: number): number {
  switch (shape) {
    case "square": return radius * 0.92;
    case "rectangle": return radius * 0.9;
    case "hexagon": return radius * 0.9;
    case "heart": return radius * 0.78;
    case "bundt": return radius * 0.95;
    default: return radius;
  }
}
