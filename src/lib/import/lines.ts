/** Line structure: wrapped lines, blank-line blocks and title detection. */
import { ACTION_VERBS } from "../ats-data";
import { BULLET_START, COMPANY_LINE, TRAILING_CONNECTOR, endsSentence, firstWord, hasText, stripBullet } from "./patterns";
import { DATE_RANGE_PATTERN } from "./validate";

export function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

export function splitSectionBlocks(lines: string[]): string[][] {
  const byBlank = splitBlocks(lines);
  if (byBlank.length > 1) return byBlank;

  const dateIndexes = lines
    .map((line, index) => (DATE_RANGE_PATTERN.test(line) ? index : -1))
    .filter((index) => index >= 0);
  if (dateIndexes.length < 2) return byBlank;

  const starts = new Set<number>([0]);
  for (const index of dateIndexes.slice(1)) {
    let start = index;
    for (let back = 1; back <= 2; back += 1) {
      const candidate = index - back;
      if (candidate <= 0) break;
      const line = lines[candidate];
      if (!line || /^\s*[-•*▪◦●]/.test(line) || DATE_RANGE_PATTERN.test(line))
        break;

      if (!looksLikeHeaderLine(line)) break;
      start = candidate;
    }
    starts.add(start);
  }

  const sorted = [...starts].sort((a, b) => a - b);
  return sorted
    .map((start, index) =>
      lines.slice(start, sorted[index + 1] ?? lines.length).filter(hasText),
    )
    .filter((block) => block.length > 0);
}

export const STACK_LABEL =
  /^(technologies|tech(?:nology)? stack|stack|built with|tools)\s*:/i;

export const isStackLine = (line: string) =>
  ((line.match(/\s[·|•]\s/g) ?? []).length >= 2 && !isProjectHeader(line)) ||
  STACK_LABEL.test(line.trim());

export const LINK_FIELD =
  /\b(?:live\s+demo|demo|github|gitlab|source|code|repo(?:sitory)?)\s*:/i;

export const PROJECT_LINK_WORD = String.raw`(?:live\s+demo|demo|github|gitlab|source|code|repo(?:sitory)?)`;

export const LINK_TAIL = new RegExp(
  String.raw`\s[|·•]\s${PROJECT_LINK_WORD}(?:\s*[|·•,]\s*${PROJECT_LINK_WORD})*\s*$`,
  "i",
);

export const TITLE_WITH_STACK = /^[^|]{2,70}\s\|\s[^|]*,[^|]*$/;

export const isProjectHeader = (line: string) =>
  LINK_FIELD.test(line) ||
  LINK_TAIL.test(line.trim()) ||
  TITLE_WITH_STACK.test(line.trim());

export const isCommaStack = (line: string) =>
  (line.match(/,/g) ?? []).length >= 3 &&
  !endsSentence(line) &&
  !ACTION_VERBS.has(firstWord(line));

export const LINK_WORD =
  "(?:live\\s+)?demo|github|gitlab|source(?:\\s+code)?|code|repo(?:sitory)?|link|website|live\\s+site|case\\s+study|portfolio";

export const LINK_LABEL_LINE = new RegExp(
  `^[•\\-*\\s]*(?:${LINK_WORD})(?:\\s*[|·•/,]\\s*(?:${LINK_WORD}))*[•\\-*\\s]*$`,
  "i",
);

export function joinLines(previous: string, next: string): string {
  const glue = /[A-Za-z]-$/.test(previous) && /^[a-z]/.test(next) ? "" : " ";
  return `${previous}${glue}${next}`.replace(/\s+/g, " ");
}

export function isContinuation(prev: string, next: string): boolean {
  if (!hasText(prev) || !hasText(next)) return false;
  if (BULLET_START.test(next) || DATE_RANGE_PATTERN.test(next)) return false;
  if (COMPANY_LINE.test(next)) return false;

  if (
    STACK_LABEL.test(prev.trim()) &&
    !isStackLine(next) &&
    !endsSentence(prev) &&
    !endsSentence(next) &&
    next.length <= 60 &&
    !ACTION_VERBS.has(firstWord(next))
  ) {
    return true;
  }
  if (isStackLine(prev) || isStackLine(next)) return false;
  if (endsSentence(prev)) return false;

  if (/\[[^\]]*\]$/.test(prev.trim())) return false;
  if (/,$/.test(prev) || TRAILING_CONNECTOR.test(prev)) return true;

  if (
    /^[A-Z]/.test(next) &&
    next.split(/\s+/).length >= 4 &&
    ACTION_VERBS.has(firstWord(next))
  ) {
    return false;
  }

  if (/^[a-z(]/.test(next)) return prev.length >= 45;

  return prev.length >= 70 && !DATE_RANGE_PATTERN.test(prev);
}

