import type { NextConfig } from "next";

type MyNextConfig = NextConfig & { swcMinify?: boolean };

const nextConfig: MyNextConfig = {
  // Enable production source maps so Vercel stack traces map to your source
  productionBrowserSourceMaps: true,

  // sensible defaults (adjust if needed)
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;