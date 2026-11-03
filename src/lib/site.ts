/**
 * Single place to resolve public paths and URLs (values are injected by next.config.ts).
 *
 *   withBasePath("/icon.png")  -> "/dopyu/icon.png" on GitHub Pages, "/icon.png" on Cloudflare / local
 *                                 Use for raw href/src values that Next.js does not prefix itself
 *                                 (<Link>, next/image and app/ file conventions are prefixed automatically).
 *   absoluteUrl("/ogp.png")    -> "https://<site>/ogp.png" (keeps the site URL's own path, e.g. /dopyu)
 *                                 Use for OGP / X card images and anything shared outside the site.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
/** "env" = NEXT_PUBLIC_SITE_URL was set explicitly; "cloudflare" / "github" = detected */
export const SITE_URL_SOURCE = process.env.NEXT_PUBLIC_SITE_URL_SOURCE ?? "";

const leadingSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

export function withBasePath(path: string, basePath: string = BASE_PATH): string {
  return `${basePath}${leadingSlash(path)}`;
}

export function absoluteUrl(path: string = "/", siteUrl: string = SITE_URL): string {
  return `${siteUrl.replace(/\/+$/, "")}${leadingSlash(path)}`;
}

/**
 * Public URL of the app for share links.
 * An explicitly configured NEXT_PUBLIC_SITE_URL wins; otherwise the address the user is actually on
 * (works for GitHub Pages, Cloudflare Pages and custom domains alike).
 */
export function publicAppUrl(): string {
  if (SITE_URL_SOURCE === "env" && SITE_URL) return absoluteUrl("/");
  if (typeof window !== "undefined") return `${window.location.origin}${withBasePath("/")}`;
  return SITE_URL ? absoluteUrl("/") : "";
}
