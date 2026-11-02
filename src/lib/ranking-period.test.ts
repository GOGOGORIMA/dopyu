import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elapsedDays, formatCountdown, getPeriodRange, mondayOf } from "./ranking-period";

const TZ = "Asia/Tokyo";
/** Wall-clock time in JST as a UTC instant */
const jst = (y: number, m: number, d: number, hh = 0, mm = 0) => new Date(Date.UTC(y, m - 1, d, hh - 9, mm));

describe("mondayOf ((day + 6) % 7)", () => {
  it("maps every weekday to the Monday that starts its week", () => {
    // 2026-11-02 is a Monday
    assert.deepEqual(mondayOf(2026, 11, 2), { year: 2026, month: 11, day: 2 });
    assert.deepEqual(mondayOf(2026, 11, 7), { year: 2026, month: 11, day: 2 }); // Saturday
    assert.deepEqual(mondayOf(2026, 11, 8), { year: 2026, month: 11, day: 2 }); // Sunday -> previous Monday
    assert.deepEqual(mondayOf(2026, 11, 1), { year: 2026, month: 10, day: 26 }); // Sunday across a month
    assert.deepEqual(mondayOf(2027, 1, 1), { year: 2026, month: 12, day: 28 }); // across a year
  });
});

describe("getPeriodRange (JST)", () => {
  it("week starts Monday 00:00 and resets the next Monday 00:00, also on Sunday", () => {
    const sunday = getPeriodRange("week", jst(2026, 11, 8, 23, 59), TZ);
    assert.equal(sunday.start?.toISOString(), jst(2026, 11, 2).toISOString());
    assert.equal(sunday.nextReset?.toISOString(), jst(2026, 11, 9).toISOString());
    const mondayMidnight = getPeriodRange("week", jst(2026, 11, 9, 0, 0), TZ);
    assert.equal(mondayMidnight.start?.toISOString(), jst(2026, 11, 9).toISOString());
  });

  it("month and year start at 00:00 on the 1st", () => {
    const month = getPeriodRange("month", jst(2026, 12, 15, 10), TZ);
    assert.equal(month.start?.toISOString(), jst(2026, 12, 1).toISOString());
    assert.equal(month.nextReset?.toISOString(), jst(2027, 1, 1).toISOString());
    const year = getPeriodRange("year", jst(2026, 6, 1), TZ);
    assert.equal(year.start?.toISOString(), jst(2026, 1, 1).toISOString());
    assert.equal(year.nextReset?.toISOString(), jst(2027, 1, 1).toISOString());
  });

  it("all-time has no start and no reset", () => {
    assert.deepEqual(getPeriodRange("all", jst(2026, 6, 1), TZ), { key: "all", start: null, nextReset: null });
  });
});

describe("helpers", () => {
  it("formatCountdown", () => {
    assert.equal(formatCountdown(((3 * 24 + 5) * 60 + 30) * 60_000), "あと3日5時間");
    assert.equal(formatCountdown((5 * 60 + 12) * 60_000), "あと5時間12分");
    assert.equal(formatCountdown(42 * 60_000), "あと42分");
  });

  it("elapsedDays is at least 1", () => {
    assert.equal(elapsedDays(0, 1000), 1);
    assert.equal(elapsedDays(0, 2.5 * 86_400_000), 3);
  });
});
