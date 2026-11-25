import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
  experimental: {
    proxyClientMaxBodySize: "50mb", // Prevent JSON body truncation for large payloads with base64 images
  },
};

export default nextConfig;
