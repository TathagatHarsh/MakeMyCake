import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // There are stray lockfiles above this directory; pin the workspace root.
  turbopack: {
    root: here,
  },
  // The 3D bundle is the whole cost centre — keep the imports tree-shaken so a
  // route chunk never pulls in the whole namespace.
  experimental: {
    optimizePackageImports: ["@react-three/drei", "three"],
  },
};

export default nextConfig;
