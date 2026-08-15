"use client";

import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CakeConfig } from "@/lib/schema";
import { useQuality } from "@/lib/quality";
import { useView } from "@/lib/view";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Cake, cakeFocus } from "./Cake";
import { CakeLighting } from "./Lighting";

interface Props {
  config: CakeConfig;
  /** Auto-rotate belongs on the review screen only. */
  autoRotate?: boolean;
  className?: string;
  interactive?: boolean;
  /**
   * Track the shared view state — the cutaway toggle and whether the message is
   * still being typed. Off for gallery and share previews, which show the cake
   * as ordered rather than as it is being edited.
   */
  followView?: boolean;
}

/**
 * Cakes are photographed from three-quarters, slightly above eye level, looking
 * slightly down. A 35mm-equivalent field of view keeps the proportions honest —
 * wide angles distort food and make it look wrong.
 */
export function CakeScene({
  config, autoRotate = false, className, interactive = true, followView = false,
}: Props) {
  const q = useQuality();
  const reduced = useReducedMotion();
  const sliced = useView(s => s.sliced) && followView;
  const composing = useView(s => s.composingMessage) && followView;

  return (
    <Canvas
      className={className}
      shadows={q.shadows ? "soft" : false}
      dpr={q.dpr}
      gl={{
        antialias: q.antialias,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        // Without ACES the highlights clip to white and the frosting loses form.
      }}
      camera={{ position: [0, 2.2, 5.5], fov: 35, near: 0.1, far: 60 }}
      /*
       * A still cake does not need 60 frames a second. The landing page mounts
       * four of these canvases and the presets page eight; on "always" that was
       * eight render loops running flat out behind a page where nothing moves,
       * which is how a laptop fan tells a customer the site is cheap. Anything
       * that is not being dragged or deliberately spinning renders on demand.
       */
      frameloop={interactive || autoRotate ? "always" : "demand"}
    >
      <Suspense fallback={null}>
        <CakeLighting shadows={q.shadows} />

        <group position={[0, -0.55, 0]}>
          <Cake
            config={config}
            segments={q.segments}
            castShadow={q.shadows}
            maxInstances={q.maxInstances}
            sliced={sliced}
            composingMessage={composing}
          />

          {/* The board mesh occupies y ∈ [-0.05, 0]. The shadow plane used to sit
              at -0.048, i.e. *inside* it, so the only shadow in the scene was
              drawn underneath an opaque disc and the cake appeared to float on
              nothing. It belongs just below the board, where the pool of dark
              can spread past the board's edge and give the cake a base. */}
          {q.contactShadows && (
            <ContactShadows
              position={[0, -0.052, 0]}
              opacity={0.58}
              scale={6}
              blur={2.2}
              far={2.4}
              resolution={q.tier === "high" ? 512 : 256}
              color="#3A2E22"
            />
          )}
        </group>

        {/* On a demand-driven canvas useFrame only runs on the frames that are
            actually drawn, so there is nothing to ease over. Snap instead. */}
        <Framing config={config} animate={interactive || autoRotate} />

        <OrbitControls
          enablePan={false}
          enableZoom={interactive}
          enableRotate={interactive}
          minPolarAngle={0.3}
          maxPolarAngle={1.45}
          minDistance={2.4}
          maxDistance={9}
          enableDamping
          dampingFactor={0.06}
          autoRotate={autoRotate && !reduced}
          autoRotateSpeed={0.4}
          makeDefault
        />
      </Suspense>
    </Canvas>
  );
}

/**
 * Keeps the whole cake in frame as it grows, easing rather than snapping. A
 * three-tier 5kg cake and a 0.5kg round need very different distances.
 */
function Framing({ config, animate = true }: { config: CakeConfig; animate?: boolean }) {
  const initialCamera = useThree(s => s.camera);
  const reduced = useReducedMotion() || !animate;

  const aspect = useThree(s => s.size.width / Math.max(1, s.size.height));

  const target = useMemo(() => {
    const { height, radius } = cakeFocus(config);
    const fov = (35 * Math.PI) / 180;

    // Fit vertically and horizontally, then take whichever needs more room. A
    // tall narrow canvas is constrained by width, not height, and fitting only
    // the vertical FOV crops the cake against the sides.
    const halfV = Math.tan(fov / 2);
    const halfH = halfV * aspect;

    // Board included, plus a little air. The margin is small because the fit is
    // already correct — multiplying a correct fit by 1.5 just pushes the cake
    // into the middle distance.
    // Board below, plus headroom for anything piled on top.
    const crown = config.toppings.some(t => t.placement === "crown") ? 0.34 : 0.12;
    const tall = height + 0.14 + crown;

    const needV = tall / 2 / halfV;
    const needH = (radius * 2.34) / 2 / halfH;

    // 1.26 filled the frame edge to edge. A cake photographed with no air
    // around it reads as a product cut-out, not as something on a table.
    const distance = THREE.MathUtils.clamp(Math.max(needV, needH) * 1.4, 2.6, 12);

    // The cake sits in a group offset by -0.55; look at its actual middle.
    return { distance, lookY: height * 0.5 - 0.55 };
  }, [config, aspect]);

  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    initialCamera.position.setLength(target.distance);
  }, [initialCamera, target.distance]);

  // Everything mutable is read off the frame state rather than captured, so the
  // camera and controls are never treated as React-owned values.
  useFrame((state, delta) => {
    const camera = state.camera;
    const controls = state.controls as unknown as OrbitControlsImpl | null;
    const wantY = target.lookY;

    if (reduced) {
      controls?.target.set(0, wantY, 0);
      camera.position.setLength(target.distance);
      return;
    }

    // 0.001 is a 99.9%-per-second convergence: a snap with a wobble on the end,
    // not an ease. 0.06 lands in about half a second, which is the same beat as
    // the option card and the price ticking over, so the three read as one
    // response to one tap rather than three unrelated things twitching.
    const k = 1 - Math.pow(0.06, delta);
    if (controls) {
      controls.target.setY(THREE.MathUtils.lerp(controls.target.y, wantY, k));
    }
    camera.position.setLength(
      THREE.MathUtils.lerp(camera.position.length(), target.distance, k),
    );
  });

  return null;
}
