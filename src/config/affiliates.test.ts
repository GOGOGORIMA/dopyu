import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AFFILIATES, PROHIBITED_AD_EXPRESSIONS } from "./affiliates";

describe("affiliate copy compliance", () => {
  for (const [lang, slots] of Object.entries(AFFILIATES)) {
    for (const [slot, ad] of Object.entries(slots)) {
      it(`${lang}/${slot} has no medical or efficacy claims`, () => {
        const copy = [ad.eyebrow, ad.title, ad.description, ad.cta].join(" ");
        for (const pattern of PROHIBITED_AD_EXPRESSIONS) {
          assert.doesNotMatch(copy, pattern, `"${copy}" matches ${pattern}`);
        }
      });
    }
  }

  it("the prohibited list catches typical violations", () => {
    const bad = ["精液量が増える", "早漏を改善", "賢者タイム短縮", "Boost your stamina", "Last longer tonight", "Treats ED"];
    for (const text of bad) {
      assert.ok(PROHIBITED_AD_EXPRESSIONS.some((p) => p.test(text)), text);
    }
  });
});
