import { suggestSkillsField } from "./ats";
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
  ["education", /^(education|academic background|academic qualifications|qualifications)$/i],
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

function headerLines(block: string[]): { headers: string[]; details: string[] } {
  const headers: string[] = [];
  const details: string[] = [];
  let seenDetail = false;
  for (const line of block) {
    const bullet = /^\s*[-•*▪◦●]/.test(line);
    const looksLikeDetail = bullet || seenDetail || line.length > 140;
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
  return line
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

function parseProjectBlock(block: string[]): ProjectEntry | null {
  const { headers, details } = headerLines(block);
  const title = headers[0]?.replace(/\s*[|·—-]\s*.*$/, "").trim() ?? "";
  if (!hasText(title)) return null;
  const link = block.join(" ").match(URL_PATTERN)?.[0] ?? "";
  return {
    id: createId(),
    title,
    description: details.join("\n").slice(0, 5000),
    link,
  };
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

function parseSkills(lines: string[]): Skills {
  const values = lines
    .flatMap((line) => stripBullet(line).split(/[,;|/•]|\s{3,}/))
    .map((item) => item.replace(/^[A-Za-z /&]+:\s*/, "").trim())
    .filter((item) => item.length > 0 && item.length < 60);

  const skills: Skills = { languages: "", technologies: "", databases: "", spoken: "" };
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    const field = suggestSkillsField(value);
    skills[field] = skills[field] ? `${skills[field]}, ${value}` : value;
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
export function parseResumeText(rawText: string): ImportResult {
  const text = rawText.replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
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

  for (const link of text.match(new RegExp(URL_PATTERN.source, "gi")) ?? []) {
    const value = link.replace(/[),.;]+$/, "");
    if (/linkedin\.com/i.test(value)) resume.personal.linkedIn = value;
    else if (/github\.com/i.test(value)) resume.personal.github = value;
    else if (!resume.personal.portfolio) resume.personal.portfolio = value;
  }

  const rawLines = text.split("\n").map(cleanLine);
  const nonEmpty = rawLines.filter(hasText);
  const header = significantHeaderLines(nonEmpty.slice(0, 12));
  if (header[0] && /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(header[0])) {
    resume.personal.name = header[0];
  }
  if (header[1] && header[1].length <= 80 && !EMAIL_PATTERN.test(header[1])) {
    resume.personal.title = header[1].replace(/[|·—-]\s*.*$/, "").trim();
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
  for (const line of rawLines) {
    const heading = isHeading(line);
    if (heading) {
      current = heading;
      continue;
    }
    if (current) sections[current].push(line);
  }

  if (sections.summary.some(hasText)) {
    resume.summary = sections.summary.filter(hasText).join(" ").slice(0, 2000);
  }

  const experienceBlocks = splitSectionBlocks(sections.experience);
  resume.experience = experienceBlocks
    .map(parseExperienceBlock)
    .filter((entry): entry is ExperienceEntry => entry !== null);

  const educationBlocks = splitSectionBlocks(sections.education);
  resume.education = educationBlocks
    .map(parseEducationBlock)
    .filter((entry): entry is EducationEntry => entry !== null);

  const projectBlocks = splitSectionBlocks(sections.projects);
  resume.projects = projectBlocks
    .map(parseProjectBlock)
    .filter((entry): entry is ProjectEntry => entry !== null);

  const certificationBlocks = splitSectionBlocks(sections.certifications);
  resume.certifications = certificationBlocks
    .map(parseCertificationBlock)
    .filter((entry): entry is CertificationEntry => entry !== null);

  if (sections.skills.some(hasText)) {
    resume.skills = parseSkills(sections.skills.filter(hasText));
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
