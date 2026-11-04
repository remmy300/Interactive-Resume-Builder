/**
 * Cover letters are stored as plain text. A link is written as
 * `[Title](https://example.com)` so the letter can show a readable title while
 * the address stays attached to it.
 */

export type LetterSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const LINK_PATTERN = /\[([^\]\n]{1,80})\]\((https?:\/\/[^\s()]+)\)/g;

/**
 * Turns user input such as "github.com/ada" into a safe http(s) address, or
 * returns null when it is not a usable web link.
 */
export function normalizeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return null;

  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
  } catch {
    return null;
  }
}

/** Brackets and line breaks would break the link syntax, so strip them. */
export function cleanLinkTitle(title: string): string {
  return title.replace(/[[\]\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatLink(title: string, href: string): string {
  return `[${title}](${href})`;
}

/** Replaces the selection (or inserts at the cursor) with a link. */
export function insertLink(
  content: string,
  start: number,
  end: number,
  title: string,
  href: string,
): { content: string; cursor: number } {
  const from = Math.max(0, Math.min(start, content.length));
  const to = Math.max(from, Math.min(end, content.length));
  const link = formatLink(title, href);
  return {
    content: content.slice(0, from) + link + content.slice(to),
    cursor: from + link.length,
  };
}

export function parseLetter(content: string): LetterSegment[] {
  const segments: LetterSegment[] = [];
  let last = 0;
  for (const match of content.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: "text", text: content.slice(last, index) });
    segments.push({ type: "link", text: match[1], href: match[2] });
    last = index + match[0].length;
  }
  if (last < content.length) segments.push({ type: "text", text: content.slice(last) });
  return segments;
}

/** Plain-text copy for places that cannot hold links: "Title (address)". */
export function toPlainText(content: string): string {
  return parseLetter(content)
    .map((segment) =>
      segment.type === "link" ? `${segment.text} (${segment.href})` : segment.text,
    )
    .join("");
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** HTML copy for pasting into an email client, with titled links. */
export function toHtml(content: string): string {
  const body = parseLetter(content)
    .map((segment) =>
      segment.type === "link"
        ? `<a href="${escapeHtml(segment.href)}">${escapeHtml(segment.text)}</a>`
        : escapeHtml(segment.text),
    )
    .join("");
  return `<div style="white-space:pre-wrap">${body}</div>`;
}
