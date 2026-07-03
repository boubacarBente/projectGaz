import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  serverExternalPackages: ["better-sqlite3", "sharp",],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
