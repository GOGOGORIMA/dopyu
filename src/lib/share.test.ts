import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankShareText, recordShareText, toFriendlyUnit, xShareUrl } from "./share";

describe("toFriendlyUnit", () => {
  it("uses the unit for each range", () => {
    assert.equal(toFriendlyUnit(3), "大さじ 約0.2杯分");
    assert.equal(toFriendlyUnit(14.9), "大さじ 約1.0杯分");
    assert.equal(toFriendlyUnit(15), "乳酸菌飲料 約0.23本分");
    assert.equal(toFriendlyUnit(65), "乳酸菌飲料 約1.00本分");
    assert.equal(toFriendlyUnit(100), "栄養ドリンク 約0.8本分");
    assert.equal(toFriendlyUnit(360), "栄養ドリンク 約3.0本分");
    assert.equal(toFriendlyUnit(500), "500mlペットボトル 約1.0本分");
    assert.equal(toFriendlyUnit(1234), "500mlペットボトル 約2.5本分");
  });
});

describe("share texts", () => {
  it("record and rank texts follow the templates", () => {
    assert.equal(
      recordShareText("8分12秒", 3, 570),
      "【DOPYU 記録完了】今回の記録：8分12秒（推定3ml） / 今年の累計：570ml（500mlペットボトル 約1.1本分） #DOPYU #射精ワールドカップ",
    );
    assert.equal(
      rankShareText("年間", "国内", 4, 612.5),
      "【DOPYU 射精競技】現在の年間国内ランキング：第4位！ 総量：612.5ml（500mlペットボトル 約1.2本分） #DOPYU #射精ワールドカップ",
    );
  });

  it("builds an X intent URL", () => {
    const url = new URL(xShareUrl("hello"));
    assert.equal(url.origin + url.pathname, "https://twitter.com/intent/tweet");
    assert.equal(url.searchParams.get("text"), "hello");
  });
});
