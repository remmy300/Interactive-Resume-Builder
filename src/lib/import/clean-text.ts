/** Cleans extracted text before parsing: page furniture, rules and double spacing. */
import { BULLET_START, hasText, isHeading } from "./patterns";
import { DATE_RANGE_PATTERN, isDecorationLine } from "./validate";

/**
 * Cleans layout noise out of extracted text before it is parsed:
 * - "Page 1 of 2" footers and the running header that repeats the name on every
 *   page, which otherwise end up inside whichever section they interrupt;
 * - the blank line Word leaves between every paragraph, which would make each
 *   bullet look like its own entry.
 */
export function prepareText(text: string): string {
  const lines = text.split("\n");
  const firstLine = lines.find(hasText)?.trim().toLowerCase();
  const repeats = firstLine
    ? lines.filter((line) => line.trim().toLowerCase() === firstLine).length
    : 0;
  // A repeated first line that is not a name ("C2 - Safaricom Internal") is a
  // page header or footer: every copy goes. A repeated name keeps its first copy.
  const isRunningNote =
    repeats >= 2 && !/^\p{L}[\p{L} .'’-]{1,59}$/u.test(firstLine ?? "");
  let seenFirst = false;
  const kept = lines.filter((line) => {
    const value = line.trim();
    if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(value)) return false;
    // Horizontal rules and ornaments ("_______", "─────", "* * *") carry no text.
    if (isDecorationLine(value)) return false;
    if (firstLine && value.toLowerCase() === firstLine) {
      if (isRunningNote) return false;
      if (seenFirst) return false;
      seenFirst = true;
    }
    return true;
  });

  const filled = kept.filter(hasText).length;
  const touching = kept.filter(
    (line, index) => hasText(line) && hasText(kept[index + 1] ?? ""),
  ).length;
  const doubleSpaced = filled >= 8 && touching < filled * 0.25;
  return (doubleSpaced ? kept.filter(hasText) : kept).join("\n");
}

/**
 * Joins the text of each PDF page into one string, dropping what repeats at the
 * top or bottom of several pages
 */
export function joinPdfPages(pages: string[]): string {
  if (pages.length < 2) return pages.join("\n");

  const edges = pages.map((page) => {
    const lines = page
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return new Set(
      [lines[0], lines[lines.length - 1]].filter((line): line is string =>
        Boolean(line),
      ),
    );
  });
  const counts = new Map<string, number>();
  for (const edge of edges) {
    for (const line of edge) counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const running = new Set(
    [...counts.entries()]
      .filter(
        ([line, count]) =>
          count >= 2 &&
          line.length <= 80 &&
          !BULLET_START.test(line) &&
          !DATE_RANGE_PATTERN.test(line) &&
          isHeading(line) === null,
      )
      .map(([line]) => line),
  );

  return pages
    .map((page, index) =>
      page
        .split("\n")
        .filter((line) => {
          const value = line.trim();
          if (!running.has(value)) return true;
          const isName = /^\p{L}[\p{L} .'’-]{1,59}$/u.test(value);
          return isName && index === 0;
        })
        .join("\n"),
    )
    .join("\n");
}
