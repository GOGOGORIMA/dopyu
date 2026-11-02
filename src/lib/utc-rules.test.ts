import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPeriodRange } from "./ranking-period";
import { getRankingStatus, judgeRanking, rankingDayKey } from "./ranking-rules";
import { rankShareText, recordShareText, toFriendlyUnit } from "./share";
import { APP_TIME_ZONE } from "./time";

describe("competition rules use UTC", () => {
  it("APP_TIME_ZONE is UTC", () => assert.equal(APP_TIME_ZONE, "UTC"));

  it("week starts Monday 00:00 UTC (= 09:00 JST), month/year at 00:00 UTC", () => {
    // Monday 2026-11-02 08:59 JST is still Sunday in UTC -> previous week
    const beforeReset = getPeriodRange("week", new Date("2026-11-01T23:59:00Z"));
    assert.equal(beforeReset.start?.toISOString(), "2026-10-26T00:00:00.000Z");
    assert.equal(beforeReset.nextReset?.toISOString(), "2026-11-02T00:00:00.000Z");
    const month = getPeriodRange("month", new Date("2026-11-15T12:00:00Z"));
    assert.equal(month.start?.toISOString(), "2026-11-01T00:00:00.000Z");
    const year = getPeriodRange("year", new Date("2026-06-01T00:00:00Z"));
    assert.equal(year.start?.toISOString(), "2026-01-01T00:00:00.000Z");
  });

  it("the 5-per-day limit counts per UTC day", () => {
    // 5 ranked entries on 2026-03-10 UTC, spaced 1 hour apart
    const five = [1, 3, 5, 7, 9].map((h) => ({ completedAt: new Date(Date.UTC(2026, 2, 10, h)).toISOString(), isRanked: true }));
    assert.equal(judgeRanking(five, new Date(Date.UTC(2026, 2, 10, 20)), 300).reason, "daily_limit");
    // 00:30 UTC next day is a new day, even though it is the same JST date (09:30 JST)
    assert.equal(judgeRanking(five, new Date(Date.UTC(2026, 2, 11, 0, 30)), 300).isRanked, true);
    assert.equal(rankingDayKey(new Date("2026-03-10T23:59:59Z")), "2026-3-10");
    assert.equal(getRankingStatus(five, new Date(Date.UTC(2026, 2, 10, 22))).dailyLimitReached, true);
  });
});

describe("English share texts", () => {
  it("uses US-style units", () => {
    assert.equal(toFriendlyUnit(3, "en"), "approx. 0.2 tbsp");
    assert.equal(toFriendlyUnit(44, "en"), "approx. 1.00 Shot Glasses");
    assert.equal(toFriendlyUnit(250, "en"), "approx. 1.00 Energy Drink Cans");
    assert.equal(toFriendlyUnit(946, "en"), "approx. 2.00 Pint Glasses");
  });

  it("follows the templates", () => {
    assert.equal(
      recordShareText("8m 12s", 3, 66, "en"),
      "[DOPYU Recorded] Session: 8m 12s (Est. 3.0ml) | Yearly Total: 66ml (approx. 1.50 Shot Glasses) #DOPYU #NutWorldCup",
    );
    assert.equal(
      rankShareText("Yearly", "National", 4, 612.5, "en"),
      "[DOPYU Championship] Current Yearly National Rank: #4! Total Volume: 612.5ml (approx. 1.29 Pint Glasses) #DOPYU #NutWorldCup",
    );
  });
});
