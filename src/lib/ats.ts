import type { ResumeData, Skills } from "./resume-schema";

export type AtsStatus = "pass" | "warn" | "fail";

export type AtsGroup = "contact" | "content" | "format";

export interface AtsCheck {
  id: string;
  label: string;
  status: AtsStatus;
  detail: string;
  weight: number;
  group: AtsGroup;
}

export interface AtsReport {
  score: number;
  checks: AtsCheck[];
  passed: number;
  warnings: number;
  failed: number;
}

export interface JobKeyword {
  /** Normalised lowercase term used for matching. */
  term: string;
  /** Human readable label, preserving the casing found in the posting. */
  display: string;
  count: number;
}

export interface KeywordMatch {
  matched: string[];
  missing: string[];
  score: number;
}

const hasText = (value: string) => value.trim().length > 0;

/** Splits comma/enter separated skill text into clean items. */
export function skillItems(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const ACTION_VERBS = new Set([
  "achieved",
  "architected",
  "authored",
  "automated",
  "built",
  "coached",
  "collaborated",
  "consolidated",
  "created",
  "cut",
  "delivered",
  "designed",
  "developed",
  "diagnosed",
  "directed",
  "drove",
  "engineered",
  "enhanced",
  "established",
  "expanded",
  "generated",
  "grew",
  "implemented",
  "improved",
  "increased",
  "initiated",
  "integrated",
  "introduced",
  "launched",
  "led",
  "maintained",
  "managed",
  "mentored",
  "migrated",
  "optimised",
  "optimized",
  "orchestrated",
  "organised",
  "organized",
  "owned",
  "partnered",
  "performed",
  "pioneered",
  "planned",
  "produced",
  "reduced",
  "refactored",
  "resolved",
  "revamped",
  "saved",
  "scaled",
  "secured",
  "shipped",
  "simplified",
  "spearheaded",
  "standardised",
  "standardized",
  "streamlined",
  "supervised",
  "tested",
  "trained",
  "transformed",
  "wrote",
]);

/** Words that describe the posting rather than the skills being asked for. */
const JOB_STOPWORDS = new Set([
  "ability",
  "about",
  "above",
  "across",
  "additional",
  "advantage",
  "all",
  "also",
  "and",
  "any",
  "are",
  "benefits",
  "best",
  "both",
  "build",
  "candidate",
  "candidates",
  "can",
  "company",
  "compensation",
  "culture",
  "day",
  "days",
  "degree",
  "description",
  "desired",
  "develop",
  "development",
  "duties",
  "each",
  "either",
  "employee",
  "employer",
  "environment",
  "equal",
  "etc",
  "every",
  "excellent",
  "experience",
  "experienced",
  "familiar",
  "familiarity",
  "fast",
  "from",
  "full",
  "good",
  "great",
  "have",
  "help",
  "high",
  "hire",
  "how",
  "ideal",
  "including",
  "industry",
  "into",
  "job",
  "join",
  "knowledge",
  "look",
  "looking",
  "make",
  "many",
  "may",
  "minimum",
  "more",
  "most",
  "must",
  "need",
  "nice",
  "not",
  "offer",
  "one",
  "opportunity",
  "other",
  "our",
  "out",
  "plus",
  "position",
  "preferred",
  "provide",
  "qualification",
  "qualifications",
  "related",
  "required",
  "requirement",
  "requirements",
  "responsibilities",
  "responsibility",
  "role",
  "salary",
  "should",
  "skills",
  "some",
  "strong",
  "such",
  "team",
  "teams",
  "technical",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "time",
  "tools",
  "under",
  "using",
  "used",
  "here",
  "very",
  "want",
  "well",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "will",
  "with",
  "within",
  "work",
  "working",
  "would",
  "improve",
  "improving",
  "ensure",
  "ensuring",
  "deliver",
  "delivering",
  "support",
  "supporting",
  "participate",
  "collaborate",
  "collaborating",
  "produce",
  "seeking",
  "we",
  "will",
  "you",
  "your",
  "our",
  "their",
  "they",
  "this",
  "that",
  "these",
  "those",
  "year",
  "years",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Flattens the resume into plain text, the same text an ATS would read. */
export function resumeText(data: ResumeData): string {
  const { personal, skills } = data;
  const parts: string[] = [
    personal.name,
    personal.title,
    personal.phone,
    personal.email,
    personal.location,
    personal.linkedIn,
    personal.github,
    personal.portfolio,
    data.summary,
  ];

  for (const entry of data.experience) {
    parts.push(
      entry.company,
      entry.role,
      entry.startDate,
      entry.endDate,
      entry.current ? "Present" : "",
      entry.description,
    );
  }
  for (const entry of data.projects) {
    parts.push(entry.title, entry.link, entry.description);
  }
  for (const entry of data.education) {
    parts.push(entry.college, entry.degree, entry.startDate, entry.endDate);
  }
  for (const entry of data.certifications) {
    parts.push(entry.name, entry.issuer, entry.date, entry.link);
  }
  parts.push(skills.languages, skills.technologies, skills.databases, skills.spoken);

  return parts.filter(hasText).join("\n");
}

/** Achievement bullets exactly as they appear in the document. */
export function resumeBullets(data: ResumeData): string[] {
  return [...data.experience, ...data.projects]
    .flatMap((entry) => entry.description.split("\n"))
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function clampScore(earned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

/** Scores a resume against the checks an ATS and a recruiter care about. */
export function analyzeResume(data: ResumeData): AtsReport {
  const checks: AtsCheck[] = [];
  const bullets = resumeBullets(data);
  const text = resumeText(data);
  const words = text.split(/\s+/).filter(Boolean);
  const skills = Object.values(data.skills).reduce(
    (count, value) => count + skillItems(value).length,
    0,
  );
  const completeExperience = data.experience.filter(
    (entry) =>
      hasText(entry.company) &&
      hasText(entry.role) &&
      (hasText(entry.startDate) || entry.current),
  );
  const completeEducation = data.education.filter(
    (entry) => hasText(entry.college) || hasText(entry.degree),
  );
  const quantified = bullets.filter((line) => /\d/.test(line)).length;
  const actionBullets = bullets.filter((line) => {
    const first = line.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0] ?? "";
    return ACTION_VERBS.has(first.toLowerCase());
  }).length;

  const add = (
    id: string,
    label: string,
    status: AtsStatus,
    detail: string,
    weight: number,
    group: AtsGroup,
  ) => checks.push({ id, label, status, detail, weight, group });

  add(
    "name",
    "Full name",
    hasText(data.personal.name) ? "pass" : "fail",
    hasText(data.personal.name)
      ? "Recruiters and parsers can identify the document owner."
      : "Add your full name at the top of the resume.",
    8,
    "contact",
  );

  add(
    "email",
    "Professional email",
    !hasText(data.personal.email)
      ? "fail"
      : EMAIL_PATTERN.test(data.personal.email.trim())
        ? "pass"
        : "warn",
    !hasText(data.personal.email)
      ? "An email address is required on every application."
      : EMAIL_PATTERN.test(data.personal.email.trim())
        ? "A valid email address is present."
        : "That email address does not look valid.",
    8,
    "contact",
  );

  add(
    "phone",
    "Phone number",
    hasText(data.personal.phone) ? "pass" : "warn",
    hasText(data.personal.phone)
      ? "A phone number is present."
      : "Optional, but most recruiters expect a phone number.",
    5,
    "contact",
  );

  add(
    "location",
    "Location",
    hasText(data.personal.location) ? "pass" : "warn",
    hasText(data.personal.location)
      ? "Location is present and searchable."
      : "Add a city and country so location filters can match you.",
    4,
    "contact",
  );

  add(
    "title",
    "Professional title",
    hasText(data.personal.title) ? "pass" : "warn",
    hasText(data.personal.title)
      ? "A target job title helps keyword matching."
      : "Add the job title you are applying for, for example Frontend Developer.",
    5,
    "contact",
  );

  const links = [data.personal.linkedIn, data.personal.github, data.personal.portfolio];
  add(
    "links",
    "Online profiles",
    links.some(hasText) ? "pass" : "warn",
    links.some(hasText)
      ? "LinkedIn, GitHub, or a portfolio is included."
      : "Add at least one profile link recruiters can open.",
    3,
    "contact",
  );

  const summaryLength = data.summary.trim().length;
  add(
    "summary",
    "Professional summary",
    summaryLength === 0 ? "fail" : summaryLength < 40 ? "warn" : summaryLength > 700 ? "warn" : "pass",
    summaryLength === 0
      ? "Add a two or three sentence summary tailored to the job."
      : summaryLength < 40
        ? "The summary is very short. Aim for 40–600 characters."
        : summaryLength > 700
          ? "The summary is long. Keep it under about 700 characters."
          : "A concise summary is present.",
    8,
    "content",
  );

  add(
    "experience",
    "Work experience",
    completeExperience.length > 0
      ? "pass"
      : data.experience.some((entry) => hasText(entry.company) || hasText(entry.role))
        ? "warn"
        : "fail",
    completeExperience.length > 0
      ? `${completeExperience.length} role${completeExperience.length === 1 ? "" : "s"} with company, title, and dates.`
      : "Add a role with a company, job title, and start date.",
    12,
    "content",
  );

  add(
    "bullets",
    "Achievement bullets",
    bullets.length >= 3 ? "pass" : bullets.length > 0 ? "warn" : "fail",
    bullets.length >= 3
      ? `${bullets.length} bullets give the parser concrete achievements to read.`
      : "Add at least three bullet points describing what you achieved.",
    10,
    "content",
  );

  add(
    "numbers",
    "Measurable results",
    bullets.length === 0
      ? "fail"
      : quantified / bullets.length >= 0.4
        ? "pass"
        : quantified > 0
          ? "warn"
          : "fail",
    bullets.length === 0
      ? "Add bullets before adding metrics."
      : `${quantified} of ${bullets.length} bullets include a number, percentage, or scale.`,
    8,
    "content",
  );

  add(
    "verbs",
    "Action verbs",
    bullets.length === 0
      ? "fail"
      : actionBullets / bullets.length >= 0.5
        ? "pass"
        : actionBullets > 0
          ? "warn"
          : "fail",
    bullets.length === 0
      ? "Add bullets that start with a verb."
      : `${actionBullets} of ${bullets.length} bullets start with an action verb.`,
    6,
    "content",
  );

  add(
    "skills",
    "Skills section",
    skills >= 6 ? "pass" : skills > 0 ? "warn" : "fail",
    skills >= 6
      ? `${skills} skills are listed and searchable by keyword.`
      : "List at least six relevant tools, languages, or methods.",
    8,
    "content",
  );

  add(
    "education",
    "Education",
    completeEducation.length > 0 ? "pass" : "warn",
    completeEducation.length > 0
      ? "Education is present."
      : "Add a degree, course, or certification.",
    5,
    "content",
  );

  add(
    "format",
    "ATS-safe layout",
    data.template === "two-column" ? "warn" : "pass",
    data.template === "two-column"
      ? "Two-column layouts can be read out of order. Switch to the ATS safe template before applying."
      : "Single-column layout keeps the reading order predictable.",
    5,
    "format",
  );

  add(
    "length",
    "Resume length",
    words.length >= 150 && words.length <= 900
      ? "pass"
      : words.length >= 80 && words.length <= 1200
        ? "warn"
        : "fail",
    words.length >= 150 && words.length <= 900
      ? `About ${words.length} words — a healthy one page of content.`
      : `About ${words.length} words. Aim for roughly 250–800 words.`,
    4,
    "format",
  );

  add(
    "pronouns",
    "No first-person pronouns",
    /\b(i|me|my)\b/i.test([data.summary, ...bullets].join(" "))
      ? "warn"
      : "pass",
    /\b(i|me|my)\b/i.test([data.summary, ...bullets].join(" "))
      ? 'Replace "I", "me", and "my" with direct achievement statements.'
      : "Wording is neutral and professional.",
    3,
    "format",
  );

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce(
    (sum, check) =>
      sum + (check.status === "pass" ? check.weight : check.status === "warn" ? check.weight / 2 : 0),
    0,
  );

  return {
    score: clampScore(earned, totalWeight),
    checks,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: checks.filter((check) => check.status === "fail").length,
  };
}

/** Lowercase and strip punctuation so phrases compare predictably. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isKeywordWord = (word: string) =>
  word.length >= 2 && !JOB_STOPWORDS.has(word) && !/^\d+$/.test(word);

/**
 * Pulls the most useful terms out of a job description. Unigrams are ranked by
 * frequency; two-word phrases (e.g. "react native") are ranked higher because
 * they are more specific.
 */
export function extractKeywords(jobDescription: string, limit = 24): JobKeyword[] {
  const pattern = /[A-Za-z][A-Za-z0-9+#.]*/g;
  const tokens: Array<{
    raw: string;
    term: string;
    start: number;
    end: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(jobDescription)) !== null) {
    const raw = match[0].replace(/^[.]+|[.]+$/g, "");
    const term = normalize(raw);
    if (!term) continue;
    tokens.push({
      raw,
      term,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const counts = new Map<string, { display: string; count: number }>();

  const bump = (term: string, display: string, weight: number) => {
    const existing = counts.get(term);
    if (existing) {
      existing.count += weight;
    } else {
      counts.set(term, { display, count: weight });
    }
  };

  for (const token of tokens) {
    if (isKeywordWord(token.term)) bump(token.term, token.raw, 1);
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    if (!isKeywordWord(first.term) || !isKeywordWord(second.term)) continue;
    // Only join words that are genuinely adjacent ("React Native"), never
    // items in a comma-separated list ("React, TypeScript").
    if (!/^\s+$/.test(jobDescription.slice(first.end, second.start))) continue;
    bump(`${first.term} ${second.term}`, `${first.raw} ${second.raw}`, 2);
  }

  return [...counts.entries()]
    .map(([term, value]) => ({ term, display: value.display, count: value.count }))
    .sort(
      (a, b) =>
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
  const haystack = ` ${normalize(resumeText(data))} `;
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    if (haystack.includes(` ${keyword.term} `)) {
      matched.push(keyword.display);
    } else {
      missing.push(keyword.display);
    }
  }

  return {
    matched,
    missing,
    score: keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0,
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

/** Chooses the skills field that best fits a matched keyword. */
export function suggestSkillsField(term: string): keyof Skills {
  const value = term.toLowerCase();
  if (
    /(sql|postgres|mysql|mongo|redis|database|dynamo|sqlite|oracle|snowflake)/.test(value)
  ) {
    return "databases";
  }
  if (
    /(english|spanish|french|german|portuguese|mandarin|japanese|arabic|hindi)/.test(value)
  ) {
    return "spoken";
  }
  if (
    /^(javascript|typescript|python|java|kotlin|swift|ruby|php|go|golang|rust|scala|c\+\+|c#|c|elixir|haskell|perl|dart|bash)$/.test(
      value,
    )
  ) {
    return "languages";
  }
  return "technologies";
}
