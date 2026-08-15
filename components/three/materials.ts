import * as THREE from "three";
import type { Filling, Finish, Frosting, Sponge, Topping } from "@/lib/schema";
import { achievable, mix, shade } from "@/lib/color";
import { creamNormal, frostingNormal, satinNormal, sheetNormal, spongeNormal } from "./noise";

/**
 * The eight rules, encoded:
 *  1. Never pure white, never pure black — see lib/color.ts clamps.
 *  2. Roughness stays between 0.35 and 0.75; only ganache and glaze go lower.
 *  3. Every surface gets a normal map. 2–3% is enough.
 *  4/5. Handled by the lighting rig.
 *  6. Sheen with a warm sheenColor fakes subsurface warmth for free.
 *  7. Bevelled geometry — see geometry.ts.
 *  8. Saturation clamp before the colour reaches the material.
 */

export interface FrostingMaterialSpec {
  roughness: number;
  metalness: number;
  sheen: number;
  sheenColor: string;
  sheenRoughness: number;
  clearcoat: number;
  clearcoatRoughness?: number;
  normalScale: number;
  baseColor: string;
  /** Frostings that carry their own colour and ignore the picker. */
  fixedColor?: boolean;
}

/**
 * Sheen is a *fabric* lobe. At 0.25–0.40 it puts a felt nap over the whole
 * surface, and a felt nap on a bumpy normal map is what made every cake here
 * read as a stuccoed wall rather than something you would eat. Frosting is a
 * dielectric with one broad, soft, slightly-off-centre specular. So: sheen down
 * to a whisper, roughness into the range where that specular actually forms,
 * and normalScale down by roughly 3× across the board.
 */
export const FROSTING_MATERIALS: Record<Frosting, FrostingMaterialSpec> = {
  "whipped-cream": {
    roughness: 0.54, metalness: 0,
    sheen: 0.14, sheenColor: "#FFEFD9", sheenRoughness: 0.85,
    clearcoat: 0.04, normalScale: 0.15, baseColor: "#F7F1E6",
  },
  "american-buttercream": {
    roughness: 0.42, metalness: 0,
    sheen: 0.08, sheenColor: "#FFE9CC", sheenRoughness: 0.8,
    clearcoat: 0.14, clearcoatRoughness: 0.55,
    normalScale: 0.11, baseColor: "#F3E7D3",
  },
  "swiss-meringue": {
    roughness: 0.34, metalness: 0,
    sheen: 0.10, sheenColor: "#FFF2E0", sheenRoughness: 0.7,
    clearcoat: 0.20, clearcoatRoughness: 0.45,
    normalScale: 0.09, baseColor: "#F5EADA",
  },
  "cream-cheese": {
    roughness: 0.44, metalness: 0,
    sheen: 0.09, sheenColor: "#FFF0DC", sheenRoughness: 0.8,
    clearcoat: 0.12, clearcoatRoughness: 0.5,
    normalScale: 0.12, baseColor: "#F8F0E2",
  },
  "dark-ganache": {
    roughness: 0.24, metalness: 0,
    sheen: 0, sheenColor: "#4A2C1A", sheenRoughness: 0.4,
    clearcoat: 0.45, clearcoatRoughness: 0.22,
    normalScale: 0.10, baseColor: "#3B2318", fixedColor: true,
  },
  "milk-ganache": {
    roughness: 0.27, metalness: 0,
    sheen: 0, sheenColor: "#7A5236", sheenRoughness: 0.45,
    clearcoat: 0.40, clearcoatRoughness: 0.26,
    normalScale: 0.10, baseColor: "#6B4A32", fixedColor: true,
  },
  "white-ganache": {
    roughness: 0.30, metalness: 0,
    sheen: 0.06, sheenColor: "#FFF6E8", sheenRoughness: 0.5,
    clearcoat: 0.36, clearcoatRoughness: 0.28,
    normalScale: 0.10, baseColor: "#EFE3CE",
  },
  fondant: {
    // Rolled fondant is matte and dead flat — that is the look people are
    // buying. Flat, though, is not the same as textured.
    roughness: 0.52, metalness: 0,
    sheen: 0.06, sheenColor: "#FFF4E4", sheenRoughness: 0.8,
    clearcoat: 0.06, normalScale: 0.05, baseColor: "#F2EADC",
  },
  "mirror-glaze": {
    // 0.06 gives razor-straight reflections of the lightformers, which reads as
    // CG. A touch more roughness keeps the mirror and loses the hard edge.
    roughness: 0.11, metalness: 0.05,
    sheen: 0, sheenColor: "#FFF4E4", sheenRoughness: 0.5,
    clearcoat: 0.85, clearcoatRoughness: 0.1,
    normalScale: 0.06, baseColor: "#C4342A",
  },
};

