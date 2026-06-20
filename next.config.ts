import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow large multipart uploads (video presets up to 50 MB).
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
