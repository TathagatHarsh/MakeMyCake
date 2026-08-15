/**
 * Real food colours are less saturated than people expect, and a bakery
 * genuinely cannot produce neon frosting with natural colouring. The UI shows
 * the colour the customer picked; the renderer shows the one we can achieve.
 */

export interface HSL { h: number; s: number; l: number }

export function hexToHsl(hex: string): HSL {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 0.5 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const MAX_SATURATION = 0.65;
/** Pure white blows out to a featureless blob; pure black reads as a hole. */
export const MAX_LIGHTNESS = 0.94;
export const MIN_LIGHTNESS = 0.10;

/** The colour the kitchen can actually mix. */
export function achievable(hex: string): string {
  const hsl = hexToHsl(hex);
  return hslToHex({
    h: hsl.h,
    s: Math.min(hsl.s, MAX_SATURATION),
    l: Math.min(MAX_LIGHTNESS, Math.max(MIN_LIGHTNESS, hsl.l)),
  });
}

/** True when we had to pull the colour back — the UI says so rather than hiding it. */
export function wasClamped(hex: string): boolean {
  return achievable(hex).toLowerCase() !== hex.toLowerCase();
}

export function clampReason(hex: string): string | null {
  if (!wasClamped(hex)) return null;
  const { s, l } = hexToHsl(hex);
  if (s > MAX_SATURATION) {
    return "Natural colouring can't reach that saturation — we'll mix the closest shade a kitchen can actually produce.";
  }
  if (l > MAX_LIGHTNESS) return "Pure white frosting has no form under light. We'll use a warm off-white.";
  return "Near-black frosting reads as a hole in a photograph. We'll use a deep charcoal.";
}

export function mix(a: string, b: string, t: number): string {
  const pa = hexToHsl(a), pb = hexToHsl(b);
  return hslToHex({
    h: pa.h + (pb.h - pa.h) * t,
    s: pa.s + (pb.s - pa.s) * t,
    l: pa.l + (pb.l - pa.l) * t,
  });
}

export function shade(hex: string, deltaL: number): string {
  const c = hexToHsl(hex);
  return hslToHex({ ...c, l: Math.min(MAX_LIGHTNESS, Math.max(MIN_LIGHTNESS, c.l + deltaL)) });
}
