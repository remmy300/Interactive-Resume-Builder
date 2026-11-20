/** Patterns and small text helpers shared by the CV importer. */
import { type HeadingKey, matchHeading } from "./headings";

export const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export const URL_PATTERN =
  /(https?:\/\/[^\s]+|(?:www\.)?(?:linkedin|github)\.com\/[^\s]+)/i;

export const ROLE_WORDS =
  /\b(developer|engineer|manager|analyst|designer|intern|lead|consultant|specialist|director|officer|architect|scientist|administrator|coordinator|associate|assistant|teacher|nurse|accountant|marketer)\b/i;

export const SCHOOL_WORDS =
  /\b(university|college|institute|school|academy|polytechnic)\b/i;

export const DEGREE_WORDS =
  /\b(bachelor|master|bsc|ba|b\.?a|mba|msc|phd|doctorate|diploma|certificate|degree|associate)\b/i;

export const hasText = (value: string) => value.trim().length > 0;

export const COMPANY_LINE =
  /^[A-Z][A-Za-z0-9&.' -]{1,45}(?:,\s*[A-Za-z][A-Za-z.' -]{2,30}){2}\.?$/;

export function cleanLine(line: string): string {
  return line.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

export function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-•*▪◦●‣■□➤►✓✔○–—]|\d+[.)])\s*/, "").trim();
}

export function isHeading(line: string): HeadingKey | null {
  return matchHeading(line)?.key ?? null;
}

export const BULLET_START = /^\s*[-•*▪◦●‣■□➤►✓✔○–—]/;

export const TRAILING_CONNECTOR =
  /\b(and|or|to|for|with|of|in|on|the|a|an|by|into|through|from|as|that|which)$/i;

export const endsSentence = (line: string) => /[.!?:]["')\]]?$/.test(line.trim());

export const firstWord = (line: string) =>
  (line.match(/[A-Za-z]+/)?.[0] ?? "").toLowerCase();

export const NAME_PATTERN = /^\p{L}[\p{L} .'’-]{1,59}$/u;

// Written as escapes in a string so the source has no invisible characters in it.
export const INVISIBLE_CHARS = new RegExp(
  "[\\ue000-\\uf8ff\\u200b-\\u200d\\ufeff]",
  "g",
);

export const NO_BREAK_SPACE = new RegExp("\\u00a0", "g");
