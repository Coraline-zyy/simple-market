import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack anchored to this app. Without this, a lockfile in a parent
  // directory can make `next dev` resolve Tailwind from the wrong folder.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
