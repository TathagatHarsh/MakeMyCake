import * as THREE from "three";

/**
 * A perfectly uniform surface reads as plastic. Everything gets 2–3% of
 * micro-variation, driven from here. No texture files, no network fetch — the
 * maps are generated once on the client and cached.
 */

function hash3(x: number, y: number, z: number): number {
  let h = 374761393 + Math.imul(x | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= Math.imul(y | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  h ^= Math.imul(z | 0, 3266489917);
  h = Math.imul(h ^ (h >>> 16), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const c00 = lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), xf);
  const c10 = lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), xf);
  const c01 = lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), xf);
  const c11 = lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), xf);

  return lerp(lerp(c00, c10, yf), lerp(c01, c11, yf), zf);
}

export function fbm3(x: number, y: number, z: number, octaves = 4, gain = 0.5, lacunarity = 2): number {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3(x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

/** 2D slice of the same field, for texture generation. */
function fbm2(x: number, y: number, octaves: number, gain = 0.5): number {
  return fbm3(x, y, 0.5, octaves, gain);
}

type NormalMapSpec = {
  size: number;
  frequency: number;
  octaves: number;
  strength: number;
  /** Stretches the field so ridges run one way (combed frosting, sponge crumb). */
  anisotropy?: number;
};

const cache = new Map<string, THREE.Texture>();

/**
 * Height field → tangent-space normal map, as a DataTexture. Kept small
 * (256–512) to stay well inside the 30MB texture budget.
 */
export function normalMap(key: string, spec: NormalMapSpec): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;

  const { size, frequency, octaves, strength, anisotropy = 1 } = spec;
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] = fbm2(
        (x / size) * frequency * anisotropy,
        (y / size) * frequency,
        octaves,
      );
    }
  }

  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // Normalise (-dx, -dy, 1)
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/**
 * Satin — scraped buttercream, meringue, ganache.
 *
 * This map is tiled several times around the cake (see materials.tileRepeat), so
 * its frequency is multiplied by the repeat count before it reaches the eye. At
 * 26 the product was a bump every 3mm of real cake, which is not frosting — it
 * is stucco. Frosting off a bench scraper is broad and slow: one soft
 * undulation every inch or two, and nothing finer.
 */
export const frostingNormal = () =>
  normalMap("frosting", { size: 512, frequency: 6, octaves: 3, strength: 5 });

/**
 * All but flat. Smooth, ombré and combed finishes are *defined* by the absence
 * of surface texture — the whole point of a bench scraper is that it takes the
 * texture off. Any visible grain here is a lie about the finish the customer
 * paid for.
 */
export const satinNormal = () =>
  normalMap("satin", { size: 256, frequency: 3.2, octaves: 2, strength: 2.2 });

/** Coarser, softer — whipped cream and rustic palette-knife work. */
export const creamNormal = () =>
  normalMap("cream", { size: 512, frequency: 5, octaves: 3, strength: 11 });

/** Crumb. This is what makes a cut sponge read as cake and not a coloured cylinder. */
export const spongeNormal = () =>
  normalMap("sponge", { size: 512, frequency: 38, octaves: 4, strength: 22 });

/** Almost flat — fondant and mirror glaze only need a whisper. */
export const sheetNormal = () =>
  normalMap("sheet", { size: 256, frequency: 8, octaves: 3, strength: 6 });

/** The cake board — pressed card. */
export const boardNormal = () =>
  normalMap("board", { size: 256, frequency: 48, octaves: 3, strength: 14 });
