import { DEFAULT_SLICE, tierGeometry } from "../components/three/geometry";

for (const shape of ["round", "square", "heart", "hexagon", "bundt"] as const) {
  const whole = tierGeometry({ shape, radius: 1, height: 1, segments: 48 });
  const cut = tierGeometry({ shape, radius: 1, height: 1, segments: 48, sector: DEFAULT_SLICE });
  cut.computeBoundingBox();
  const b = cut.boundingBox!;
  console.log(
    shape.padEnd(9),
    "whole", String(whole.attributes.position.count).padStart(6),
    "cut", String(cut.attributes.position.count).padStart(6),
    "groups", cut.groups.length,
    "y", b.min.y.toFixed(2), b.max.y.toFixed(2),
  );
}
