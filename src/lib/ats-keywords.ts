import { JOB_STOPWORDS } from "./ats-data";
import {
  CASE_SENSITIVE_TERMS,
  SKILL_ALIASES,
  SKILL_LOOKUP,
  looksTechnical,
  normalizeTerm,
} from "./ats-skills";
import { resumeText, skillItems } from "./ats-text";
import type { ResumeData, Skills } from "./resume-schema";

export interface JobKeyword {
  /** Normalised lowercase term used for matching. */
  term: string;
  /** Human readable label, preserving the canonical skill casing. */
  display: string;
  count: number;
  /**
   * Relative importance of this requirement. Must-have wording, repetition,
   * and multi-word specificity all raise the weight.
   */
  weight: number;
}

export interface KeywordMatch {
  matched: string[];
  missing: string[];
  score: number;
}

interface Token {
  raw: string;
  term: string;
  start: number;
  end: number;
}

interface FoundKeyword {
  display: string;
  count: number;
  weight: number;
}

const MAX_PHRASE_WORDS = 4;
const DEFAULT_WEIGHT = 1.5;
const REQUIREMENT_WEIGHT = 3;
const RESPONSIBILITY_WEIGHT = 2;
const NICE_WEIGHT = 1.5;

const ROLE_TITLE_WORDS =
  /\b(?:engineer|engineering|developer|development|manager|management|analyst|analysis|designer|architect|scientist|consultant|specialist|director|coordinator|administrator|assistant|associate|intern|internship|lead|principal|staff|officer|executive|technician|supervisor|representative|recruiter|head)\b/i;

/**
 * Words that are too generic to identify a company on their own. They stay out
 * of the company-term set so a company called "Brightside Media" cannot make
 * the extractor ignore every line containing "media".
 */
const COMPANY_GENERIC_WORDS = new Set([
  "corp",
  "corporation",
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "company",
  "co",
  "group",
  "holdings",
  "labs",
  "lab",
  "media",
  "social",
  "content",
  "creative",
  "brand",
  "branding",
  "digital",
  "online",
  "global",
  "international",
  "national",
  "regional",
  "local",
  "partners",
  "partner",
  "consulting",
  "consultancy",
  "services",
  "service",
  "solutions",
  "solution",
  "systems",
  "system",
  "technologies",
  "technology",
  "tech",
  "ventures",
  "capital",
  "bank",
  "banking",
  "health",
  "healthcare",
  "finance",
  "financial",
  "insurance",
  "agency",
  "studio",
  "studios",
  "works",
  "collective",
  "network",
  "networks",
  "university",
  "college",
  "institute",
  "school",
  "academy",
  "foundation",
  "trust",
  "association",
  "society",
  "council",
  "center",
  "centre",
  "industries",
  "manufacturing",
  "logistics",
  "retail",
  "enterprises",
  "enterprise",
  "startup",
  "start-up",
  "marketing",
  "sales",
  "growth",
  "product",
  "project",
  "program",
  "data",
  "cloud",
  "mobile",
  "web",
  "software",
  "hardware",
  "security",
  "analytics",
  "research",
  "design",
  "development",
  "engineering",
  "operations",
  "people",
  "talent",
  "customer",
  "client",
  "user",
  "business",
  "market",
  "commerce",
  "ecommerce",
  "payments",
  "payment",
  "education",
  "learning",
  "travel",
  "food",
  "energy",
  "property",
  "legal",
  "law",
  "tax",
  "audit",
  "risk",
  "compliance",
  "supply",
  "chain",
  "industrial",
  "automotive",
  "aerospace",
  "pharma",
  "pharmaceutical",
  "biotech",
  "medical",
  "clinical",
  "care",
  "investment",
  "asset",
  "wealth",
  "fintech",
  "edtech",
  "healthtech",
  "proptech",
  "adtech",
  "martech",
  "saas",
  "platform",
  "app",
  "apps",
]);

const SECTION_HEADING =
  /^(?:requirements?|basic qualifications?|minimum qualifications?|preferred qualifications?|must[- ]haves?|what you(?:'|’)ll need|what you need|what we(?:'|’)re looking for|who we(?:'|’)re looking for|who you are|about you|your (?:experience|skills|background)|skills? (?:and|&) experience|experience (?:and|&) skills|experience|education|responsibilities|your responsibilities|what you(?:'|’)ll do|the role|about the role|in this role|day[- ]to[- ]day|duties|nice[- ]to[- ]have|bonus points|benefits?|perks?|compensation|what we offer|why join|about (?:us|the company)|our (?:mission|values|culture)|how to apply)\s*:?$/i;

