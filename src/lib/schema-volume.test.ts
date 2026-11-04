import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { VOLUME_BRACKETS } from "./volume";

/** The server trigger (supabase/schema.sql) must use the same brackets as the app. */
describe("server volume trigger", () => {
  const sql = readFileSync(new URL("../../supabase/schema.sql", import.meta.url), "utf8");
  const start = sql.indexOf("create or replace function public.enforce_record_rules");
  const trigger = sql.slice(start, sql.indexOf("drop trigger if exists records_enforce_rules", start));

  it("matches VOLUME_BRACKETS in src/lib/volume.ts", () => {
    const whens = [...trigger.matchAll(/when years <= (\d+) then ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const otherwise = Number(/else ([\d.]+)/.exec(trigger)?.[1]);
    const expected = VOLUME_BRACKETS.filter((b) => Number.isFinite(b.maxAge)).map((b) => [b.maxAge, b.volumeMl]);
    assert.deepEqual(whens, expected);
    assert.equal(otherwise, VOLUME_BRACKETS[VOLUME_BRACKETS.length - 1].volumeMl);
  });

  it("computes age in UTC, like the client (APP_TIME_ZONE)", () => {
    assert.ok(trigger.length > 0, "trigger function not found");
    assert.match(trigger, /completed_at at time zone 'UTC'/);
  });

  it("uses the same ranking limits as src/lib/constants.ts", async () => {
    const c = await import("./constants");
    assert.match(trigger, new RegExp(`duration_sec > ${c.RANKING_MAX_DURATION_SECONDS}\\b`));
    assert.match(trigger, new RegExp(`interval '${c.RANKING_COOLDOWN_SECONDS} seconds'`));
    assert.match(trigger, new RegExp(`ranked_today >= ${c.RANKING_DAILY_LIMIT}\\b`));
    assert.match(sql, new RegExp(`duration_sec >= ${c.MIN_DURATION_SECONDS} and duration_sec <= ${c.MAX_DURATION_SECONDS}`));
  });
});
