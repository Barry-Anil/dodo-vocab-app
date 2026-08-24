import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This project is a self-contained subtree inside a larger, unrelated git
  // repo (an existing Vite/React app lives at the parent's root with its own
  // lockfile) — pin the workspace root explicitly so Next.js/Turbopack don't
  // infer it from the parent directory's lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