const EXCLUDE_CUES =
  /\b(benefits?|perks?|compensation|salary|health insurance|dental insurance|vision insurance|life insurance|insurance benefits|vacation|paid time off|pto|401k|retirement|stock options|equity compensation|equity grant|parental leave|equal opportunity|eoe|diversity|inclusion|accommodation|accommodations|disability|veteran|veterans|background check|drug test|work authorization|authorized to work|right to work|visa sponsorship|no agencies|recruiters?|how to apply|apply now|about us|about the company|our mission|our values|our culture|why join|what we offer|we offer)\b/i;

const REQUIREMENT_CUES =
  /\b(required|requires?|needs?|requirements?|must[- ]have|proficien\w*|experience|knowledge of|familiarity with|hands[- ]on|qualifications?|what you(?:'|’)ll need|what you need|what we(?:'|’)re looking for|who we(?:'|’)re looking for|who you are|about you|you have|you bring|your experience|your skills|your background|looking for|hiring|skills?)\b/i;

const RESPONSIBILITY_CUES =
  /\b(responsibilities|your responsibilities|what you(?:'|’)ll do|you will|day[- ]to[- ]day|duties|the role|about the role|in this role)\b/i;

const NICE_CUES =
  /\b(nice[- ]to[- ]have|preferred|bonus|plus|advantage)\b/i;

const BENEFIT_START =
  /^(?:benefits?|perks?|compensation|what we offer|why join|about (?:us|the company)|our (?:mission|values|culture)|how to apply|equal opportunity|eoe)\b/i;

const startsUppercase = (value: string) => /^[A-Z]/.test(value);

function headingWeight(text: string): number {
  if (BENEFIT_START.test(text)) return 0;
  if (/^(?:nice|preferred|bonus|plus|advantage)\b/i.test(text) && NICE_CUES.test(text)) {
    return NICE_WEIGHT;
  }
  if (REQUIREMENT_CUES.test(text)) return REQUIREMENT_WEIGHT;
  if (NICE_CUES.test(text)) return NICE_WEIGHT;
  if (RESPONSIBILITY_CUES.test(text)) return RESPONSIBILITY_WEIGHT;
  if (EXCLUDE_CUES.test(text)) return 0;
  return DEFAULT_WEIGHT;
}

/** Weight for a normal line, based on the wording used on that line. */
function cueWeight(text: string): number | null {
  // A benefits heading overrides everything else on that line.
  if (BENEFIT_START.test(text)) return 0;
  // "Preferred qualifications" is a nice-to-have heading, not a hard requirement.
  if (/^(?:nice|preferred|bonus|plus|advantage)\b/i.test(text) && NICE_CUES.test(text)) {
    return NICE_WEIGHT;
  }
  // Requirement wording wins over a benefit phrase later in the same sentence
  // ("experience with health insurance systems").
  if (REQUIREMENT_CUES.test(text)) return REQUIREMENT_WEIGHT;
  if (NICE_CUES.test(text)) return NICE_WEIGHT;
  if (RESPONSIBILITY_CUES.test(text)) return RESPONSIBILITY_WEIGHT;
  if (EXCLUDE_CUES.test(text)) return 0;
  return null;
}

function isSectionHeading(text: string): boolean {
  return text.length <= 90 && SECTION_HEADING.test(text.trim());
}

/** A standalone job title is not a requirement ("Senior Frontend Engineer"). */
function isJobTitleLine(text: string): boolean {
  return (
    text.length <= 100 &&
    !/[.!?]$/.test(text) &&
    text.split(/\s+/).length <= 10 &&
    ROLE_TITLE_WORDS.test(text) &&
    !/\b(?:we|you|are|is|looking|seeking|join|hiring|need|want)\b/i.test(text)
  );
}

function mentionsCompany(text: string, companyTerms: Set<string>): boolean {
  return normalizeTerm(text)
    .split(" ")
    .filter(Boolean)
    .some((term) => companyTerms.has(term));
}

/** Splits a line into sentences without relying on lookbehind support. */
function splitSentences(text: string): string[] {
  const parts: string[] = [];
  const boundary = /[.!?]\s+/g;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = boundary.exec(text)) !== null) {
    parts.push(text.slice(start, match.index + 1));
    start = match.index + match[0].length;
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

const CLAUSE_SPLIT =
  /\s*;\s*|\s+(?=(?:benefits?|perks?|compensation|what we offer|why join|about us|about the company|requirements?|qualifications?|responsibilities|nice[- ]to[- ]have|preferred qualifications?)\s*:)/i;

/**
 * A single pasted line often contains more than one section ("Requirements:
 * React. Benefits: salary"). Weight each clause on its own so a benefits
 * sentence cannot erase the requirements beside it.
 */
function lineChunks(
  line: string,
  sectionWeight: number,
): Array<{ text: string; weight: number }> {
  return splitSentences(line)
    .flatMap((sentence) => sentence.split(CLAUSE_SPLIT))
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, weight: cueWeight(text) ?? sectionWeight }))
    .filter((chunk) => chunk.weight > 0);
}

/**
 * Finds company names so they cannot be mistaken for skills. This is
 * intentionally conservative: known skills always win, and only capitalised
 * phrases in typical company positions are captured.
 */
function detectCompanyTerms(text: string): Set<string> {
  const terms = new Set<string>();

  const add = (value: string) => {
    const normalized = normalizeTerm(value);
    if (!normalized) return;
    const parts = normalized.split(" ").filter(Boolean);
    if (parts.length === 0) return;

    const meaningful = parts.filter(
      (part) =>
        part.length > 1 &&
        !JOB_STOPWORDS.has(part) &&
        !ROLE_TITLE_WORDS.test(part) &&
        !SKILL_LOOKUP.has(part) &&
        !COMPANY_GENERIC_WORDS.has(part),
    );
    if (meaningful.length === 0) return;

    terms.add(normalized);
    for (const part of meaningful) terms.add(part);
  };

  const patterns = [
    /\b(?:at|join|joining|about|from)\s+([A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*){0,3})/g,
    /\b([A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*){0,3})\s+(?:is|are)\s+(?:a|an|the|hiring|looking|seeking|building|growing|on a mission)/g,
    /^(?:company|employer|organization|organisation)\s*:\s*(.+)$/gim,
    /^about\s+([A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*){0,3})\s*$/gim,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      add(match[1]);
    }
  }

  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine && firstLine.length <= 100) {
    const withSeparator = firstLine.match(
      /^([A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*){0,3})\s*(?:[-–—|:·]|\s{2,})/,
    );
    if (withSeparator) {
      add(withSeparator[1]);
    } else if (
      /^[A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*){0,2}$/.test(firstLine)
    ) {
      add(firstLine);
    }
  }

  return terms;
}

