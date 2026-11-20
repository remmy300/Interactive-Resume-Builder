/** Matches hyperlinks to the lines and blocks that carry them. */
import { type LinkRef } from "../import-links";
import { hasText, stripBullet } from "./patterns";

export const normalizeLinkRefs = (links: Array<string | LinkRef>): LinkRef[] =>
  links
    .map((link) => (typeof link === "string" ? { url: link, label: "" } : link))
    .filter((link) => link.url.toLowerCase().startsWith("http"));

/** Invisible symbol-font bullets and zero-width characters inside extracted text. */
export const HIDDEN_CHARS = new RegExp(
  "[\\uE000-\\uF8FF\\u200B-\\u200D\\uFEFF\\s]+",
  "g",
);

/**
 * Matches each hyperlink to the line carrying its visible words ("Live Demo",
 * "GitHub"), walking forward through the document in reading order.
 */
export function assignLinksToLines(
  lines: string[],
  links: LinkRef[],
): Map<number, string[]> {
  // Compare without whitespace: PDF text and link text space words differently.
  // Symbol-font bullets are invisible private-use characters in the link text.
  const squash = (value: string) =>
    value
      .replace(HIDDEN_CHARS, "")
      .replace(/^[-•*▪◦●]+/, "")
      .toLowerCase();
  const squashed = lines.map(squash);
  const byLine = new Map<number, string[]>();
  const labelsOnLine = new Map<number, Set<string>>();
  let cursor = 0;
  let lastKey: string | undefined;
  let lastIndex = -1;

  for (const link of links) {
    const label = squash(link.label);
    if (!label) continue;

    let index: number;
    if (link.lineKey && link.lineKey === lastKey && lastIndex >= 0) {
      // Another link on the line we just matched ("Live Demo | Github").
      index = lastIndex;
    } else {
      // A caption repeated for each project ("Live Demo | Github") must move on
      // to the next occurrence instead of matching the same line again.
      const free = (position: number) =>
        position >= cursor && !labelsOnLine.get(position)?.has(label);
      // Prefer the line that is exactly this caption ("Github") over a longer
      // one that merely contains it ("Live Demo | Github").
      index = squashed.findIndex(
        (line, position) => free(position) && line === label,
      );
      if (index < 0) {
        index = squashed.findIndex(
          (line, position) => free(position) && line.includes(label),
        );
      }
      if (index < 0) {
        lastKey = undefined;
        continue;
      }
    }

    byLine.set(index, [...(byLine.get(index) ?? []), link.url]);
    labelsOnLine.set(index, (labelsOnLine.get(index) ?? new Set()).add(label));
    cursor = index;
    lastKey = link.lineKey;
    lastIndex = index;
  }
  return byLine;
}

/** Finds where each block starts in the section's original lines. */
export function locateBlocks(blocks: string[][], lines: string[]): number[] {
  let cursor = 0;
  return blocks.map((block) => {
    const first = stripBullet(block[0] ?? "");
    let index = lines.findIndex(
      (line, position) => position >= cursor && stripBullet(line) === first,
    );
    if (index < 0) {
      index = lines.findIndex(
        (line, position) =>
          position >= cursor &&
          hasText(line) &&
          first.startsWith(stripBullet(line)),
      );
    }
    if (index >= 0) cursor = index + 1;
    return index;
  });
}
