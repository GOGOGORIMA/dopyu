import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkUsername } from "./username-filter";
import { registerSchema, toFieldErrors } from "./validation";

describe("username filter", () => {
  it("blocks URLs and domains", () => {
    for (const name of ["http_taro", "https-me", "www.taro", "taro.com", "shop.jp_1", "ｔａｒｏ．ｃｏｍ"]) {
      assert.equal(checkUsername(name), "url", name);
    }
  });

  it("blocks e-mail addresses", () => {
    assert.equal(checkUsername("taro@example"), "email");
    assert.equal(checkUsername("taro＠example"), "email");
  });

  it("blocks phone numbers (8+ digits, or 10+ with separators)", () => {
    for (const name of ["taro12345678", "09012345678", "090-1234-5678", "０９０１２３４５６７８"]) {
      assert.equal(checkUsername(name), "phone", name);
    }
  });

  it("blocks offensive words, including kana / case / leetspeak variants", () => {
    for (const name of ["FuckYou", "f_u_c_k", "ﾏﾝｺ", "マンコ大好き", "big_dick", "5h1t", "死ね太郎", "dopyu", "DOPYU公式", "運営スタッフ", "admin"]) {
      assert.equal(checkUsername(name), "ngWord", name);
    }
  });

  it("allows ordinary names (no false positives on common names)", () => {
    for (const name of ["dopyu_taro", "Yamashita", "matsushita_99", "Dickens", "peacock", "analyst", "Sussex_fan", "たろう", "ちんあなご", "jun1994", "ジョン.スミス"]) {
      assert.equal(checkUsername(name), null, name);
    }
  });

  it("is applied by the register schema", () => {
    const base = { email: "a@example.com", password: "password123", birthDate: "1990-01-01", countryCode: "JP" };
    const result = registerSchema.safeParse({ ...base, username: "taro.com" });
    assert.ok(!result.success);
    assert.match(toFieldErrors(result.error).username, /URL/);
    assert.ok(registerSchema.safeParse({ ...base, username: "taro" }).success);
  });
});
