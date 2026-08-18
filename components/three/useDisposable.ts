"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Disposable = { dispose: () => void };

/**
 * Wrap a memoised geometry or texture so the previous one is released when it
 * is replaced. Geometry rebuilt on every config change would otherwise leak GPU
 * memory as the customer changes their mind.
 *
 * Takes the value rather than a factory so callers keep a literal dependency
 * list on their own `useMemo`, which is what the hook lint rules can verify.
 */
export function useDisposed<T extends Disposable | null>(value: T): T {
  const prev = useRef<T | null>(null);

  useEffect(() => {
    if (prev.current && prev.current !== value) prev.current.dispose();
    prev.current = value;
  }, [value]);

  useEffect(() => () => { prev.current?.dispose(); }, []);

  return value;
}

/** Ombré: colour graded from base to top, baked into a vertex colour attribute. */
export function applyVerticalGradient(
  geometry: THREE.BufferGeometry,
  bottomHex: string,
  topHex: string,
) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const span = Math.max(1e-4, box.max.y - box.min.y);

  const bottom = new THREE.Color(bottomHex).convertSRGBToLinear();
  const top = new THREE.Color(topHex).convertSRGBToLinear();
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const raw = (pos.getY(i) - box.min.y) / span;
    const t = raw * raw * (3 - 2 * raw);
    c.copy(bottom).lerp(top, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
