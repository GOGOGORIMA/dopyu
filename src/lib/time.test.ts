import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatClock,
  formatDurationJa,
  getFirstWeekday,
  getMonthRange,
  getYearRange,
  getZonedParts,
  isValidTimeZone,
} from "./time";

describe("getYearRange", () => {
  it("returns the JST year [Jan 1 00:00, next Jan 1 00:00) as UTC instants", () => {
    const { start, end } = getYearRange(2026, "Asia/Tokyo");
    assert.equal(start.toISOString(), "2025-12-31T15:00:00.000Z");
    assert.equal(end.toISOString(), "2026-12-31T15:00:00.000Z");
  });
});

describe("getMonthRange", () => {
  it("handles a DST switch inside the month (New York, March)", () => {
    const { start, end } = getMonthRange(2026, 3, "America/New_York");
    assert.equal(start.toISOString(), "2026-03-01T05:00:00.000Z"); // EST
    assert.equal(end.toISOString(), "2026-04-01T04:00:00.000Z"); // EDT
  });

  it("rolls December over to the next year", () => {
    const { end } = getMonthRange(2026, 12, "UTC");
    assert.equal(end.toISOString(), "2027-01-01T00:00:00.000Z");
  });
});

describe("getZonedParts", () => {
  it("is already New Year in JST", () => {
    assert.deepEqual(getZonedParts(new Date("2026-12-31T15:30:00Z"), "Asia/Tokyo"), {
      year: 2027,
      month: 1,
      day: 1,
      hour: 0,
      minute: 30,
      second: 0,
    });
  });

  it("reports midnight as hour 0 (not 24)", () => {
    assert.equal(getZonedParts(new Date("2026-06-01T00:00:00Z"), "UTC").hour, 0);
  });
});

describe("misc", () => {
  it("isValidTimeZone", () => {
    assert.equal(isValidTimeZone("Asia/Tokyo"), true);
    assert.equal(isValidTimeZone("Not/AZone"), false);
    assert.equal(isValidTimeZone(42), false);
  });

  it("getFirstWeekday: 2026-11-01 is a Sunday", () => {
    assert.equal(getFirstWeekday(2026, 11), 0);
  });

  it("format helpers", () => {
    assert.equal(formatClock(754), "12:34");
    assert.equal(formatClock(3723), "1:02:03");
    assert.equal(formatDurationJa(7), "7秒");
    assert.equal(formatDurationJa(616), "10分16秒");
    assert.equal(formatDurationJa(3720), "1時間2分");
  });
});
