import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTagList, normalizeTagName } from "./tags";
import { createEntrySchema, registerSchema, toFieldErrors } from "./validation";

const nowIso = () => new Date().toISOString();

describe("tag normalization", () => {
  it("NFKC, trims and collapses whitespace", () => {
    assert.equal(normalizeTagName("  ＡＳＭＲ　 動画 "), "ASMR 動画");
    assert.equal(normalizeTagName("   "), null);
  });

  it("removes duplicates, keeping order", () => {
    assert.deepEqual(normalizeTagList(["動画", "妄想", "動画", " 妄想 "]), ["動画", "妄想"]);
  });
});

describe("createEntrySchema", () => {
  it("accepts a valid entry", () => {
    const result = createEntrySchema.safeParse({
      completedAt: nowIso(),
      durationSeconds: 600,
      tags: ["動画", "動画", "ＶＲ"],
    });
    assert.ok(result.success);
    assert.deepEqual(result.data.tags, ["動画", "VR"]);
  });

  it("accepts entries under 10 seconds (they are only excluded from rankings)", () => {
    assert.ok(createEntrySchema.safeParse({ completedAt: nowIso(), durationSeconds: 3 }).success);
  });

  it("rejects future times, times older than 7 days, durations over 24h, and more than 10 tags", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(createEntrySchema.safeParse({ completedAt: future, durationSeconds: 60 }).success, false);
    assert.equal(createEntrySchema.safeParse({ completedAt: old, durationSeconds: 60 }).success, false);
    assert.equal(createEntrySchema.safeParse({ completedAt: nowIso(), durationSeconds: 90000 }).success, false);
    const tooMany = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    assert.equal(createEntrySchema.safeParse({ completedAt: nowIso(), durationSeconds: 60, tags: tooMany }).success, false);
  });
});

describe("registerSchema", () => {
  const valid = {
    email: " Taro@Example.COM ",
    password: "password123",
    username: "dopyu_taro",
    birthDate: "1994-06-15",
    countryCode: "jp",
  };

  it("normalizes email and country code", () => {
    const result = registerSchema.safeParse(valid);
    assert.ok(result.success);
    assert.equal(result.data.email, "taro@example.com");
    assert.equal(result.data.countryCode, "JP");
    assert.equal(result.data.birthDate.toISOString(), "1994-06-15T00:00:00.000Z");
  });

  it("rejects under-18s, nonexistent country codes, and usernames with spaces", () => {
    const thisYear = new Date().getUTCFullYear();
    const cases = [
      { ...valid, birthDate: `${thisYear - 17}-01-01` },
      { ...valid, countryCode: "ZZ" },
      { ...valid, username: "taro yamada" },
    ];
    for (const input of cases) {
      const result = registerSchema.safeParse(input);
      assert.equal(result.success, false);
    }
  });

  it("toFieldErrors returns messages per field", () => {
    const result = registerSchema.safeParse({ ...valid, email: "nope", password: "short" });
    assert.equal(result.success, false);
    const errors = toFieldErrors(result.error!);
    assert.ok(errors.email);
    assert.ok(errors.password);
  });
});
