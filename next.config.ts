import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Lets a production build run beside a running dev server without sharing its folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Smaller responses, and no framework header on every reply.
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Import only the MUI components that are used instead of whole packages.
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },
};

export default nextConfig;