export function mergeWrappedLines(rawLines: string[]): string[] {
  const lines = rawLines.map((line) =>
    LINK_LABEL_LINE.test(line) ? "" : line,
  );
  const bulleted = lines.some((line) => BULLET_START.test(line));
  const merged: string[] = [];
  let inBullet = false;

  lines.forEach((line, index) => {
    const previous = merged[merged.length - 1];
    if (!hasText(line)) {
      merged.push(line);
      inBullet = false;
      return;
    }

    let join = false;
    if (previous !== undefined && hasText(previous)) {
      if (bulleted) {
        const upcoming = lines.slice(index + 1).find(hasText);
        join =
          inBullet &&
          !BULLET_START.test(line) &&
          !DATE_RANGE_PATTERN.test(line) &&
          !isStackLine(line) &&
          !COMPANY_LINE.test(line) &&
          !(
            upcoming !== undefined &&
            DATE_RANGE_PATTERN.test(upcoming) &&
            line.length <= 80 &&
            !endsSentence(line)
          ) &&
          !(upcoming !== undefined && isStackLine(upcoming)) &&
          !(endsSentence(previous) && looksLikeTitle(line));
      } else {
        join = isContinuation(previous, line);
      }
    }

    if (join) {
      merged[merged.length - 1] = joinLines(previous as string, line);
    } else {
      merged.push(line);
      inBullet = BULLET_START.test(line);
    }
  });

  return merged;
}

export function restoreIndentedBullets(text: string): string {
  const lines = text.split("\n");
  const filled = lines.filter(hasText);
  const indented = filled.filter((line) => /^[ \t]\S/.test(line));
  if (indented.length < 3 || indented.length > filled.length * 0.8) return text;
  return lines
    .map((line) => (/^[ \t]\S/.test(line) ? `• ${line.trim()}` : line))
    .join("\n");
}

export function looksLikeTitle(line: string): boolean {
  if (COMPANY_LINE.test(line)) return true;
  if (BULLET_START.test(line) || endsSentence(line) || isStackLine(line))
    return false;
  const limit = isProjectHeader(line) ? 260 : 90;
  if (line.length > limit || !/^[A-Z0-9]/.test(line)) return false;
  const words = line.split(/\s+/).length;
  return !(words >= 4 && ACTION_VERBS.has(firstWord(line)));
}

export function splitTitleBlocks(lines: string[]): string[][] {
  const byBlank = splitBlocks(lines);
  if (byBlank.length > 1) return byBlank;

  const starts: number[] = [];
  let previous: string | undefined;
  lines.forEach((line, index) => {
    if (!hasText(line)) return;
    const next = lines.slice(index + 1).find(hasText);
    const startsEntry =
      next !== undefined &&
      looksLikeTitle(line) &&
      (previous === undefined || endsSentence(previous) || isStackLine(next));
    if (startsEntry) starts.push(index);
    previous = line;
  });

  if (starts.length === 0 || (starts.length === 1 && starts[0] === 0)) {
    return splitSectionBlocks(lines);
  }
  if (starts[0] > 0) starts.unshift(0);
  return starts
    .map((start, index) =>
      lines.slice(start, starts[index + 1] ?? lines.length),
    )
    .map((block) => block.filter(hasText))
    .filter((block) => block.length > 0);
}

export function looksLikeHeaderLine(line: string): boolean {
  // A project header with its stack on the same line  is longer than a plain title but is still a header.
  const limit = isProjectHeader(line) ? 260 : 100;
  if (BULLET_START.test(line) || line.length > limit) return false;
  if (DATE_RANGE_PATTERN.test(line) || COMPANY_LINE.test(line)) return true;
  if (endsSentence(line)) return false;
  const words = line.split(/\s+/).length;
  return !(words >= 4 && ACTION_VERBS.has(firstWord(line)));
}

export function headerLines(block: string[]): {
  headers: string[];
  details: string[];
} {
  const headers: string[] = [];
  const details: string[] = [];
  let seenDetail = false;
  for (const line of block) {
    const looksLikeDetail = seenDetail || !looksLikeHeaderLine(line);
    if (!looksLikeDetail && headers.length < 3) {
      headers.push(stripBullet(line));
    } else {
      seenDetail = true;
      details.push(stripBullet(line));
    }
  }
  return { headers, details };
}
