import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAge, estimateVolumeMl, estimateVolumeMlByAge } from "./volume";

describe("estimateVolumeMlByAge (age bracket to estimated volume)", () => {
  const cases: [age: number, ml: number][] = [
    [18, 3.5],
    [29, 3.5],
    [30, 3.0],
    [39, 3.0],
    [40, 2.5],
    [49, 2.5],
    [50, 2.0],
    [59, 2.0],
    [60, 1.5],
    [90, 1.5],
  ];
  for (const [age, ml] of cases) {
    it(`${age}歳 → ${ml}ml`, () => assert.equal(estimateVolumeMlByAge(age), ml));
  }
});

describe("calculateAge", () => {
  const birth = new Date("1996-11-02T00:00:00.000Z");

  it("is still 29 the day before the 30th birthday (JST)", () => {
    assert.equal(calculateAge(birth, new Date("2026-11-01T14:59:59Z"), "Asia/Tokyo"), 29);
  });

  it("turns 30 at 00:00 JST on the birthday", () => {
    assert.equal(calculateAge(birth, new Date("2026-11-01T15:00:00Z"), "Asia/Tokyo"), 30);
  });

  it("handles a Feb 29 birthday", () => {
    const leap = new Date("2000-02-29T00:00:00.000Z");
    assert.equal(calculateAge(leap, new Date("2026-02-28T03:00:00Z"), "UTC"), 25);
    assert.equal(calculateAge(leap, new Date("2026-03-01T03:00:00Z"), "UTC"), 26);
  });
});

describe("estimateVolumeMl (birth date and instant to estimated volume)", () => {
  it("drops from 3.5ml to 3.0ml on the 30th birthday", () => {
    const birth = new Date("1996-11-02T00:00:00.000Z");
    assert.equal(estimateVolumeMl(birth, new Date("2026-11-01T14:59:59Z")), 3.5);
    assert.equal(estimateVolumeMl(birth, new Date("2026-11-01T15:00:00Z")), 3.0);
  });
});
