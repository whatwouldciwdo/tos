import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
  // Disable experimental profiler to prevent performance measurement errors
  experimental: {
    // @ts-ignore
    reactProfiler: false,
    proxyClientMaxBodySize: "50mb", // Prevent JSON body truncation for large payloads with base64 images
  },
};

export default nextConfig;
