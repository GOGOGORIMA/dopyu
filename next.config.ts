import { execSync } from "node:child_process";
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

/** Fallback when neither the env vars nor the git remote are available. */
const DEFAULT_SITE_URL = "https://gogogorima.github.io/dopyu";

/** "owner/repo" from GitHub Actions, or parsed from `git remote get-url origin`. */
function githubRepository(): string | undefined {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const remote = execSync("git remote get-url origin", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    // https://github.com/OWNER/REPO(.git) or git@github.com:OWNER/REPO(.git)
    const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote);
    return match ? `${match[1]}/${match[2]}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Absolute site URL used as metadataBase, so og:image etc. become https://... URLs.
 * NEXT_PUBLIC_SITE_URL wins (the Pages workflow passes configure-pages' base_url);
 * otherwise it is the GitHub Pages URL derived from the repository.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const repo = githubRepository();
  if (!repo) return DEFAULT_SITE_URL;
  const [owner, name] = repo.split("/");
  const host = `${owner.toLowerCase()}.github.io`;
  // A "<owner>.github.io" repository is a user site served from the root
  return name.toLowerCase() === host ? `https://${host}` : `https://${host}/${name}`;
}

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Exposed so client code can build absolute share URLs
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_SITE_URL: resolveSiteUrl() },
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
