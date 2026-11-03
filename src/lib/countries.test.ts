import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCountryName, getCountryOptions } from "./countries";
import { countryName } from "./i18n-dict";

describe("country names", () => {
  it("China is always 中国 / China (never 'mainland' variants), on every code path", () => {
    assert.equal(getCountryName("CN", "ja"), "中国");
    assert.equal(getCountryName("CN", "en"), "China");
    assert.equal(countryName("CN", "ja"), "中国");
    assert.equal(countryName("CN", "en"), "China");
  });

  it("uses neutral short names for Hong Kong, Macao and Taiwan", () => {
    assert.deepEqual(
      ["HK", "MO", "TW"].map((c) => [getCountryName(c, "ja"), getCountryName(c, "en")]),
      [["香港", "Hong Kong"], ["マカオ", "Macao"], ["台湾", "Taiwan"]],
    );
  });

  it("no country option contains 本土 / mainland / SAR wording", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const { name } of getCountryOptions(lang)) {
        assert.doesNotMatch(name, /本土|mainland|SAR|特別行政区/i, name);
      }
    }
  });
});
