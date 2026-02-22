import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "legaleasy.tools" }],
        destination: "https://policycheck.tools/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.legaleasy.tools" }],
        destination: "https://policycheck.tools/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/agent.json",
        destination: "/api/agent-card",
      },
      {
        source: "/.well-known/x402.json",
        destination: "/api/x402-discovery",
      },
      {
        source: "/.well-known/jwks.json",
        destination: "/api/jwks",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/chatgpt/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/api/a2a",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-API-Key" },
        ],
      },
    ];
  },
};

export default nextConfig;
