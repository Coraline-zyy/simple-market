import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() { return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] }]; },
  // Keep Turbopack anchored to this app. Without this, a lockfile in a parent
  // directory can make `next dev` resolve Tailwind from the wrong folder.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
