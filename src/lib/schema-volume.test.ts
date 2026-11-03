import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { VOLUME_BRACKETS } from "./volume";

/** The server trigger (supabase/schema.sql) must use the same brackets as the app. */
describe("server volume trigger", () => {
  const sql = readFileSync(new URL("../../supabase/schema.sql", import.meta.url), "utf8");
  const trigger = sql.slice(sql.indexOf("function public.set_record_volume"), sql.indexOf("drop trigger if exists records_set_volume"));

  it("matches VOLUME_BRACKETS in src/lib/volume.ts", () => {
    const whens = [...trigger.matchAll(/when years <= (\d+) then ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const otherwise = Number(/else ([\d.]+)/.exec(trigger)?.[1]);
    const expected = VOLUME_BRACKETS.filter((b) => Number.isFinite(b.maxAge)).map((b) => [b.maxAge, b.volumeMl]);
    assert.deepEqual(whens, expected);
    assert.equal(otherwise, VOLUME_BRACKETS[VOLUME_BRACKETS.length - 1].volumeMl);
  });

  it("computes age in UTC, like the client (APP_TIME_ZONE)", () => {
    assert.match(trigger, /completed_at at time zone 'UTC'/);
  });
});
