import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTagList, normalizeTagName } from "./tags";
import { createEntrySchema, registerSchema, toFieldErrors } from "./validation";

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
  /** Builds an input whose timestamps are consistent: finished now, measured + paused = elapsed. */
  const entry = (durationSeconds: number, pausedSeconds = 0, extra: Record<string, unknown> = {}) => {
    const end = Date.now();
    return {
      startTime: new Date(end - (durationSeconds + pausedSeconds) * 1000).toISOString(),
      completedAt: new Date(end).toISOString(),
      durationSeconds,
      pausedSeconds,
      tags: ["動画"],
      ...extra,
    };
  };

  it("accepts a valid entry (with pauses) and normalizes tags", () => {
    const result = createEntrySchema.safeParse(entry(600, 120, { tags: ["動画", "動画", "ＶＲ"] }));
    assert.ok(result.success);
    assert.deepEqual(result.data.tags, ["動画", "VR"]);
  });

  it("has no minimum duration", () => {
    assert.ok(createEntrySchema.safeParse(entry(3)).success);
  });

  it("requires at least one tag", () => {
    assert.equal(createEntrySchema.safeParse(entry(600, 0, { tags: [] })).success, false);
    assert.equal(createEntrySchema.safeParse(entry(600, 0, { tags: ["   "] })).success, false);
  });

  it("rejects tampered measurements (displayed time does not match the real elapsed time)", () => {
    // Real elapsed 60 s but the stopwatch claims 3600 s
    const tampered = { ...entry(60), durationSeconds: 3600 };
    assert.equal(createEntrySchema.safeParse(tampered).success, false);
    // Paused time that does not add up
    const wrongPause = { ...entry(600, 300), pausedSeconds: 0 };
    assert.equal(createEntrySchema.safeParse(wrongPause).success, false);
    // A small clock rounding gap is fine
    assert.ok(createEntrySchema.safeParse({ ...entry(600), durationSeconds: 601 }).success);
  });

  it("rejects future times and times older than 7 days", () => {
    const future = { ...entry(60), completedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    assert.equal(createEntrySchema.safeParse(future).success, false);
    const oldEnd = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const old = {
      ...entry(60),
      startTime: new Date(oldEnd - 60_000).toISOString(),
      completedAt: new Date(oldEnd).toISOString(),
    };
    assert.equal(createEntrySchema.safeParse(old).success, false);
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
