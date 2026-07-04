import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin monorepo root so Turbopack doesn't pick up ~/package-lock.json
const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const nextConfig: NextConfig = {
  transpilePackages: ["@acf/ui", "@acf/utils", "@acf/types"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
