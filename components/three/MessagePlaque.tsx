"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { CakeConfig } from "@/lib/schema";
import { achievable, hexToHsl, hslToHex, shade } from "@/lib/color";
import {
  plaqueGeometry, shellThickness, surfaceRadius, tierShape, type TierDims,
} from "./geometry";
import { useDisposed } from "./useDisposable";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { mulberry32 } from "@/lib/seed";

/** Stable 32-bit hash of the message, so the plaque's grain never reshuffles. */
function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Props {
  config: CakeConfig;
  tiers: TierDims[];
  castShadow: boolean;
  /** True while the message is still being typed. */
  composing?: boolean;
}

const PLAQUE_COLOR = "#EFE0C4";

/*
 * The plaque's size on the cake.
 *
 * At 1.5 × the usable top radius, capped at 1.5 world units, the words came out as a
 * pale smudge in the middle of the cake at the size the page actually renders it —
 * legible if you already knew what it said, which is not legible. A real piped plaque
 * is a generous object: it is the thing the cake is *for*.
 */
// 1.72 overshot the other way: on a fondant 2kg the plaque became a slab covering
// most of the top. 1.55 is generous and still leaves the cake visible round it.
const PLAQUE_WIDTH_RATIO = 1.55;
const PLAQUE_MAX_WIDTH = 1.58;
const PLAQUE_ASPECT = 0.44;

/** The plaque lies on the top tier, whose shape is not always the cake's — a
 *  tiered heart is a heart over rounds. See geometry.tierShape. */
function topShape(config: CakeConfig, tiers: TierDims[]) {
  return tierShape(config.shape, tiers.length - 1, tiers.length);
}

/** Footprint on the top surface, so toppings can be told to keep off it. */
export interface PlaqueFootprint {
  /** Centre in XZ. */
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
}

export function plaqueFootprint(config: CakeConfig, tiers: TierDims[]): PlaqueFootprint | null {
  if (!config.message?.trim()) return null;
  const top = tiers[tiers.length - 1];
  const topR = surfaceRadius(config.shape, top.radius);
  const width = Math.min(topR * PLAQUE_WIDTH_RATIO, PLAQUE_MAX_WIDTH);
  const depth = width * PLAQUE_ASPECT;
  return {
    cx: 0,
    cz: topR * 0.06,
    // Inflated: a strawberry sitting flush against the plaque still reads as
    // covering it.
    halfW: (width / 2) * 1.22,
    halfD: (depth / 2) * 1.5,
  };
}

/**
 * The message is piped onto a white-chocolate plaque. The lettering is drawn to
 * a canvas and used as both the colour map and the bump map, so the piping has
 * real relief without a font file or a network fetch.
 */
