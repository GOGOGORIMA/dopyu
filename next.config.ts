import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 defaults: Cache Components (static shell plus streamed dynamic parts) and Partial Prefetching
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
