/**
 * Validation and normalisation helpers for CV import: dates, phone numbers,
 * e-mail addresses, links and the separators used in a CV header. Everything
 * here is pure so it can be tested on its own.
 */

/* --------------------------------- dates ---------------------------------- */

const MONTH_WORD =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const YEAR_AFTER_MONTH = "\\s*,?\\s*['’]?\\d{2,4}";
const DATE_TOKEN = `(?:${MONTH_WORD}${YEAR_AFTER_MONTH}|\\d{1,2}[/.]\\d{4}|\\d{4}[/.-]\\d{1,2}|\\d{4})`;
const RANGE_SEPARATOR = "(?:-|–|—|‒|−|to|until|till)";
const OPEN_END = "present|current|now|ongoing|today|date";

export const DATE_RANGE_PATTERN = new RegExp(
  `(${DATE_TOKEN})\\s*${RANGE_SEPARATOR}\\s*(${DATE_TOKEN}|${OPEN_END})`,
  "i",
);

export const SINGLE_DATE_PATTERN = new RegExp(
  `(${MONTH_WORD}${YEAR_AFTER_MONTH}|\\d{1,2}[/.]\\d{4}|\\d{4}[/-]\\d{1,2})`,
  "i",
);

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export const OPEN_END_PATTERN = new RegExp(`^(?:${OPEN_END})$`, "i");

const MIN_YEAR = 1950;

/**
 * A four-digit year inside a sensible range, or a two-digit year read as the
 * nearest century ("'21" is 2021, "'98" is 1998). Anything else is rejected, so a
 * stray number such as "202" or "9999" never becomes a date.
 */
export function normalizeYear(raw: string, now = new Date()): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  const thisYear = now.getFullYear();
  let year: number;
  if (raw.length === 2) {
    year = value <= (thisYear % 100) + 1 ? 2000 + value : 1900 + value;
  } else if (raw.length === 4) {
    year = value;
  } else {
    return null;
  }
  // Allow a few years ahead: an expected graduation date is still a real date.
  return year >= MIN_YEAR && year <= thisYear + 6 ? year : null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "Jan '21", "01/2021", "2021-01" or "2021" as "2021-01". Empty when invalid. */
export function toMonthValue(token: string, now = new Date()): string {
  const value = token.trim().toLowerCase().replace(/['’]/g, "");

  const named = value.match(/^([a-z]{3,9})\.?\s*,?\s*(\d{2,4})$/);
  if (named) {
    const month = MONTHS[named[1].slice(0, 3)];
    const year = normalizeYear(named[2], now);
    return month && year ? `${year}-${month}` : "";
  }

  const numeric = value.match(/^(\d{1,2})[/.](\d{4})$/);
  if (numeric) {
    const month = Number(numeric[1]);
    const year = normalizeYear(numeric[2], now);
    return month >= 1 && month <= 12 && year ? `${year}-${pad(month)}` : "";
  }

  const iso = value.match(/^(\d{4})[/.-](\d{1,2})$/);
  if (iso) {
    const month = Number(iso[2]);
    const year = normalizeYear(iso[1], now);
    return month >= 1 && month <= 12 && year ? `${year}-${pad(month)}` : "";
  }

  if (/^\d{4}$/.test(value)) {
    const year = normalizeYear(value, now);
    return year ? `${year}-01` : "";
  }
  return "";
}

export interface ParsedDates {
  startDate: string;
  endDate: string;
  current: boolean;
  /** Problems worth telling the user about, never thrown away silently. */
  issues: string[];
}

/** Reads "Jan 2020 – Present" style dates and checks that they make sense. */
export function parseDatesDetailed(text: string, now = new Date()): ParsedDates {
  const issues: string[] = [];
  const range = text.match(DATE_RANGE_PATTERN);
  let startDate = "";
  let endDate = "";
  let current = false;

  if (range) {
    current = OPEN_END_PATTERN.test(range[2].trim());
    startDate = toMonthValue(range[1], now);
    endDate = current ? "" : toMonthValue(range[2], now);
    if (!startDate) issues.push(`Could not read the start date "${range[1].trim()}".`);
    if (!current && !endDate) issues.push(`Could not read the end date "${range[2].trim()}".`);
  } else {
    const single = text.match(SINGLE_DATE_PATTERN);
    if (single) {
      startDate = toMonthValue(single[1], now);
      if (!startDate) issues.push(`Could not read the date "${single[1].trim()}".`);
    }
  }

  if (startDate && endDate && endDate < startDate) {
    issues.push("The end date is before the start date.");
  }
  const horizon = `${now.getFullYear() + 1}-${pad(now.getMonth() + 1)}`;
  if (startDate && startDate > horizon) {
    issues.push("The start date is in the future.");
  }
  return { startDate, endDate, current, issues };
}

/* ------------------------------ contact details ---------------------------- */

const EMAIL_CANDIDATE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** The first well-formed e-mail address in the text. */
export function findEmail(text: string): string {
  for (const match of text.matchAll(EMAIL_CANDIDATE)) {
    const value = match[0].replace(/[.-]+$/, "");
    const [local, domain] = value.split("@");
    if (
      local &&
      domain &&
      !local.startsWith(".") &&
      !local.endsWith(".") &&
      !value.includes("..") &&
      /\.[A-Za-z]{2,}$/.test(domain)
    ) {
      return value;
    }
  }
  return "";
}

const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{6,}\d/g;

export interface PhoneMatch {
  value: string;
  /** Country code and a plausible length: safe to trust. */
  strong: boolean;
}

/**
 * Finds a phone number and refuses things that only look like one: date ranges
 * ("2018 - 2020", "02/2022 - 11/2023"), years, postcodes and long digit runs.
 * A real number has 8 to 15 digits.
 */
export function findPhone(text: string): PhoneMatch | null {
  let weak: PhoneMatch | null = null;
  for (const match of text.matchAll(PHONE_CANDIDATE)) {
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;
    if (/^(\d)\1+$/.test(digits)) continue;
    // Two years or two month/year dates joined by a dash are a date range.
    if (/(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}/.test(raw)) continue;
    const strong = raw.startsWith("+") && digits.length >= 10 && digits.length <= 14;
    if (strong) return { value: raw, strong: true };
    weak ??= { value: raw, strong: false };
  }
  return weak;
}

/* ---------------------------------- links ---------------------------------- */

/** Punctuation that follows a link in a sentence but is not part of it. */
export function trimUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^[(<[]+/, "")
    .replace(/[)>\].,;:!?'"]+$/, "");
}

/**
 * The link as written, minus trailing punctuation, or "" when it is not a real
 * address (no dot in the host, spaces, an unknown scheme).
 */
export function validUrl(raw: string): string {
  const value = trimUrl(raw);
  if (!value) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host)) return "";
    return value;
  } catch {
    return "";
  }
}

/* --------------------------------- separators ------------------------------ */

/**
 * Splits a header line into its parts. CVs separate name, title, location and
 * contact details with bars, dots, bullets, slashes, dashes with spaces around
 * them, or semicolons: "Nairobi, Kenya • +254… | a@b.com / github.com/x".
 */
export function splitSegments(line: string): string[] {
  return line
    .split(/\s*[|│¦·•●▪◦‧∙⋅;]\s*|\s+[/–—-]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** A line made only of rules or decoration: "______", "-----", "═══", "* * *". */
export function isDecorationLine(line: string): boolean {
  const value = line.trim();
  return value.length >= 3 && /^[\s_=*#~.\-–—─━═•·|+]+$/.test(value) && !/[A-Za-z0-9]/.test(value);
}
