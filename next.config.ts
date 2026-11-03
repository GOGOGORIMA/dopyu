import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import { parseGitHubRemote, resolveBasePath, resolveSiteUrl } from "./src/lib/deploy-env";

/**
 * Fully static export that works on every host without path breakage:
 *   - GitHub Pages     https://<user>.github.io/<repo>/  -> basePath "/<repo>" (GITHUB_ACTIONS)
 *   - Cloudflare Pages https://<project>.pages.dev/       -> basePath ""        (CF_PAGES)
 *   - Local dev / local build                             -> basePath ""
 * The rules live in src/lib/deploy-env.ts (unit tested).
 */

/** "owner/repo" of this checkout, used when GITHUB_REPOSITORY is not set. */
function gitRepository(): string | undefined {
  try {
    return parseGitHubRemote(
      execSync("git remote get-url origin", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
    );
  } catch {
    return undefined;
  }
}

const repository = process.env.GITHUB_REPOSITORY || gitRepository();
const basePath = resolveBasePath(process.env, repository);
const site = resolveSiteUrl(process.env, repository);

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Readable from client code (see src/lib/site.ts)
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: site.url,
    NEXT_PUBLIC_SITE_URL_SOURCE: site.source,
  },
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
