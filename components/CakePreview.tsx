"use client";

import type { CakeConfig } from "@/lib/schema";
import { LazyCakeScene } from "@/components/three/LazyCakeScene";

/** A read-only view of a cake, for share pages, the gallery and the landing hero. */
export function CakePreview({
  config,
  autoRotate = false,
  interactive = true,
  className,
}: {
  config: CakeConfig;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  // The wrapper must fill its parent: R3F sizes the canvas to 100% of its
  // container, and a container with auto height collapses the drawing buffer.
  return (
    <div className={`h-full w-full ${className ?? ""}`}>
      <LazyCakeScene config={config} autoRotate={autoRotate} interactive={interactive} />
    </div>
  );
}
