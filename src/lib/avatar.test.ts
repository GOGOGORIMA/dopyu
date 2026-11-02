import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATAR_PRESETS, getPreset, isValidAvatar, presetAvatar } from "./avatar";

describe("avatar values", () => {
  it("offers about ten presets with unique ids", () => {
    assert.ok(AVATAR_PRESETS.length >= 10);
    assert.equal(new Set(AVATAR_PRESETS.map((p) => p.id)).size, AVATAR_PRESETS.length);
  });

  it("accepts presets and small WebP/JPEG data URLs only", () => {
    assert.ok(isValidAvatar(presetAvatar("cat")));
    assert.equal(getPreset("preset:cat")?.emoji, "🐱");
    assert.equal(isValidAvatar("preset:nope"), false);
    assert.ok(isValidAvatar("data:image/webp;base64,UklGRg=="));
    assert.ok(isValidAvatar("data:image/jpeg;base64,/9j/4AAQ"));
    assert.equal(isValidAvatar("data:image/svg+xml;base64,PHN2Zz4="), false);
    assert.equal(isValidAvatar("javascript:alert(1)"), false);
    assert.equal(isValidAvatar(`data:image/webp;base64,${"A".repeat(300_000)}`), false);
  });
});
