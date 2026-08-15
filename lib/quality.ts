"use client";

import { useEffect, useState } from "react";

export type QualityTier = "high" | "low";

export interface QualitySettings {
  tier: QualityTier;
  dpr: [number, number];
  /** Radial segments for lathe geometry. */
  segments: number;
  shadows: boolean;
  contactShadows: boolean;
  /** Toppings above this count get thinned out. */
  maxInstances: number;
  antialias: boolean;
}

export const HIGH: QualitySettings = {
  tier: "high",
  dpr: [1, 2],
  segments: 72,
  shadows: true,
  contactShadows: true,
  maxInstances: 80,
  antialias: true,
};

export const LOW: QualitySettings = {
  tier: "low",
  dpr: [1, 1],
  segments: 32,
  shadows: false,
  contactShadows: true,
  maxInstances: 32,
  antialias: false,
};

function guess(): QualitySettings {
  if (typeof navigator === "undefined") return HIGH;

  const cores = navigator.hardwareConcurrency ?? 4;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  if (cores <= 4) return LOW;
  if (memory !== undefined && memory <= 4) return LOW;
  if (mobile && cores <= 6) return LOW;
  return HIGH;
}

let measured: QualitySettings | null = null;

/**
 * Cheap up-front guess, then a real frame-rate check. Chrome desktop with mobile
 * emulation tells you nothing about a ₹15,000 Android — the runtime check is the
 * one that counts.
 */
export function useQuality(): QualitySettings {
  const [settings, setSettings] = useState<QualitySettings>(() => measured ?? guess());

  useEffect(() => {
    if (measured) return;

    let frames = 0;
    let raf = 0;
    const start = performance.now();

    const tick = () => {
      frames++;
      const elapsed = performance.now() - start;
      if (elapsed < 1200) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const fps = (frames / elapsed) * 1000;
      const next = fps < 40 ? LOW : settings;
      measured = next;
      if (next.tier !== settings.tier) setSettings(next);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [settings]);

  return settings;
}
