import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCountryRanking, computeUserRanking, RANKING_METRICS } from "./ranking";
import { RANKING_PERIODS } from "./ranking-period";

// No browser storage in Node: the ranking consists of the built-in dummy users only.
const now = new Date("2026-11-05T12:00:00Z"); // Thursday

describe("computeUserRanking", () => {
  for (const period of RANKING_PERIODS) {
    for (const metric of RANKING_METRICS) {
      it(`${period}/${metric}: sorted by score with competition ranks`, () => {
        const r = computeUserRanking("world", metric, period, null, now);
        assert.ok(r.rows.length > 0);
        r.rows.forEach((row, i) => {
          if (i === 0) return assert.equal(row.rank, 1);
          const prev = r.rows[i - 1];
          assert.ok(prev.score >= row.score);
          assert.equal(row.rank, prev.score === row.score ? prev.rank : i + 1);
        });
      });
    }
  }

  it("narrower periods never exceed wider ones", () => {
    const total = (p: (typeof RANKING_PERIODS)[number]) =>
      computeUserRanking("world", "count", p, null, now).rows.reduce((s, r) => s + r.count, 0);
    assert.ok(total("week") <= total("month"));
    assert.ok(total("month") <= total("year"));
    assert.ok(total("year") <= total("all"));
    assert.ok(total("week") > 0);
  });

  it("Japan ranking only contains JP users", () => {
    const r = computeUserRanking("national", "volume", "all", null, now, 100, "JP");
    assert.ok(r.rows.every((row) => row.countryCode === "JP"));
  });

  it("per-day average lets a recent joiner rank high (divided by days since joining)", () => {
    const all = computeUserRanking("world", "average", "all", null, now);
    const newcomer = all.rows.find((r) => r.username === "carioca_br"); // joined 12 days ago
    assert.ok(newcomer);
    assert.ok(newcomer.averagePerDayMl > 0);
    assert.ok(newcomer.rank <= Math.ceil(all.rows.length / 2));
  });
});

describe("computeCountryRanking", () => {
  it("average = total volume / participating members", () => {
    const r = computeCountryRanking("average", "year", null, now);
    for (const row of r.rows.filter((x) => x.activeMemberCount > 0)) {
      assert.ok(Math.abs(row.averageVolumeMl - row.totalVolumeMl / row.activeMemberCount) < 0.06);
    }
    assert.ok(r.rows.every((row, i) => i === 0 || r.rows[i - 1].score >= row.score));
  });
});
