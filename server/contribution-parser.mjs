const CELL_RE =
  /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>\s*<\/td>\s*<tool-tip[^>]*>([^<]*)<\/tool-tip>/g;
const COUNT_RE = /(\d+)\s+contribution/i;
const FROM_RE = /data-from="(\d{4}-\d{2}-\d{2})/;
const TO_RE = /data-to="(\d{4}-\d{2}-\d{2})/;

/**
 * Parse GitHub's contributions calendar markup into the API response shape.
 *
 * @param {string} html
 * @param {string} username
 */
export function parseContributions(html, username) {
  const days = [];
  const levelCounts = [0, 0, 0, 0, 0];
  let total = 0;

  CELL_RE.lastIndex = 0;
  let match;
  while ((match = CELL_RE.exec(html)) !== null) {
    const [, date, levelRaw, tooltip] = match;
    const level = Number(levelRaw);
    const countMatch = COUNT_RE.exec(tooltip);
    const count = countMatch ? Number(countMatch[1]) : 0;

    days.push({ date, count, level });
    levelCounts[level] += 1;
    total += count;
  }

  const fromMatch = FROM_RE.exec(html);
  const toMatch = TO_RE.exec(html);
  const from = fromMatch ? fromMatch[1] : days[0]?.date ?? '';
  const to = toMatch ? toMatch[1] : days[days.length - 1]?.date ?? '';

  return { username, from, to, days, total, levelCounts };
}
