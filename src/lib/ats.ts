import { ACTION_VERBS } from "./ats-data";
import { experienceYears, isQuantified, leadingWord, qualityChecks } from "./ats-quality";
import { hasText, resumeBullets, resumeText, skillItems } from "./ats-text";
import type { ResumeData } from "./resume-schema";

export { resumeBullets, resumeText, skillItems } from "./ats-text";
export {
  extractKeywords,
  matchKeywords,
  mergeSkillList,
  suggestSkillsField,
  type JobKeyword,
  type KeywordMatch,
} from "./ats-keywords";

export type AtsStatus = "pass" | "warn" | "fail";

export type AtsGroup = "contact" | "content" | "format";

export interface AtsCheck {
  id: string;
  label: string;
  status: AtsStatus;
  detail: string;
  weight: number;
  group: AtsGroup;
  /** Concrete lines or items from the resume that triggered the check. */
  examples?: string[];
}

export interface AtsReport {
  score: number;
  /** Score before honesty caps are applied. */
  rawScore: number;
  /** Why the score is capped, if it is. */
  caps: string[];
  verdict: string;
  checks: AtsCheck[];
  passed: number;
  warnings: number;
  failed: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clampScore(earned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

function verdictFor(score: number): string {
  if (score >= 85) return "Strong. Ready to send once tailored to the job.";
  if (score >= 70) return "Good, but a few fixes will make it stand out.";
  if (score >= 50) return "Needs work before you apply.";
  return "Not ready. Major gaps would get this screened out.";
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
  const unquantified = bullets.filter((line) => !isQuantified(line));
  const quantified = bullets.length - unquantified.length;
  const withoutVerb = bullets.filter((line) => !ACTION_VERBS.has(leadingWord(line)));
  const actionBullets = bullets.length - withoutVerb.length;
  const sample = (lines: string[]) =>
    lines.slice(0, 3).map((line) => (line.length > 110 ? `${line.slice(0, 109)}…` : line));

  const add = (
    id: string,
    label: string,
    status: AtsStatus,
    detail: string,
    weight: number,
    group: AtsGroup,
    examples?: string[],
  ) => checks.push({ id, label, status, detail, weight, group, examples });

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
      : quantified / bullets.length >= 0.5
        ? "pass"
        : quantified / bullets.length >= 0.25
          ? "warn"
          : "fail",
    bullets.length === 0
      ? "Add bullets before adding metrics."
      : `${quantified} of ${bullets.length} bullets include a number, percentage, or scale. Aim for at least half: say how much, how many, or how fast.`,
    10,
    "content",
    sample(unquantified),
  );

  add(
    "verbs",
    "Action verbs",
    bullets.length === 0
      ? "fail"
      : actionBullets / bullets.length >= 0.7
        ? "pass"
        : actionBullets / bullets.length >= 0.4
          ? "warn"
          : "fail",
    bullets.length === 0
      ? "Add bullets that start with a verb."
      : `${actionBullets} of ${bullets.length} bullets start with a strong action verb (for example built, led, reduced).`,
    6,
    "content",
    sample(withoutVerb),
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

  const completeProjects = data.projects.filter(
    (entry) => hasText(entry.title) && hasText(entry.description),
  );
  add(
    "projects",
    "Relevant projects",
    completeProjects.length > 0 ? "pass" : "warn",
    completeProjects.length > 0
      ? `${completeProjects.length} project${completeProjects.length === 1 ? "" : "s"} show practical experience.`
      : "Add one or two projects that demonstrate practical experience.",
    5,
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

  const years = experienceYears(data);
  const maxWords = years >= 10 ? 1000 : 750;
  add(
    "length",
    "Resume length",
    words.length >= 200 && words.length <= maxWords
      ? "pass"
      : words.length >= 100 && words.length <= maxWords * 1.3
        ? "warn"
        : "fail",
    words.length >= 200 && words.length <= maxWords
      ? `About ${words.length} words, a healthy length for your experience.`
      : words.length > maxWords
        ? `About ${words.length} words is too long${years < 10 ? " for under ten years of experience. Recruiters expect one page, two at most" : ""}. Cut older or weaker detail.`
        : `About ${words.length} words is thin. Add detail on what you achieved.`,
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

  checks.push(...qualityChecks(data));

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce(
    (sum, check) =>
      sum + (check.status === "pass" ? check.weight : check.status === "warn" ? check.weight / 2 : 0),
    0,
  );

  const rawScore = clampScore(earned, totalWeight);
  const statusOf = (id: string) => checks.find((check) => check.id === id)?.status;
  const caps: Array<[number, string]> = [];
  if (statusOf("name") === "fail" || statusOf("email") === "fail") {
    caps.push([40, "Recruiters cannot contact you without a name and email."]);
  }
  if (statusOf("experience") === "fail" && completeProjects.length === 0) {
    caps.push([55, "There is no work experience or project evidence yet."]);
  }
  if (bullets.length < 3) {
    caps.push([60, "Fewer than three achievement bullets gives a recruiter little to judge."]);
  }
  if (bullets.length > 0 && statusOf("numbers") === "fail") {
    caps.push([65, "Almost none of your bullets show measurable results."]);
  }
  if (statusOf("weak-phrases") === "fail") {
    caps.push([70, "Most bullets use vague wording instead of stating results."]);
  }
  if (statusOf("dates") === "fail") {
    caps.push([75, "Impossible dates undermine an otherwise good resume."]);
  }
  const ceiling = caps.length ? Math.min(...caps.map(([max]) => max)) : 100;
  const score = Math.min(rawScore, ceiling);

  return {
    score,
    rawScore,
    caps: score < rawScore ? caps.filter(([max]) => max === ceiling).map(([, why]) => why) : [],
    verdict: verdictFor(score),
    checks,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: checks.filter((check) => check.status === "fail").length,
  };
}