function messageTexture(text: string, ink: string, width: number, height: number) {
  const W = 1024;
  const H = Math.round((W * height) / width);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PLAQUE_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Subtle mottling so the plaque is not a flat field of colour. Seeded from
  // the text: Math.random() here meant the plaque was different on every
  // render, which contradicts the project's own determinism rule and quietly
  // made the committed pixel baselines unreproducible.
  const rng = mulberry32(hashText(text));
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = i % 2 ? "#FFFFFF" : "#C8B79A";
    const r = 6 + rng() * 22;
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  const maxChars = text.length > 22 ? Math.ceil(text.length / 2) + 2 : text.length;
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);

  // Script faces are a nice-to-have and none of them are guaranteed to exist.
  // The fallback chain ends at a real serif rather than at `cursive`, because
  // on a machine with no script face installed `cursive` resolves to something
  // thin and pale, and a thin pale message on a cream plaque is the message
  // not appearing at all. Weight 600 keeps the bead readable either way.
  const family =
    `"Snell Roundhand", "Apple Chancery", "Segoe Script", "Brush Script MT", ` +
    `Georgia, "Times New Roman", serif`;
  // 700 rather than 600: the bead has to survive being mipmapped down to a plaque
  // that is a couple of hundred pixels across on the page.
  const font = (px: number) => `italic 700 ${px}px ${family}`;

  let fontSize = Math.min(H / (lines.length * 1.42), W / (maxChars * 0.46));
  ctx.font = font(fontSize);

  const longest = lines.reduce((a, b) => (a.length > b.length ? a : b), "");
  while (ctx.measureText(longest).width > W * 0.86 && fontSize > 12) {
    fontSize -= 2;
    ctx.font = font(fontSize);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = fontSize * 1.18;
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;

  /*
   * Three passes per line, and the order matters. Piped royal icing is a *round bead*
   * sitting on the plaque, so it has a shadow on the side away from the light, a body,
   * and a highlight along the top of the bead. The previous version had the first two
   * and not the third, which is why the lettering read as a printed decal that had
   * been slightly smudged rather than as something applied with a piping bag.
   *
   * The map is also the bump map, so these passes do double duty: the highlight lifts
   * the bead's crown in the bump as well as in the colour.
   */
  lines.forEach((l, i) => {
    const y = startY + i * lineHeight;

    // Contact shadow, down and to the shadow side.
    ctx.fillStyle = "rgba(74,52,30,0.3)";
    ctx.fillText(l, W / 2 + fontSize * 0.03, y + fontSize * 0.045);

    // The bead itself, stroked as well as filled so it thickens rather than
    // thinning out at the joins of a script face.
    ctx.fillStyle = ink;
    ctx.lineWidth = Math.max(1.5, fontSize * 0.045);
    ctx.strokeStyle = ink;
    ctx.strokeText(l, W / 2, y);
    ctx.fillText(l, W / 2, y);

    // Highlight along the top of the bead: a thin, offset, lighter pass, clipped to
    // the bead by drawing it inside the same glyph with a tight stroke.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1, fontSize * 0.014);
    ctx.strokeText(l, W / 2 - fontSize * 0.012, y - fontSize * 0.018);
    ctx.restore();
  });

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/**
 * While the message is being typed the plaque hovers clear of the cake, tilted
 * up towards the camera so the lettering is readable against the background
 * instead of against frosting. Pressing Done lowers it onto the cake, where it
 * stays — and toppings are told to keep off its footprint so nothing lands on
 * top of the words.
 */
export function MessagePlaque({ config, tiers, castShadow, composing = false }: Props) {
  const text = config.message?.trim();
  const top = tiers[tiers.length - 1];
  const topR = surfaceRadius(topShape(config, tiers), top.radius);
  const reduced = useReducedMotion();

  const width = Math.min(topR * PLAQUE_WIDTH_RATIO, PLAQUE_MAX_WIDTH);
  const height = width * PLAQUE_ASPECT;

  const geometry = useDisposed(useMemo(
    () => plaqueGeometry(width, height),
    [width, height],
  ));

  // Piping has to be legible against a cream plaque, so whatever colour was
  // picked gets pulled down until it actually reads.
  // The plaque is #EFE0C4, which is light. A ceiling of l≤0.38 still allowed a
  // mid-rose to sit on cream at roughly 3:1 and the message came out as a
  // smudge you had to already know the words to read. 0.26 with the saturation
  // pushed up keeps the customer's colour recognisable while making the words
  // actually legible, which is the entire point of paying for piping.
  const ink = useMemo(() => {
    const picked = config.messageColor ?? shade(config.frostingColor, -0.62);
    const { h, s: sat, l } = hexToHsl(achievable(picked));
    return hslToHex({ h, s: Math.min(1, sat * 1.15), l: Math.min(l, 0.26) });
  }, [config.messageColor, config.frostingColor]);

  const map = useDisposed(useMemo(
    () => (text ? messageTexture(text, ink, width, height) : new THREE.Texture()),
    [text, ink, width, height],
  ));

  /*
   * On the frosting, not on the sponge.
   *
   * `top.height` is the height of the *tier*; the frosting shell over it is built one
   * thickness taller (see geometry.shellGeometry). Adding 0.012 to the tier height
   * therefore put the plaque some 27mm *inside* the buttercream on a 1kg cake, which
   * is most of why it read as a decal printed on the surface rather than as an object
   * lying on it. Seated one shell thickness up, then pressed in by a hair so it beds
   * into the frosting the way something laid on buttercream does.
   */
  const restY = top.y + top.height + shellThickness(top.radius) - 0.004;
  // Lifted clear, not launched — it has to stay obviously part of the cake.
  const hoverY = restY + Math.max(0.3, top.height * 0.4);

  const group = useRef<THREE.Group>(null);
  const started = useRef(false);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const wantY = composing ? hoverY : restY;
    // Positive tilt about X brings the lettering face towards the camera.
    // Negative tips it away, and you end up reading the back of the plaque —
    // which renders the message mirrored.
    // 0.22 rad is 13 degrees, on a flat cake top: enough to read as a card propped
    // against something. At rest a plaque lies down, with just enough tilt to catch
    // the key light on the lettering.
    const wantTilt = composing ? 0.5 : 0.07;

    if (reduced || !started.current) {
      g.position.y = wantY;
      g.rotation.x = wantTilt;
      started.current = true;
      return;
    }

    const k = 1 - Math.pow(0.0009, delta);
    g.position.y = THREE.MathUtils.lerp(g.position.y, wantY, k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, wantTilt, k);
  });

  if (!text) return null;

  return (
    <group ref={group} position={[0, restY, topR * 0.06]}>
      <mesh geometry={geometry} castShadow={castShadow} receiveShadow>
        <meshPhysicalMaterial
          map={map}
          bumpMap={map}
          bumpScale={2.5}
          roughness={0.46}
          metalness={0}
          clearcoat={0.16}
          clearcoatRoughness={0.35}
          sheen={0.22}
          sheenColor="#FFF0D8"
          envMapIntensity={0.7}
        />
      </mesh>
    </group>
  );
}
