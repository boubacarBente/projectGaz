import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  serverExternalPackages: ["better-sqlite3", "sharp",],
  outputFileTracingExcludes: {
    "/*": [
      "release/**/*",
      ".electron-app/**/*",
      ".next/standalone/**/*",
      "tmp-electron/**/*",
      "tmp-electron*.log",
      "db-error.log",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
