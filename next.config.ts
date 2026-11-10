import type { NextConfig } from "next";
import path from "path";

const API_PROXY_TARGET = (process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/meawmeawmeawmeawmeaw/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "."),
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;