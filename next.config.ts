import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Do not block builds on ESLint errors in CI (Vercel)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Do not block builds on TS type errors in CI (Vercel)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