export const SPONGE_COLORS: Record<Sponge, string> = {
  vanilla: "#E8D4A8",
  "belgian-chocolate": "#4A3226",
  "red-velvet": "#8B2E20",
  butterscotch: "#D9A860",
  coffee: "#6B4E3A",
  lemon: "#EDDC9A",
  pineapple: "#E8DCA0",
  mango: "#E5C36A",
  carrot: "#C08A4E",
  pistachio: "#B8C48A",
  coconut: "#EFE6D2",
  marble: "#D6C09A",   // blended with chocolate in the shader-side tint
  funfetti: "#EDDFC4",
};

export const FILLING_COLORS: Record<Filling, string> = {
  none: "#F0E4CE",
  "strawberry-jam": "#A34049",
  "raspberry-compote": "#8E3547",
  "lemon-curd": "#E8C55C",
  "vanilla-custard": "#F0DCA6",
  "chocolate-mousse": "#5A3A2A",
  "salted-caramel": "#B8813C",
  nutella: "#5E3A28",
  "hazelnut-praline": "#8C5F38",
  "cookie-crumb": "#4A3A32",
  "fresh-fruit": "#C46A52",
};

export const TOPPING_COLORS: Record<Topping, string> = {
  strawberry: "#B82E33",
  "mixed-berry": "#4F2A4C",
  "chocolate-shard": "#3B2318",
  "chocolate-curl": "#4A3226",
  macaron: "#E0A2B0",
  "meringue-kiss": "#F4E6D8",
  "gold-leaf": "#C9A227",
  sprinkles: "#D96A82",
  "pistachio-crumb": "#8FA35C",
  "edible-flower": "#D18AA4",
  oreo: "#2A2320",
  ferrero: "#8A6A3C",
};

export interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  sheen: number;
  sheenColor: string;
  sheenRoughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalMap: THREE.Texture;
  normalScale: THREE.Vector2;
  envMapIntensity: number;
}

/**
 * The finish is what the customer chose and paid for, so the finish — not the
 * frosting — decides how much surface texture there is. "Smooth · scraped flat
 * with a bench scraper" and "Rustic · swirled with a palette knife" previously
 * shared one map and came out identical; the copy promised a difference the
 * render did not deliver.
 */
function normalFor(frosting: Frosting, finish: Finish): THREE.Texture {
  if (frosting === "fondant" || frosting === "mirror-glaze") return sheetNormal();

  // Combed ridges come from geometry, not from a stretched normal map — an
  // anisotropic map on a lathe puts a hard seam down one side. Between the
  // ridges the surface is scraped, so it wants the flat map.
  if (finish === "smooth" || finish === "ombre" || finish === "combed") return satinNormal();

  // Ruffles and rosettes carry all the detail as instanced geometry; texturing
  // the shell underneath them only adds noise behind the piping.
  if (finish === "ruffle" || finish === "rosette") return satinNormal();

  if (finish === "rustic" || frosting === "whipped-cream") return creamNormal();
  return frostingNormal();
}

/**
 * A cloned THREE.Texture gets a fresh uuid, so every clone is a separate GPU
 * upload — and nothing here ever disposed them. Changing frosting colour ten
 * times used to leave ten 512×512 RGBA textures resident. Repeat is the only
 * thing that varies, so cache on it.
 */
const tiledCache = new Map<string, THREE.Texture>();

function tiled(map: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const key = `${map.uuid}:${rx}:${ry}`;
  const hit = tiledCache.get(key);
  if (hit) return hit;

  const tex = map.clone();
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
  tiledCache.set(key, tex);
  return tex;
}

/**
 * A lathe's UVs run 0–1 around the circumference and 0–1 along the profile, and
 * those are wildly different world lengths. A uniform repeat stretches the map
 * and the stretch shows up as vertical brush streaks down the side of the cake.
 */
export function frostingMaterial(
  frosting: Frosting,
  pickedColor: string,
  finish: Finish,
  repeat: number | [number, number] = 3,
): MaterialProps {
  const spec = FROSTING_MATERIALS[frosting];
  const color = spec.fixedColor ? spec.baseColor : achievable(pickedColor);

  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const tex = tiled(normalFor(frosting, finish), rx, ry);

  return {
    color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    sheen: spec.sheen,
    sheenColor: spec.sheenColor,
    sheenRoughness: spec.sheenRoughness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness ?? 0.4,
    normalMap: tex,
    normalScale: new THREE.Vector2(spec.normalScale, spec.normalScale),
    // 0.7 left the frosting lit almost entirely by the three directional lights,
    // which is flat. The environment is what puts a soft gradient down the side
    // of the cake and a highlight on the top edge.
    envMapIntensity: frosting === "mirror-glaze" ? 1.6 : 1.0,
  };
}

/** Ombré grades the colour from base to top; this is the base-end tint. */
export function ombreBase(hex: string): string {
  return shade(achievable(hex), -0.16);
}

export function ombreTop(hex: string): string {
  return shade(achievable(hex), +0.12);
}

