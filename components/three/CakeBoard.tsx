"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { BOARD_MATERIAL } from "./materials";
import { boardGeometry } from "./geometry";
import { boardNormal } from "./noise";
import { useDisposed } from "./useDisposable";

/** Thin pressed-card round, matte, sitting under everything. */
export function CakeBoard({ radius }: { radius: number }) {
  const geometry = useDisposed(useMemo(
    () => boardGeometry(radius),
    [radius],
  ));

  const normalMap = useMemo(() => {
    const t = boardNormal().clone();
    t.repeat.set(6, 6);
    t.needsUpdate = true;
    return t;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, -0.05, 0]} receiveShadow castShadow>
      <meshStandardMaterial
        color={BOARD_MATERIAL.color}
        roughness={BOARD_MATERIAL.roughness}
        metalness={BOARD_MATERIAL.metalness}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.35, 0.35)}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}
