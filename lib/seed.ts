import type { CakeConfig } from "./schema";

/**
 * Drips, topping scatter and layer jitter must be stable across re-renders.
 * `Math.random()` reshuffles the cake every time React re-renders, which looks
 * broken and destroys trust instantly. Seed everything from the config.
 */
/**
 * Only the fields that the randomness actually consumes. Hashing the whole
 * config meant the seed changed on `pincode`, `message`, `eggless`, `sugarFree`
 * and `delivery` — none of which touch a vertex. Typing a six-digit delivery
 * pincode therefore reshuffled every drip, every topping and every layer jitter
 * six times, once per keystroke, in a panel the customer was looking straight
 * at. The comment below this function has always said that reshuffling "looks
 * broken and destroys trust instantly", and it was right.
 */
const SEEDED: (keyof CakeConfig)[] = [
  "shape", "size", "tiers", "layers",
  "sponge", "filling", "frosting", "coverage", "finish",
  "frostingColor", "hasDrip", "dripColor", "toppings",
];

export function seedFrom(c: CakeConfig): number {
  const s = JSON.stringify(SEEDED.map(k => c[k]));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — four lines, good enough, deterministic. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Poisson-ish disc sampling on a disc of radius `r`. Not a strict Bridson —
 * dart-throwing with rejection is plenty for 6–40 toppings and is stable.
 */
export function scatterDisc(
  rng: () => number,
  count: number,
  radius: number,
  minDist: number,
  innerRadius = 0,
): [number, number][] {
  const pts: [number, number][] = [];
  let guard = 0;
  while (pts.length < count && guard < count * 200) {
    guard++;
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * (radius - innerRadius) + innerRadius;
    const p: [number, number] = [Math.cos(a) * d, Math.sin(a) * d];
    if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= minDist)) {
      pts.push(p);
    }
  }
  return pts;
}
