export const MAX_TAGS_PER_ENTRY = 10;
export const MAX_TAG_LENGTH = 30;

/**
 * Normalizes a tag name: NFKC (full-width letters/digits to half-width), trims, collapses repeated whitespace.
 * Returns null when the result is empty.
 */
export function normalizeTagName(raw: string): string | null {
  const name = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (name.length === 0) return null;
  return Array.from(name).slice(0, MAX_TAG_LENGTH).join("");
}

/** Normalizes every tag and removes duplicates, keeping the original order. */
export function normalizeTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const name = normalizeTagName(value);
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}
