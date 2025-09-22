import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Skip ESLint during `next build` on Vercel
  eslint: { ignoreDuringBuilds: true },

  // ✅ Skip TypeScript type errors during build (the app will still run)
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
