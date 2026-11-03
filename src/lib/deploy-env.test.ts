import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { githubPagesUrl, normalizeBasePath, parseGitHubRemote, resolveBasePath, resolveSiteUrl } from "./deploy-env";
import { absoluteUrl, withBasePath } from "./site";

describe("basePath detection", () => {
  it("Cloudflare Pages and an explicit empty NEXT_PUBLIC_BASE_PATH serve from the root", () => {
    assert.equal(resolveBasePath({ CF_PAGES: "1", GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "o/dopyu" }), "");
    assert.equal(resolveBasePath({ NEXT_PUBLIC_BASE_PATH: "", GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "o/dopyu" }), "");
  });

  it("GitHub Actions uses /<repo> (root for a <owner>.github.io user site)", () => {
    assert.equal(resolveBasePath({ GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "GOGOGORIMA/dopyu" }), "/dopyu");
    assert.equal(resolveBasePath({ GITHUB_ACTIONS: "true" }, "me/other-repo"), "/other-repo");
    assert.equal(resolveBasePath({ GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "Me/me.github.io" }), "");
  });

  it("local builds and dev use no basePath", () => {
    assert.equal(resolveBasePath({}), "");
    assert.equal(resolveBasePath({ GITHUB_ACTIONS: "false" }, "GOGOGORIMA/dopyu"), "");
  });

  it("a non-empty NEXT_PUBLIC_BASE_PATH is used as an explicit override", () => {
    assert.equal(resolveBasePath({ NEXT_PUBLIC_BASE_PATH: "app/" }), "/app");
    assert.equal(normalizeBasePath("/"), "");
  });
});

describe("site URL detection", () => {
  it("prefers NEXT_PUBLIC_SITE_URL, then CF_PAGES_URL, then GitHub Pages", () => {
    assert.deepEqual(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://dopyu.example/", CF_PAGES_URL: "https://x.pages.dev" }), {
      url: "https://dopyu.example",
      source: "env",
    });
    assert.deepEqual(resolveSiteUrl({ CF_PAGES_URL: "https://abc.dopyu.pages.dev" }), {
      url: "https://abc.dopyu.pages.dev",
      source: "cloudflare",
    });
    assert.deepEqual(resolveSiteUrl({ GITHUB_REPOSITORY: "GOGOGORIMA/dopyu" }), {
      url: "https://gogogorima.github.io/dopyu",
      source: "github",
    });
    assert.equal(resolveSiteUrl({}, "me/me.github.io").url, "https://me.github.io");
    assert.equal(githubPagesUrl("A/b"), "https://a.github.io/b");
  });

  it("parses https and ssh GitHub remotes", () => {
    assert.equal(parseGitHubRemote("https://github.com/GOGOGORIMA/dopyu"), "GOGOGORIMA/dopyu");
    assert.equal(parseGitHubRemote("git@github.com:GOGOGORIMA/dopyu.git\n"), "GOGOGORIMA/dopyu");
    assert.equal(parseGitHubRemote("https://gitlab.com/a/b"), undefined);
  });
});

describe("path helpers", () => {
  it("prefix public files with the basePath and keep the site URL's path", () => {
    assert.equal(withBasePath("/icon.png", "/dopyu"), "/dopyu/icon.png");
    assert.equal(withBasePath("icon.png", ""), "/icon.png");
    assert.equal(absoluteUrl("/ogp.png", "https://gogogorima.github.io/dopyu"), "https://gogogorima.github.io/dopyu/ogp.png");
    assert.equal(absoluteUrl("/ogp.png", "https://dopyu.pages.dev/"), "https://dopyu.pages.dev/ogp.png");
  });
});
