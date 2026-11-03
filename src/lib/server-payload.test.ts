import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SERVER_ENTRY_COLUMNS, SERVER_PROFILE_COLUMNS, fromServerAvatar, toServerEntry, toServerProfile } from "./server-payload";

describe("server payload (privacy whitelist)", () => {
  const localEntry = {
    id: "e1",
    startTime: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:10:00.000Z",
    durationSeconds: 600.4,
    volumeMl: 3.2,
    isRanked: false,
    rankExclusion: "cooldown",
    tags: ["秘密のタグ", "secret sauce"],
  };

  it("entries carry only the competition columns, never tags or start time", () => {
    const row = toServerEntry("u1", localEntry);
    assert.deepEqual(Object.keys(row).sort(), [...SERVER_ENTRY_COLUMNS].sort());
    const json = JSON.stringify(row);
    assert.ok(!json.includes("秘密のタグ") && !json.includes("secret sauce"));
    assert.ok(!json.includes("tags") && !json.includes("start") && !json.includes("cooldown"));
    assert.deepEqual(row, {
      id: "e1",
      user_id: "u1",
      completed_at: "2026-01-01T00:10:00.000Z",
      duration_seconds: 600,
      volume_ml: 3.2,
      is_ranked: false,
    });
  });

  it("profiles carry only user ID, username, country and a preset icon ID", () => {
    const withImage = { id: "u1", username: "taro", countryCode: "JP", avatar: "data:image/webp;base64,AAAA", birthDate: "1990-01-01", email: "a@b.c" };
    const row = toServerProfile(withImage);
    assert.deepEqual(Object.keys(row).sort(), [...SERVER_PROFILE_COLUMNS].sort());
    assert.equal(row.avatar_preset, null, "uploaded images are never sent");
    assert.ok(!JSON.stringify(row).includes("1990"));
    assert.equal(toServerProfile({ ...withImage, avatar: "preset:cat" }).avatar_preset, "cat");
  });

  it("maps preset IDs back and ignores unknown ones", () => {
    assert.equal(fromServerAvatar("cat"), "preset:cat");
    assert.equal(fromServerAvatar("nope"), null);
    assert.equal(fromServerAvatar(null), null);
  });
});