function tokenize(line: string): Token[] {
  const pattern = /[.#]?[A-Za-z][A-Za-z0-9+#.]*/g;
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    const raw = match[0].replace(/[.]+$/, "");
    if (!raw) continue;
    const term = normalizeTerm(raw);
    if (!term) continue;
    tokens.push({
      raw,
      term,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

function isKeywordWord(token: Token): boolean {
  return (
    token.term.length >= 2 &&
    !JOB_STOPWORDS.has(token.term) &&
    !/^\d+$/.test(token.term)
  );
}

/**
 * Pulls the most useful requirements out of a job description.
 *
 * Only known skills/tools and technical-looking tokens survive. Terms found in
 * benefits/about-the-company prose are dropped, and wording such as "required"
 * or "must have" makes a term count for more than a passing mention.
 */
export function extractKeywords(jobDescription: string, limit = 24): JobKeyword[] {
  const companyTerms = detectCompanyTerms(jobDescription);
  const found = new Map<string, FoundKeyword>();

  const add = (term: string, display: string, weight: number) => {
    if (weight <= 0) return;
    const existing = found.get(term);
    if (existing) {
      existing.count += 1;
      existing.weight = Math.max(existing.weight, weight);
    } else {
      found.set(term, { display, count: 1, weight });
    }
  };

  let sectionWeight = DEFAULT_WEIGHT;
  let seenFirstLine = false;

  for (const line of jobDescription.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!seenFirstLine) {
      seenFirstLine = true;
      if (isJobTitleLine(trimmed)) continue;
    }

    if (isSectionHeading(trimmed)) {
      sectionWeight = headingWeight(trimmed);
    }

    // Company blurbs ("Acme Corp is a fast-growing company…") are not
    // requirements. Keep the line when it also contains requirement wording.
    if (cueWeight(trimmed) === null && mentionsCompany(trimmed, companyTerms)) {
      continue;
    }

    for (const chunk of lineChunks(line, sectionWeight)) {
      const { text, weight } = chunk;
      const tokens = tokenize(text);
      if (tokens.length === 0) continue;
      const consumed = new Set<number>();

      // Prefer the longest known phrase at each position ("React Native" before
      // "React"; "end to end testing" before "testing").
      for (let index = 0; index < tokens.length; index += 1) {
        if (consumed.has(index)) continue;
        const maxWords = Math.min(MAX_PHRASE_WORDS, tokens.length - index);

        for (let size = maxWords; size >= 1; size -= 1) {
          const slice = tokens.slice(index, index + size);
          let adjacent = true;
          for (let offset = 0; offset < slice.length - 1; offset += 1) {
            const between = text.slice(
              slice[offset].end,
              slice[offset + 1].start,
            );
            // Whitespace, slash, ampersand and hyphen keep phrases together;
            // commas and the word "and" start a new list item.
            if (!/^[\s/&-]+$/.test(between)) {
              adjacent = false;
              break;
            }
          }
          if (!adjacent) continue;

          const phrase = slice
            .map((token) => token.term)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          const definition = SKILL_LOOKUP.get(phrase);
          if (!definition) continue;
          if (
            size === 1 &&
            CASE_SENSITIVE_TERMS.has(phrase) &&
            !startsUppercase(slice[0].raw)
          ) {
            continue;
          }

          add(
            definition.term,
            definition.display,
            weight + (size > 1 ? 1 : 0),
          );
          for (let offset = 0; offset < size; offset += 1) {
            consumed.add(index + offset);
          }
          break;
        }
      }

      // Unknown but technical-looking tokens (S3, ETL, GraphQL, …). Everything
      // else is ordinary prose, a company name, or a location.
      for (let index = 0; index < tokens.length; index += 1) {
        if (consumed.has(index)) continue;
        const token = tokens[index];
        if (!isKeywordWord(token)) continue;
        if (companyTerms.has(token.term)) continue;

        const definition = SKILL_LOOKUP.get(token.term);
        if (definition) {
          if (
            CASE_SENSITIVE_TERMS.has(token.term) &&
            !startsUppercase(token.raw)
          ) {
            continue;
          }
          add(definition.term, definition.display, weight);
          continue;
        }

        if (looksTechnical(token.raw, token.term)) {
          add(token.term, token.raw, weight);
        }
      }
    }
  }

  return [...found.entries()]
    .map(([term, value]) => ({
      term,
      display: value.display,
      count: value.count,
      // Repetition matters, but a term repeated ten times should not drown out
      // the rest of the posting.
      weight: value.weight + Math.min(value.count - 1, 2) * 0.5,
    }))
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        b.count - a.count ||
        b.term.length - a.term.length ||
        a.term.localeCompare(b.term),
    )
    .slice(0, limit);
}

/** Compares the resume text with the job keywords, ignoring case. */
export function matchKeywords(
  data: ResumeData,
  keywords: JobKeyword[],
): KeywordMatch {
  const haystack = ` ${normalizeTerm(resumeText(data))} `;
  const matched: JobKeyword[] = [];
  const missing: JobKeyword[] = [];

  for (const keyword of keywords) {
    const aliases = SKILL_ALIASES.get(keyword.term) ?? [keyword.term];
    const present = aliases.some((alias) =>
      haystack.includes(` ${alias} `),
    );
    (present ? matched : missing).push(keyword);
  }

  const totalWeight = keywords.reduce((sum, keyword) => sum + keyword.weight, 0);
  const matchedWeight = matched.reduce((sum, keyword) => sum + keyword.weight, 0);

  const byWeight = (a: JobKeyword, b: JobKeyword) =>
    b.weight - a.weight || b.count - a.count || a.display.localeCompare(b.display);

  return {
    matched: matched.sort(byWeight).map((keyword) => keyword.display),
    missing: missing.sort(byWeight).map((keyword) => keyword.display),
    score: totalWeight
      ? Math.round((matchedWeight / totalWeight) * 100)
      : 0,
  };
}

/** Appends new skills without duplicating existing ones (case-insensitive). */
export function mergeSkillList(existing: string, additions: string[]): string {
  const items = skillItems(existing);
  const seen = new Set(items.map((item) => item.toLowerCase()));

  for (const addition of additions) {
    const trimmed = addition.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    items.push(trimmed);
    seen.add(trimmed.toLowerCase());
  }

  return items.join(", ");
}

const LANGUAGE_SKILLS = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "kotlin",
  "swift",
  "objective-c",
  "ruby",
  "php",
  "go",
  "golang",
  "rust",
  "scala",
  "c++",
  "c#",
  "f#",
  "elixir",
  "erlang",
  "haskell",
  "clojure",
  "perl",
  "dart",
  "lua",
  "matlab",
  "julia",
  "bash",
  "powershell",
  "solidity",
  "visual basic",
  "vb.net",
  "vba",
]);

const SPOKEN_LANGUAGES =
  /(english|spanish|french|german|portuguese|italian|dutch|russian|mandarin|cantonese|japanese|korean|arabic|hindi|turkish|polish|swedish|norwegian|danish|finnish|greek|hebrew|vietnamese|thai|indonesian|malay|swahili|zulu|afrikaans|bilingual|multilingual)/i;

const DATABASE_SKILLS =
  /(sql|postgres|mysql|maria|mongo|redis|database|dynamo|sqlite|oracle|snowflake|bigquery|redshift|databricks|cassandra|elasticsearch|opensearch|neo4j|clickhouse|sql server|warehouse)/i;

/** Chooses the skills field that best fits a matched keyword. */
export function suggestSkillsField(term: string): keyof Skills {
  const value = term.toLowerCase();
  if (DATABASE_SKILLS.test(value)) return "databases";
  if (SPOKEN_LANGUAGES.test(value)) return "spoken";
  if (LANGUAGE_SKILLS.has(value)) return "languages";
  return "technologies";
}
