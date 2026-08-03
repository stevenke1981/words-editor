export interface EditMetrics {
  added: number;
  deleted: number;
  retentionPercent: number;
  rewritePercent: number;
}

/**
 * Calculate a compact, deterministic edit summary from the previous and next
 * plain-text versions of a chapter. Counts are Unicode code points so CJK
 * characters and emoji are not split in the middle of a surrogate pair.
 */
export function calculateEditMetrics(previous: string, next: string): EditMetrics {
  const before = Array.from(previous);
  const after = Array.from(next);
  let prefix = 0;

  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix += 1;
  }

  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > prefix && afterEnd > prefix && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const deleted = beforeEnd - prefix;
  const added = afterEnd - prefix;
  const retentionPercent =
    before.length === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round(((before.length - deleted) / before.length) * 100)));
  const changed = added + deleted;
  const rewritePercent = Math.max(
    0,
    Math.min(100, Math.round((changed / Math.max(before.length, after.length, 1)) * 100)),
  );

  return { added, deleted, retentionPercent, rewritePercent };
}