export function spongeMaterial(
  sponge: Sponge,
  repeat: number | [number, number] = 4,
): MaterialProps {
  const base = SPONGE_COLORS[sponge];
  const color = sponge === "marble" ? mix(base, SPONGE_COLORS["belgian-chocolate"], 0.28) : base;

  const tex = spongeNormal().clone();
  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;

  return {
    color,
    roughness: 0.86,
    metalness: 0,
    sheen: 0.12,
    sheenColor: "#FFE7C8",
    sheenRoughness: 0.9,
    clearcoat: 0,
    clearcoatRoughness: 0.5,
    normalMap: tex,
    normalScale: new THREE.Vector2(0.55, 0.55),
    envMapIntensity: 0.4,
  };
}

/**
 * Tile count that keeps one texture tile about `tile` world units on both axes.
 * Round and bundt tiers are lathes; everything else is extruded and already has
 * roughly world-scaled UVs.
 */
export function tileRepeat(
  shape: string,
  radius: number,
  height: number,
  tile = 1.5,
): [number, number] {
  if (shape === "round" || shape === "bundt") {
    const around = (Math.PI * 2 * radius) / tile;
    const along = (height + radius) / tile;   // lathe v runs the profile length
    return [Math.max(2, Math.round(around)), Math.max(1, Math.round(along))];
  }
  const n = Math.max(1, Math.round(1 / tile));
  return [n, n];
}

export function fillingMaterial(filling: Filling): MaterialProps {
  const tex = frostingNormal().clone();
  tex.repeat.set(6, 2);
  tex.needsUpdate = true;

  return {
    color: FILLING_COLORS[filling],
    roughness: 0.48,
    metalness: 0,
    sheen: 0.2,
    sheenColor: "#FFE9CC",
    sheenRoughness: 0.6,
    clearcoat: 0.12,
    clearcoatRoughness: 0.4,
    normalMap: tex,
    normalScale: new THREE.Vector2(0.4, 0.4),
    envMapIntensity: 0.6,
  };
}

export interface ToppingMaterialSpec {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  sheen?: number;
}

export const TOPPING_MATERIALS: Record<Topping, ToppingMaterialSpec> = {
  strawberry: { color: TOPPING_COLORS.strawberry, roughness: 0.34, metalness: 0, clearcoat: 0.5 },
  "mixed-berry": { color: TOPPING_COLORS["mixed-berry"], roughness: 0.38, metalness: 0, clearcoat: 0.35 },
  "chocolate-shard": { color: TOPPING_COLORS["chocolate-shard"], roughness: 0.24, metalness: 0, clearcoat: 0.4 },
  "chocolate-curl": { color: TOPPING_COLORS["chocolate-curl"], roughness: 0.3, metalness: 0, clearcoat: 0.3 },
  macaron: { color: TOPPING_COLORS.macaron, roughness: 0.68, metalness: 0, clearcoat: 0.05, sheen: 0.3 },
  "meringue-kiss": { color: TOPPING_COLORS["meringue-kiss"], roughness: 0.62, metalness: 0, clearcoat: 0.06, sheen: 0.35 },
  "gold-leaf": { color: TOPPING_COLORS["gold-leaf"], roughness: 0.28, metalness: 0.95, clearcoat: 0 },
  sprinkles: { color: TOPPING_COLORS.sprinkles, roughness: 0.42, metalness: 0, clearcoat: 0.3 },
  "pistachio-crumb": { color: TOPPING_COLORS["pistachio-crumb"], roughness: 0.8, metalness: 0, clearcoat: 0 },
  "edible-flower": { color: TOPPING_COLORS["edible-flower"], roughness: 0.62, metalness: 0, clearcoat: 0.08, sheen: 0.4 },
  oreo: { color: TOPPING_COLORS.oreo, roughness: 0.74, metalness: 0, clearcoat: 0 },
  ferrero: { color: TOPPING_COLORS.ferrero, roughness: 0.44, metalness: 0.15, clearcoat: 0.25 },
};

/** Sprinkles and mixed berries need more than one colour to read right. */
export const TOPPING_PALETTES: Partial<Record<Topping, string[]>> = {
  sprinkles: ["#D9556E", "#E8A93C", "#7FA9D6", "#8FBF7A", "#F0E4D2"],
  "mixed-berry": ["#3F2A52", "#8E2340", "#4A2338", "#5E3A66"],
  macaron: ["#E0A2B0", "#EBCF9A", "#B9CFA6", "#C8A9CE", "#E8B79A"],
  "edible-flower": ["#D18AA4", "#E4C069", "#C4A2CE", "#EDE0D0"],
  "meringue-kiss": ["#F4E6D8", "#EDD3D8", "#E8DCC4"],
};

/**
 * At #D8D3CA the board was an off-white disc under an off-white cake on an
 * off-white page: three values within a few percent of each other, so the cake
 * had no base and appeared to float. A real board is foil-laminated card, which
 * is both darker than the cake and slightly specular — the specular is what
 * separates it, because it catches the key light where the matte frosting does
 * not.
 */
export const BOARD_MATERIAL = {
  color: "#A79C8A",
  roughness: 0.46,
  metalness: 0.22,
} as const;
