import { suggestSkillsField } from "./ats";
import { ACTION_VERBS } from "./ats-data";
import { classifyProjectLinks, type LinkRef } from "./import-links";
import {
  createEmptyResume,
  createId,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
  type ResumeData,
  type Skills,
} from "./resume-schema";

export interface ImportResult {
  data: ResumeData;
  warnings: string[];
  stats: {
    characters: number;
    experience: number;
    education: number;
    projects: number;
    skills: number;
  };
}

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

const SECTION_PATTERNS: Array<[SectionKey, RegExp]> = [
  ["summary", /^(professional\s+)?(summary|profile|objective|about me|personal statement)$/i],
  [
    "experience",
    /^((work|professional|relevant)\s+)?(experience|employment(\s+history)?|career history|work history)$/i,
  ],
  [
    "education",
    /^(education|academic background|academic qualifications|qualifications)(\s*(&|and)\s*[a-z ]{3,40})?$/i,
  ],
  ["skills", /^((technical|core|key|professional)\s+)?(skills|competencies|expertise|technologies)$/i],
  ["projects", /^((personal|selected|key|side)\s+)?projects$/i],
  ["certifications", /^(certifications?|certificates?|licences?|licenses?|awards?)$/i],
];

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_PATTERN = /(https?:\/\/[^\s]+|(?:www\.)?(?:linkedin|github)\.com\/[^\s]+)/i;
const DATE_RANGE_PATTERN =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*\d{2,4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|–|—|to|until)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*\d{2,4}|\d{1,2}\/\d{4}|\d{4}|present|current|now|ongoing)/i;
const SINGLE_DATE_PATTERN =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*\d{2,4}|\d{1,2}\/\d{4})/i;
const ROLE_WORDS =
  /\b(developer|engineer|manager|analyst|designer|intern|lead|consultant|specialist|director|officer|architect|scientist|administrator|coordinator|associate|assistant|teacher|nurse|accountant|marketer)\b/i;
const SCHOOL_WORDS = /\b(university|college|institute|school|academy|polytechnic)\b/i;
const DEGREE_WORDS =
  /\b(bachelor|master|bsc|ba|b\.?a|mba|msc|phd|doctorate|diploma|certificate|degree|associate)\b/i;

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
  sept: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const hasText = (value: string) => value.trim().length > 0;

function cleanLine(line: string): string {
  return line.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-•*▪◦●]|\d+[.)])\s*/, "").trim();
}

function isHeading(line: string): SectionKey | null {
  const candidate = line.replace(/[:•|]+$/g, "").trim();
  if (!candidate || candidate.length > 48) return null;
  for (const [key, pattern] of SECTION_PATTERNS) {
    if (pattern.test(candidate)) return key;
  }
  return null;
}

function toMonthValue(token: string): string {
  const value = token.trim().toLowerCase();
  const monthYear = value.match(/([a-z]{3,9})\.?\s*,?\s*(\d{2,4})/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 4)] ?? MONTHS[monthYear[1].slice(0, 3)];
    const year = monthYear[2].length === 2 ? `20${monthYear[2]}` : monthYear[2];
    if (month) return `${year}-${month}`;
  }
  const numeric = value.match(/(\d{1,2})\/(\d{4})/);
  if (numeric) {
    return `${numeric[2]}-${numeric[1].padStart(2, "0")}`;
  }
  const year = value.match(/(19|20)\d{2}/);
  if (year) return `${year[0]}-01`;
  return "";
}

function parseDates(text: string): {
  startDate: string;
  endDate: string;
  current: boolean;
} {
  const range = text.match(DATE_RANGE_PATTERN);
  if (range) {
    const isCurrent = /present|current|now|ongoing/i.test(range[2]);
    return {
      startDate: toMonthValue(range[1]),
      endDate: isCurrent ? "" : toMonthValue(range[2]),
      current: isCurrent,
    };
  }
  const single = text.match(SINGLE_DATE_PATTERN);
  if (single) {
    return { startDate: toMonthValue(single[1]), endDate: "", current: false };
  }
  return { startDate: "", endDate: "", current: false };
}

