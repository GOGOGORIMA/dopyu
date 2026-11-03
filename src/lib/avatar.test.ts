import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATAR_PRESETS, getPreset, isValidAvatar, presetAvatar, sanitizeAvatar } from "./avatar";

describe("avatar values", () => {
  it("offers about ten presets with unique ids", () => {
    assert.ok(AVATAR_PRESETS.length >= 10);
    assert.equal(new Set(AVATAR_PRESETS.map((p) => p.id)).size, AVATAR_PRESETS.length);
  });

  it("accepts built-in presets only (no uploaded images)", () => {
    assert.ok(isValidAvatar(presetAvatar("cat")));
    assert.equal(getPreset("preset:cat")?.emoji, "🐱");
    assert.equal(isValidAvatar("preset:nope"), false);
    assert.equal(isValidAvatar("data:image/webp;base64,UklGRg=="), false);
    assert.equal(isValidAvatar("data:image/jpeg;base64,/9j/4AAQ"), false);
    assert.equal(isValidAvatar("https://example.com/me.png"), false);
    assert.equal(isValidAvatar("javascript:alert(1)"), false);
  });

  it("drops legacy uploaded images when reading stored values", () => {
    assert.equal(sanitizeAvatar("data:image/webp;base64,UklGRg=="), null);
    assert.equal(sanitizeAvatar("preset:fox"), "preset:fox");
    assert.equal(sanitizeAvatar(undefined), null);
  });
});
