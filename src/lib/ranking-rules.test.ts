import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignRankingInOrder, getRankingStatus, judgeRanking } from "./ranking-rules";

const TZ = "Asia/Tokyo";
/** 2026-03-10 hh:mm in JST */
const jst = (hh: number, mm = 0, day = 10) => new Date(Date.UTC(2026, 2, day, hh - 9, mm));
const ranked = (d: Date) => ({ completedAt: d.toISOString(), isRanked: true });

describe("judgeRanking", () => {
  it("ranks a normal entry, with no minimum duration", () => {
    assert.deepEqual(judgeRanking([], jst(22), 5, TZ), { isRanked: true, reason: null });
  });

  it("over 120 min (7200 s) -> My Page only; exactly 7200 s is still ranked", () => {
    assert.deepEqual(judgeRanking([], jst(22), 7201, TZ), { isRanked: false, reason: "over_120min" });
    assert.equal(judgeRanking([], jst(22), 7200, TZ).isRanked, true);
  });

  it("within 30 min of the previous entry -> cooldown", () => {
    assert.equal(judgeRanking([ranked(jst(21, 40))], jst(22, 10), 300, TZ).reason, "cooldown");
    assert.equal(judgeRanking([ranked(jst(21, 39))], jst(22, 10), 300, TZ).isRanked, true);
    // A My-Page-only previous entry also starts a cooldown
    const unranked = { completedAt: jst(22).toISOString(), isRanked: false };
    assert.equal(judgeRanking([unranked], jst(22, 20), 300, TZ).reason, "cooldown");
  });

  it("6th ranked entry of the same day -> daily limit; the next day resets", () => {
    const five = [1, 3, 5, 7, 9].map((h) => ranked(jst(h)));
    assert.equal(judgeRanking(five, jst(20), 300, TZ).reason, "daily_limit");
    assert.equal(judgeRanking(five, jst(0, 30, 11), 300, TZ).isRanked, true);
  });
});

describe("assignRankingInOrder", () => {
  it("applies cooldown and the 5-per-day cap chronologically", () => {
    const sessions = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ completedAt: jst(10 + i), durationSeconds: 300 }));
    sessions.push({ completedAt: jst(10, 10), durationSeconds: 300 }); // 10 min after the first
    const result = assignRankingInOrder(sessions, TZ);
    assert.equal(result.filter((r) => r.isRanked).length, 5);
    assert.equal(result[1].reason, "cooldown");
    assert.equal(result.at(-1)?.reason, "daily_limit");
  });
});

describe("getRankingStatus", () => {
  it("reports remaining cooldown and today's ranked count", () => {
    const status = getRankingStatus([ranked(jst(22))], jst(22, 10), TZ);
    assert.equal(status.cooldownRemainingSeconds, 20 * 60);
    assert.equal(status.rankedToday, 1);
    assert.equal(status.dailyLimitReached, false);
  });
});
