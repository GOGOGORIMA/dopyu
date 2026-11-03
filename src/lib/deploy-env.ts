/**
 * Build-time deployment detection (used by next.config.ts; pure functions so they can be tested).
 *
 * basePath (where the app is served from):
 *   1. Cloudflare Pages (CF_PAGES) or NEXT_PUBLIC_BASE_PATH === ""  -> ""  (root domain)
 *      (a non-empty NEXT_PUBLIC_BASE_PATH such as "/app" is used as-is)
 *   2. GitHub Actions (GITHUB_ACTIONS === "true")                   -> "/<repo>" from GITHUB_REPOSITORY
 *      ("" for a "<owner>.github.io" user site, which is served from the root)
 *   3. Anything else (local dev / local build)                     -> ""
 *
 * Site URL (absolute base for og:image, twitter:image, og:url and share links):
 *   1. NEXT_PUBLIC_SITE_URL
 *   2. CF_PAGES_URL (set automatically by Cloudflare Pages)
 *   3. GitHub Pages URL: https://<owner>.github.io/<repo>
 */

export type DeployEnv = Record<string, string | undefined>;

/** Used when neither GITHUB_REPOSITORY nor the git remote is available. */
export const DEFAULT_REPOSITORY = "GOGOGORIMA/dopyu";

export type SiteUrlSource = "env" | "cloudflare" | "github";

/** "owner/repo" from a GitHub remote URL (https or ssh), or undefined. */
export function parseGitHubRemote(remote: string | undefined): string | undefined {
  if (!remote) return undefined;
  const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(remote.trim());
  return match ? `${match[1]}/${match[2]}` : undefined;
}

function splitRepository(repository: string): { owner: string; name: string } {
  const [owner, name] = repository.split("/");
  return { owner: owner ?? "", name: name ?? "" };
}

const isUserSite = (owner: string, name: string) => name.toLowerCase() === `${owner.toLowerCase()}.github.io`;

/** "/foo/" -> "/foo", "foo" -> "/foo", "/" -> "" */
export function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

/**
 * @param repository "owner/repo" to use when GITHUB_REPOSITORY is not set (e.g. parsed from the git remote)
 */
export function resolveBasePath(env: DeployEnv, repository?: string): string {
  if (env.CF_PAGES || env.NEXT_PUBLIC_BASE_PATH === "") return "";
  if (env.NEXT_PUBLIC_BASE_PATH) return normalizeBasePath(env.NEXT_PUBLIC_BASE_PATH);
  if (env.GITHUB_ACTIONS === "true") {
    const { owner, name } = splitRepository(env.GITHUB_REPOSITORY || repository || DEFAULT_REPOSITORY);
    return name && !isUserSite(owner, name) ? `/${name}` : "";
  }
  return "";
}

export function githubPagesUrl(repository: string): string {
  const { owner, name } = splitRepository(repository);
  const host = `${owner.toLowerCase()}.github.io`;
  return isUserSite(owner, name) ? `https://${host}` : `https://${host}/${name}`;
}

/** Absolute site URL without a trailing slash, and where it came from. */
export function resolveSiteUrl(env: DeployEnv, repository?: string): { url: string; source: SiteUrlSource } {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return { url: explicit.replace(/\/+$/, ""), source: "env" };
  const cloudflare = env.CF_PAGES_URL?.trim();
  if (cloudflare) return { url: cloudflare.replace(/\/+$/, ""), source: "cloudflare" };
  return { url: githubPagesUrl(env.GITHUB_REPOSITORY || repository || DEFAULT_REPOSITORY), source: "github" };
}
