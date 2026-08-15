"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Food-photography lighting: a large soft warm key from above, a cool bounce
 * fill so shadows never go black, and a warm rim that fakes the subsurface glow
 * at the silhouette. Light from below alone is what makes things look like
 * horror props — there is none of it here.
 *
 * The environment is built from lightformers rather than an HDR file: no
 * network fetch, no 3MB download, and the reflections are art-directed.
 */
export function CakeLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      {/* Warm key — the sun through a kitchen window */}
      <directionalLight
        position={[4, 6, 3]}
        intensity={2.4}
        color="#FFF4E2"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-radius={6}
      />

      {/* Cool bounce fill — never let shadows go black */}
      <directionalLight position={[-3, 1, 4]} intensity={0.55} color="#DCE4F0" />

      {/* Warm rim — fakes subsurface glow at the silhouette */}
      <directionalLight position={[-2, 3, -5]} intensity={0.9} color="#FFD9A8" />

      <Environment resolution={256} environmentIntensity={0.55}>
        {/* Big soft overhead source — the window */}
        <Lightformer
          form="rect" intensity={2.2} color="#FFF6E8"
          position={[0, 5, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 9, 1]}
        />
        {/* Cool wall bounce, camera left */}
        <Lightformer
          form="rect" intensity={0.9} color="#D8E2F2"
          position={[-5, 1.5, 2]} rotation={[0, Math.PI / 2, 0]} scale={[7, 5, 1]}
        />
        {/* Warm wall bounce, camera right */}
        <Lightformer
          form="rect" intensity={0.7} color="#FFE9CE"
          position={[5, 1.5, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[7, 5, 1]}
        />
        {/* Behind, to lift the silhouette off the background */}
        <Lightformer
          form="ring" intensity={0.8} color="#FFE0BA"
          position={[-1.5, 2.5, -5]} scale={[4, 4, 1]}
        />
        {/* The worktop itself, bouncing a little warmth back up */}
        <Lightformer
          form="rect" intensity={0.35} color="#E8E2D6"
          position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]}
        />
      </Environment>

      {/* Ambient is the floor under the shadows, not a light source. */}
      <ambientLight intensity={0.18} color="#FFF0DE" />
    </>
  );
}