function splitBlocks(lines: string[]): string[][] {
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

/**
 * Uses blank lines when the export preserved them, otherwise starts a new block
 * at each date range so concatenated PDF text still yields separate roles.
 */
function splitSectionBlocks(lines: string[]): string[][] {
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
      if (!line || /^\s*[-•*▪◦●]/.test(line) || DATE_RANGE_PATTERN.test(line)) break;
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

const BULLET_START = /^\s*[-•*▪◦●]/;
const TRAILING_CONNECTOR =
  /\b(and|or|to|for|with|of|in|on|the|a|an|by|into|through|from|as|that|which)$/i;

const endsSentence = (line: string) => /[.!?:]["')\]]?$/.test(line.trim());

const STACK_LABEL = /^(technologies|tech(?:nology)? stack|stack|built with|tools)\s*:/i;

/** A technology list such as "React · Node.js · PostgreSQL" or "Technologies: …". */
const isStackLine = (line: string) =>
  (line.match(/\s[·|•]\s/g) ?? []).length >= 2 || STACK_LABEL.test(line.trim());

const LINK_WORD =
  "(?:live\\s+)?demo|github|gitlab|source(?:\\s+code)?|code|repo(?:sitory)?|link|website|live\\s+site|case\\s+study|portfolio";
/** Lines like "Live Demo | Github" are just link captions, not achievements. */
const LINK_LABEL_LINE = new RegExp(
  `^[•\\-*\\s]*(?:${LINK_WORD})(?:\\s*[|·•/,]\\s*(?:${LINK_WORD}))*[•\\-*\\s]*$`,
  "i",
);

const firstWord = (line: string) => (line.match(/[A-Za-z]+/)?.[0] ?? "").toLowerCase();

/** Rejoins a word that was hyphenated across a line break ("pixel-" + "perfect"). */
function joinLines(previous: string, next: string): string {
  const glue = /[A-Za-z]-$/.test(previous) && /^[a-z]/.test(next) ? "" : " ";
  return `${previous}${glue}${next}`.replace(/\s+/g, " ");
}

/**
 * PDF text is wrapped at the page width and often loses its bullet characters,
 * so one achievement arrives as several lines. Decides whether `next` carries
 * on `prev` when the document has no bullet markers to go by.
 */
function isContinuation(prev: string, next: string): boolean {
  if (!hasText(prev) || !hasText(next)) return false;
  if (BULLET_START.test(next) || DATE_RANGE_PATTERN.test(next)) return false;
  if (isStackLine(prev) || isStackLine(next)) return false;
  if (endsSentence(prev)) return false;
  if (/,$/.test(prev) || TRAILING_CONNECTOR.test(prev)) return true;
  // A short line followed by a lowercase one is usually two fields ("Eldorado" /
  // "high school graduate"), not a wrapped sentence.
  if (/^[a-z(]/.test(next)) return prev.length >= 45;
  // A long line with no full stop was wrapped mid-sentence, unlike a short title.
  return prev.length >= 70 && !DATE_RANGE_PATTERN.test(prev);
}

/**
 * Joins wrapped lines back into whole sentences so an achievement is never split
 * in two. When the text still has bullet markers, every unmarked line that
 * follows a bullet belongs to it, unless it is clearly the next entry's title.
 * Blank lines stay as barriers.
 */
function mergeWrappedLines(rawLines: string[]): string[] {
  // A caption such as "Live Demo | Github" ends a project. Turn it into a blank
  // line so the next title cannot be glued onto a last bullet that has no full stop.
  const lines = rawLines.map((line) => (LINK_LABEL_LINE.test(line) ? "" : line));
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

/**
 * Some PDFs mark bullets only with a leading space once the glyph is dropped.
 * When most indented lines look like that, restore a real bullet marker so the
 * line structure survives `cleanLine` trimming.
 */
function restoreIndentedBullets(text: string): string {
  const lines = text.split("\n");
  const filled = lines.filter(hasText);
  const indented = filled.filter((line) => /^[ \t]\S/.test(line));
  if (indented.length < 3 || indented.length > filled.length * 0.8) return text;
  return lines.map((line) => (/^[ \t]\S/.test(line) ? `• ${line.trim()}` : line)).join("\n");
}

/** Short, title-like line that is not a sentence and does not start with a verb. */
function looksLikeTitle(line: string): boolean {
  if (BULLET_START.test(line) || endsSentence(line) || isStackLine(line)) return false;
  if (line.length > 90 || !/^[A-Z0-9]/.test(line)) return false;
  const words = line.split(/\s+/).length;
  return !(words >= 4 && ACTION_VERBS.has(firstWord(line)));
}

/**
 * Splits a section into entries when the text has no blank lines, starting a new
 * entry at each title-like line. Text before the first title becomes its own
 * block so an unrelated paragraph cannot swallow the entries after it.
 */
function splitTitleBlocks(lines: string[]): string[][] {
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
    .map((start, index) => lines.slice(start, starts[index + 1] ?? lines.length))
    .map((block) => block.filter(hasText))
    .filter((block) => block.length > 0);
}

/** Header-like: dates, or a short non-sentence line that is not an achievement. */
function looksLikeHeaderLine(line: string): boolean {
  if (BULLET_START.test(line) || line.length > 100) return false;
  if (DATE_RANGE_PATTERN.test(line)) return true;
  if (endsSentence(line)) return false;
  const words = line.split(/\s+/).length;
  return !(words >= 4 && ACTION_VERBS.has(firstWord(line)));
}

function headerLines(block: string[]): { headers: string[]; details: string[] } {
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

function splitHeaderLine(line: string): string[] {
  // Remove dates first so "Jan 2022 – Present" cannot be split into fake fields.
  return line
    .replace(DATE_RANGE_PATTERN, " ")
    .replace(SINGLE_DATE_PATTERN, " ")
    .split(/\s+(?:\||•|·|—|–|-)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseExperienceBlock(block: string[]): ExperienceEntry | null {
  const { headers, details } = headerLines(block);
  const joined = block.join(" ");
  const dates = parseDates(joined);
  if (headers.length === 0) return null;

  const parts = headers.flatMap(splitHeaderLine);
  const headerWithoutDates = parts.filter(
    (part) => !DATE_RANGE_PATTERN.test(part) && !SINGLE_DATE_PATTERN.test(part),
  );
  const primary = headerWithoutDates[0] ?? "";
  const secondary = headerWithoutDates[1] ?? "";

  let company = "";
  let role = "";
  if (secondary) {
    if (ROLE_WORDS.test(primary) && !ROLE_WORDS.test(secondary)) {
      role = primary;
      company = secondary;
    } else {
      company = primary;
      role = secondary;
    }
  } else if (ROLE_WORDS.test(primary)) {
    role = primary;
  } else {
    company = primary;
  }

  if (!hasText(company) && !hasText(role)) return null;

  return {
    id: createId(),
    company,
    role,
    description: details.join("\n").slice(0, 5000),
    ...dates,
  };
}

function parseEducationBlock(block: string[]): EducationEntry | null {
  const { headers } = headerLines(block);
  const parts = headers.flatMap(splitHeaderLine);
  const filtered = parts.filter(
    (part) => !DATE_RANGE_PATTERN.test(part) && !SINGLE_DATE_PATTERN.test(part),
  );
  if (filtered.length === 0) return null;

  const college =
    filtered.find((part) => SCHOOL_WORDS.test(part)) ?? filtered[0] ?? "";
  const degree =
    filtered.find((part) => part !== college && DEGREE_WORDS.test(part)) ??
    filtered.find((part) => part !== college) ??
    "";

  return {
    id: createId(),
    college,
    degree,
    ...parseDates(block.join(" ")),
  };
}

/**
 * Drops a trailing detail such as "Full-stack Developer | Lagos" or
 * "Project — React app". Only real separators count: a bar, a dot, an em/en
 * dash, or a hyphen with spaces around it. A hyphen inside a word ("Full-stack")
 * must survive.
 */
function stripTrailingDetail(text: string): string {
  return text.replace(/\s*(?:[|·•–—]|\s-\s).*$/, "").trim();
}

function parseProjectBlock(block: string[], urls: string[] = []): ProjectEntry | null {
  const { headers, details } = headerLines(block);
  // Project titles can legitimately contain dashes ("FlowDesk — Project
  // Management Platform"), so only a bar or dot starts trailing detail.
  const title = (headers[0] ?? "").replace(/\s*[|·•].*$/, "").trim();
  if (!hasText(title)) return null;
  // The live demo and the repository are different addresses: a GitHub link goes
  // to its own field instead of overwriting the demo link.
  const { link, github } = classifyProjectLinks([
    ...urls,
    ...(block.join(" ").match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
  ]);
  const extra = headers
    .slice(1)
    .map((line) =>
      isStackLine(line)
        ? `Tech stack: ${line.replace(STACK_LABEL, "").trim()}`
        : line,
    );
  return {
    id: createId(),
    title,
    description: [...extra, ...details].join("\n").slice(0, 5000),
    link,
    github,
  };
}

const normalizeLinkRefs = (links: Array<string | LinkRef>): LinkRef[] =>
  links
    .map((link) => (typeof link === "string" ? { url: link, label: "" } : link))
    .filter((link) => link.url.toLowerCase().startsWith("http"));

/** Invisible symbol-font bullets and zero-width characters inside extracted text. */
const HIDDEN_CHARS = new RegExp("[\\uE000-\\uF8FF\\u200B-\\u200D\\uFEFF\\s]+", "g");

/**
 * Matches each hyperlink to the line carrying its visible words ("Live Demo",
 * "GitHub"), walking forward through the document in reading order.
 */
function assignLinksToLines(lines: string[], links: LinkRef[]): Map<number, string[]> {
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
      index = squashed.findIndex((line, position) => free(position) && line === label);
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
function locateBlocks(blocks: string[][], lines: string[]): number[] {
  let cursor = 0;
  return blocks.map((block) => {
    const first = stripBullet(block[0] ?? "");
    let index = lines.findIndex(
      (line, position) => position >= cursor && stripBullet(line) === first,
    );
    if (index < 0) {
      index = lines.findIndex(
        (line, position) =>
          position >= cursor && hasText(line) && first.startsWith(stripBullet(line)),
      );
    }
    if (index >= 0) cursor = index + 1;
    return index;
  });
}

function parseCertificationBlock(block: string[]): CertificationEntry | null {
  const { headers } = headerLines(block);
  const name = headers[0]?.trim() ?? "";
  if (!hasText(name)) return null;
  const dates = parseDates(block.join(" "));
  return {
    id: createId(),
    name,
    issuer: headers[1]?.replace(/\s*[|·—-]\s*.*$/, "").trim() ?? "",
    date: dates.startDate,
    link: block.join(" ").match(URL_PATTERN)?.[0] ?? "",
  };
}

const SKILL_LABEL =
  /^(programming |spoken |human )?languages?$|^(frameworks?|libraries|tools|technologies|tech stack|platforms|cloud|devops|databases?|data|other|soft skills|skills)(\s*(&|and|\/)\s*[a-z ]+)?$/i;

/** Which skills field a group label such as "FRAMEWORKS & TOOLS" refers to. */
function fieldForLabel(label: string): keyof Skills | "languages-or-spoken" {
  const value = label.toLowerCase();
  if (/database|data store/.test(value)) return "databases";
  if (/spoken|human/.test(value)) return "spoken";
  if (/^(programming )?languages?$/.test(value)) return "languages-or-spoken";
  return "technologies";
}

function parseSkills(lines: string[]): Skills {
  const skills: Skills = { languages: "", technologies: "", databases: "", spoken: "" };
  const seen = new Set<string>();
  let group: ReturnType<typeof fieldForLabel> | null = null;

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || value.length >= 60 || seen.has(value.toLowerCase())) return;
    seen.add(value.toLowerCase());
    let field: keyof Skills;
    if (group === "languages-or-spoken") {
      // "Languages" is ambiguous: English/Swahili are spoken, TypeScript is not.
      field = suggestSkillsField(value) === "spoken" ? "spoken" : "languages";
    } else {
      field = group ?? suggestSkillsField(value);
    }
    skills[field] = skills[field] ? `${skills[field]}, ${value}` : value;
  };

  for (const line of lines) {
    let text = stripBullet(line);
    const labelled = text.match(/^([A-Za-z][A-Za-z &/]{2,40}):\s*(.+)$/);
    if (labelled && SKILL_LABEL.test(labelled[1].trim())) {
      group = fieldForLabel(labelled[1].trim());
      text = labelled[2];
    } else if (SKILL_LABEL.test(text.replace(/:$/, "").trim())) {
      group = fieldForLabel(text.replace(/:$/, "").trim());
      continue;
    } else if (/^[A-Za-z /&]+:\s*\S/.test(text)) {
      // An unrecognised label ("Styling & UI: …"): drop it and fall back to
      // classifying each skill, instead of keeping the previous group.
      group = null;
      text = text.replace(/^[A-Za-z /&]+:\s*/, "");
    }
    // A slash only separates skills when spaced out; "CI/CD" and "shadcn/ui" stay whole.
    for (const item of text.split(/[;|•]|,(?![^()]*\))|\s{3,}|\s\/\s/)) add(item);
  }
  return skills;
}

function significantHeaderLines(lines: string[]): string[] {
  return lines.filter((line) => {
    if (!line) return false;
    if (EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line) || URL_PATTERN.test(line)) {
      return false;
    }
    return line.length <= 100 && !isHeading(line);
  });
}

/**
 * Best-effort conversion of extracted CV text into the app's structured resume
 * format. Imported data is always shown to the user for review before it is
 * saved as a new resume.
 */
export function parseResumeText(
  rawText: string,
  extraLinks: Array<string | LinkRef> = [],
): ImportResult {
  // Bullet glyphs from symbol fonts arrive as invisible private-use characters.
  const text = rawText
    .replace(/[\ue000-\uf8ff\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n");
  const warnings: string[] = [];
  const resume = createEmptyResume();
  resume.education = [];
  resume.experience = [];
  resume.projects = [];
  resume.certifications = [];
  resume.skills = { languages: "", technologies: "", databases: "", spoken: "" };
  resume.summary = "";
  resume.personal = {
    name: "",
    title: "",
    phone: "",
    email: "",
    location: "",
    linkedIn: "",
    github: "",
    portfolio: "",
  };

  // Contact details can appear anywhere in the header blurbs.
  resume.personal.email = text.match(EMAIL_PATTERN)?.[0] ?? "";
  resume.personal.phone = text.match(PHONE_PATTERN)?.[1]?.trim() ?? "";

  const rawLines = restoreIndentedBullets(text).split("\n").map(cleanLine);
  const linkRefs = normalizeLinkRefs(extraLinks);
  const urlsByLine = assignLinksToLines(rawLines, linkRefs);

  // Personal profile links come from the header only. Anywhere else a GitHub
  // address belongs to a project, not to the person.
  const firstHeading = rawLines.findIndex((line) => isHeading(line) !== null);
  const headerEnd = firstHeading < 0 ? Math.min(rawLines.length, 12) : firstHeading;
  const headerUrls = [
    ...[...urlsByLine.entries()]
      .filter(([index]) => index < headerEnd)
      .flatMap(([, urls]) => urls),
    ...(rawLines.slice(0, headerEnd).join(" ").match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
  ];
  for (const link of headerUrls) {
    const value = link.replace(/[),.;]+$/, "");
    if (/linkedin\.com/i.test(value)) resume.personal.linkedIn ||= value;
    else if (/github\.com/i.test(value)) resume.personal.github ||= value;
    else resume.personal.portfolio ||= value;
  }
  // A link with no visible words cannot be placed on a line. A bare profile
  // address (github.com/name) is still the person's own; a repository is not.
  for (const ref of linkRefs.filter((item) => !item.label.trim())) {
    if (/github\.com\/[^/]+\/?$/i.test(ref.url)) resume.personal.github ||= ref.url;
  }
  if (!resume.personal.linkedIn) {
    const everywhere = [
      ...linkRefs.map((ref) => ref.url),
      ...(text.match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
    ];
    const linkedIn = everywhere.find((url) => /linkedin\.com/i.test(url));
    if (linkedIn) resume.personal.linkedIn = linkedIn.replace(/[),.;]+$/, "");
  }

  const nonEmpty = rawLines.filter(hasText);
  const header = significantHeaderLines(nonEmpty.slice(0, 12));
  if (header[0] && /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(header[0])) {
    resume.personal.name = header[0];
  }
  if (header[1] && header[1].length <= 80 && !EMAIL_PATTERN.test(header[1])) {
    resume.personal.title = stripTrailingDetail(header[1]);
  }

  const sections: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
  let current: SectionKey | null = null;
  const projectLineIndexes: number[] = [];
  rawLines.forEach((line, index) => {
    const heading = isHeading(line);
    if (heading) {
      current = heading;
      return;
    }
    if (!current) return;
    sections[current].push(line);
    if (current === "projects") projectLineIndexes.push(index);
  });

  if (sections.summary.some(hasText)) {
    resume.summary = sections.summary.filter(hasText).join(" ").slice(0, 2000);
  }

  const experienceBlocks = splitSectionBlocks(mergeWrappedLines(sections.experience));
  resume.experience = experienceBlocks
    .map(parseExperienceBlock)
    .filter((entry): entry is ExperienceEntry => entry !== null);

  const educationBlocks = splitTitleBlocks(mergeWrappedLines(sections.education));
  resume.education = educationBlocks
    .map(parseEducationBlock)
    .filter((entry): entry is EducationEntry => entry !== null);

  const projectBlocks = splitTitleBlocks(mergeWrappedLines(sections.projects));
  const projectStarts = locateBlocks(projectBlocks, sections.projects);
  resume.projects = projectBlocks
    .map((block, position) => {
      // Links belong to the project whose lines they sit on.
      const from = projectStarts[position];
      const to =
        projectStarts.slice(position + 1).find((start) => start >= 0) ??
        sections.projects.length;
      const urls: string[] = [];
      for (let line = from; from >= 0 && line < to; line += 1) {
        urls.push(...(urlsByLine.get(projectLineIndexes[line]) ?? []));
      }
      return parseProjectBlock(block, urls);
    })
    .filter((entry): entry is ProjectEntry => entry !== null);

  const certificationBlocks = splitSectionBlocks(mergeWrappedLines(sections.certifications));
  resume.certifications = certificationBlocks
    .map(parseCertificationBlock)
    .filter((entry): entry is CertificationEntry => entry !== null);

  if (sections.skills.some(hasText)) {
    resume.skills = parseSkills(sections.skills.filter(hasText));
  }

  const dropped = educationBlocks.length - resume.education.length;
  if (dropped > 0) {
    warnings.push(
      `${dropped} paragraph${dropped === 1 ? "" : "s"} under Education did not look like a school or qualification and ${dropped === 1 ? "was" : "were"} skipped. Add ${dropped === 1 ? "it" : "them"} manually if needed.`,
    );
  }

  if (!sections.experience.some(hasText)) {
    warnings.push("No work experience section was detected. Add roles manually.");
  }
  if (!sections.education.some(hasText)) {
    warnings.push("No education section was detected.");
  }
  if (!sections.skills.some(hasText)) {
    warnings.push("No skills section was detected. Add your key tools and languages.");
  }
  if (!hasText(resume.summary)) {
    warnings.push("No professional summary was detected.");
  }

  // If the document had no recognisable headings, keep the text so the user can
  // copy it into the right sections rather than losing the upload entirely.
  if (
    !sections.summary.some(hasText) &&
    !sections.experience.some(hasText) &&
    !sections.education.some(hasText) &&
    !sections.skills.some(hasText)
  ) {
    resume.summary = text.trim().slice(0, 2000);
    warnings.push(
      "We could not recognise section headings. The text was placed in the summary for you to reorganise.",
    );
  }

  return {
    data: resume,
    warnings,
    stats: {
      characters: text.length,
      experience: resume.experience.length,
      education: resume.education.length,
      projects: resume.projects.length,
      skills: Object.values(resume.skills).reduce(
        (count, value) => count + (value ? value.split(",").length : 0),
        0,
      ),
    },
  };
}
