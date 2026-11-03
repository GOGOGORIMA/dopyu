/**
 * Username safety filter: blocks personal information (URLs, e-mail addresses, phone numbers),
 * offensive / obscene words, and names that impersonate the operator.
 * Runs on the NFKC-normalized username (full-width characters are already folded to ASCII).
 */

/** Error messages (Japanese; translated for display by src/lib/i18n-dict.ts). */
export const USERNAME_FILTER_MESSAGES = {
  url: "URLやドメイン（http, .com など）はユーザーネームに使えません",
  email: "メールアドレスはユーザーネームに使えません",
  phone: "電話番号のような数字（8桁以上）はユーザーネームに使えません",
  ngWord: "使用できない言葉が含まれています。別のユーザーネームにしてください",
} as const;

export type UsernameFilterReason = keyof typeof USERNAME_FILTER_MESSAGES;

const URL_PATTERN =
  /https?|www\.|:\/\/|\.(?:com|net|org|info|biz|jp|co|io|me|ai|app|dev|xyz|tv|ly|gg|to|cc|us|uk|link|site|online|club|top|shop|live|fun|vip|tk)(?:$|[^a-z])/i;

const EMAIL_PATTERN = /@|＠|[a-z0-9._-]+\s*(?:\(at\)|\[at\])\s*[a-z0-9-]+/i;

/** 8+ consecutive digits, or a phone-like run of 10+ digits split by - _ . (e.g. 090-1234-5678). */
const PHONE_PATTERNS = [/\d{8,}/, /(?:\d[-_.]?){10,}/];

/**
 * Words matched anywhere in the name (after folding case / kana / separators / leetspeak).
 * Only distinctive words go here, so ordinary names are not caught by accident.
 */
const NG_SUBSTRINGS = [
  // English: obscene / slurs / violence
  // ("shit" is a whole-word token below: it appears inside Japanese names such as Yamashita)
  "fuck", "bullshit", "cunt", "bitch", "whore", "pussy", "porn", "nigger", "nigga", "faggot", "retard",
  "rapist", "pedophile", "paedophile", "molest", "hitler", "killyou",
  // Japanese: obscene / sexual crimes / violence / slurs
  "まんこ", "ちんこ", "ちんぽ", "ちんちん", "せっくす", "おめこ", "ふぇらちお", "れいぷ", "ごうかん", "強姦",
  "痴漢", "盗撮", "児童ぽるの", "ろりこん", "援交", "援助交際", "ぱぱかつ", "売春", "買春", "死ね", "殺す",
  "ぶっころ", "きちがい", "気違い", "池沼", "がいじ",
  // Operator impersonation
  "公式", "運営", "管理人", "official", "administrator",
];

/** Short words matched only as a whole segment (split by _ . -), e.g. "big_dick" but not "dickens". */
const NG_TOKENS = new Set([
  "sex", "shit", "dick", "cock", "cum", "anal", "rape", "pedo", "nazi", "kill", "kys", "slut", "tits", "fag", "nig",
  "admin", "staff", "support", "moderator", "mod", "system", "root",
  "ちん", "まん",
]);

/** Names reserved for the operator as a whole (e.g. "DOPYU" itself; "dopyu_taro" is fine). */
const RESERVED_NAMES = new Set(["dopyu", "dopyuofficial", "dopyuadmin", "dopyustaff", "dopyusupport"]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "$": "s", "@": "a" };

/** Lower case, katakana -> hiragana, and leetspeak folded to letters. */
function fold(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[013457$@]/g, (ch) => LEET[ch] ?? ch);
}

export function containsNgWord(username: string): boolean {
  const folded = fold(username);
  const joined = folded.replace(/[\s_.\-ー・]/g, "");
  if (NG_SUBSTRINGS.some((word) => joined.includes(fold(word)))) return true;
  const segments = folded.split(/[\s_.\-・]+/).filter(Boolean);
  return segments.some((segment) => NG_TOKENS.has(segment)) || NG_TOKENS.has(joined) || RESERVED_NAMES.has(joined);
}

/** Returns why the username is not allowed, or null when it passes the filter. */
export function checkUsername(username: string): UsernameFilterReason | null {
  const value = username.normalize("NFKC");
  if (EMAIL_PATTERN.test(value)) return "email";
  if (URL_PATTERN.test(value)) return "url";
  if (PHONE_PATTERNS.some((pattern) => pattern.test(value))) return "phone";
  if (containsNgWord(value)) return "ngWord";
  return null;
}
