import type { NextConfig } from "next";

/**
 * Fully static export for GitHub Pages.
 * The project site is served at https://<user>.github.io/<repo>/, so a basePath is needed.
 * - CI: the workflow passes PAGES_BASE_PATH (actions/configure-pages output, e.g. "/dopyu")
 * - Local production build: defaults to "/dopyu" (same as Pages)
 * - next dev: no basePath
 */
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.PAGES_BASE_PATH ?? (isProd ? "/dopyu" : "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // /ranking -> /ranking/index.html, which every static host serves reliably
  trailingSlash: true,
  images: { unoptimized: true },
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
