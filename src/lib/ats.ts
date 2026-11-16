import { qualityChecks } from "./ats-quality";
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

export type AtsStatus = "pass" | "warn" | "fail" | "info";

export type AtsCategory =
  | "experience"
  | "skills"
  | "content"
  | "contact"
  | "structure"
  | "document";

export const CATEGORY_LABELS: Record<AtsCategory, string> = {
  experience: "Experience and achievements",
  skills: "Skills and technical evidence",
  content: "Content quality",
  contact: "Contact information",
  structure: "Structure and consistency",
  document: "Document compatibility",
};

export const CATEGORY_ORDER: AtsCategory[] = [
  "experience",
  "skills",
  "content",
  "contact",
  "structure",
  "document",
];

export interface AtsCheck {
  id: string;
  label: string;
  status: AtsStatus;
  detail: string;
  weight: number;
  category: AtsCategory;
  /** Concrete lines or items from the resume that triggered the check. */
  examples?: string[];
}

export interface AtsCategoryScore {
  id: AtsCategory;
  label: string;
  earned: number;
  total: number;
  percent: number;
}

export interface AtsReport {
  score: number;
  /** Score before genuine critical blockers are applied. */
  rawScore: number;
  /** Why the score is held back, if it is. */
  caps: string[];
  verdict: string;
  checks: AtsCheck[];
  categories: AtsCategoryScore[];
  passed: number;
  warnings: number;
  failed: number;
  info: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const round1 = (value: number) => Math.round(value * 10) / 10;

function clampScore(earned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

function verdictFor(score: number): string {
  if (score >= 90) return "Strong resume";
  if (score >= 80) return "Good resume";
  if (score >= 55) return "Needs work";
  return "Not ready";
}

/** Scores a resume against the checks a recruiter and parser care about. */
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
      hasText(entry.startDate) &&
      (hasText(entry.endDate) || entry.current),
  );
  const partialExperience = data.experience.some(
    (entry) =>
      hasText(entry.company) ||
      hasText(entry.role) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      entry.current,
  );
  const completeEducation = data.education.filter(
    (entry) => hasText(entry.college) && hasText(entry.degree),
  );
  const partialEducation = data.education.some(
    (entry) => hasText(entry.college) || hasText(entry.degree),
  );
  const completeProjects = data.projects.filter(
    (entry) => hasText(entry.title) && hasText(entry.description),
  );
  const bulletLineCount = (text: string) =>
    text
      .split("\n")
      .map((line) => line.replace(/^\s*[-•*▪◦●]\s*/, "").trim())
      .filter(Boolean).length;
  const completeRolesWithBullets = completeExperience.filter(
    (entry) => bulletLineCount(entry.description) > 0,
  );

  const add = (
    id: string,
    label: string,
    status: AtsStatus,
    detail: string,
    weight: number,
    category: AtsCategory,
    examples?: string[],
  ) => checks.push({ id, label, status, detail, weight, category, examples });

  /* ----------------------------- Contact -------------------------------- */
  add(
    "name",
    "Full name",
    hasText(data.personal.name) ? "pass" : "fail",
    hasText(data.personal.name)
      ? "Recruiters and parsers can identify the document owner."
      : "Add your full name at the top of the resume.",
    6,
    "contact",
  );

  const email = data.personal.email.trim();
  const validEmail = EMAIL_PATTERN.test(email);
  add(
    "email",
    "Professional email",
    !hasText(email) ? "fail" : validEmail ? "pass" : "warn",
    !hasText(email)
      ? "An email address is required on every application."
      : validEmail
        ? "A valid email address is present."
        : "That email address does not look valid.",
    6,
    "contact",
  );

  add(
    "phone",
    "Phone number",
    hasText(data.personal.phone) ? "pass" : "warn",
    hasText(data.personal.phone)
      ? "A phone number is present."
      : "Optional. Add one if you are comfortable with recruiters calling.",
    1,
    "contact",
  );

  add(
    "location",
    "Location",
    hasText(data.personal.location) ? "pass" : "warn",
    hasText(data.personal.location)
      ? "Location is present and searchable."
      : "Optional. A city and country can help location-based filters.",
    1,
    "contact",
  );

  add(
    "title",
    "Professional title",
    hasText(data.personal.title) ? "pass" : "warn",
    hasText(data.personal.title)
      ? "A target job title helps readers and keyword matches."
      : "Optional. Add the role you are targeting, for example Frontend Developer.",
    1,
    "contact",
  );

  const links = [data.personal.linkedIn, data.personal.github, data.personal.portfolio];
  add(
    "links",
    "Online profiles",
    links.some(hasText) ? "pass" : "info",
    links.some(hasText)
      ? "At least one profile link is included."
      : "Optional. Add LinkedIn, GitHub, or a portfolio if it supports your application. Missing profiles do not affect your score.",
    0,
    "contact",
  );

  /* --------------------------- Experience ------------------------------- */
  const experienceComplete =
    completeExperience.length > 0 &&
    completeRolesWithBullets.length === completeExperience.length;
  add(
    "experience",
    "Work experience",
    experienceComplete
      ? "pass"
      : partialExperience || completeProjects.length > 0
        ? "warn"
        : "fail",
    experienceComplete
      ? `${completeExperience.length} role${completeExperience.length === 1 ? "" : "s"} include a company or organization, job title, start date, end date or current status, and at least one achievement bullet.`
      : partialExperience
        ? completeExperience.length > 0
          ? "One or more roles are missing achievements or a company, title, start date, or end date/current status."
          : "Complete each role with a company or organization, job title, start date, and end date or current status."
        : completeProjects.length > 0
          ? "No work roles yet. Your projects can show practical evidence; add a role when you have one."
          : "Add a role with a company or organization, job title, start date, and end date or current status.",
    8,
    "experience",
  );

  add(
    "projects",
    "Relevant projects",
    completeProjects.length > 0 ? "pass" : "warn",
    completeProjects.length > 0
      ? `${completeProjects.length} project${completeProjects.length === 1 ? "" : "s"} include a title and description.`
      : "Optional but useful for graduates and career changers: add one or two projects with a title and a concrete description.",
    2,
    "experience",
  );

  add(
    "bullets",
    "Achievement bullets",
    bullets.length >= 3 ? "pass" : bullets.length > 0 ? "warn" : "fail",
    bullets.length >= 3
      ? `${bullets.length} bullets give the reader concrete contributions to assess.`
      : "Add at least three bullet points describing what you built, changed, or improved.",
    4,
    "experience",
  );

  /* ------------------------------ Skills -------------------------------- */
  add(
    "skills",
    "Skills section",
    skills >= 4 ? "pass" : skills > 0 ? "warn" : "fail",
    skills >= 4
      ? `${skills} skills are listed and searchable.`
      : skills > 0
        ? `${skills} skill${skills === 1 ? "" : "s"} listed. Add the tools and methods you actually use.`
        : "List the tools, languages, or methods you actually use.",
    9,
    "skills",
  );

  /* ------------------------------ Content ------------------------------- */
  const summaryLength = data.summary.trim().length;
  add(
    "summary",
    "Professional summary",
    summaryLength === 0
      ? "warn"
      : summaryLength < 40
        ? "warn"
        : summaryLength > 700
          ? "warn"
          : "pass",
    summaryLength === 0
      ? "Optional. A two or three sentence summary can help, but the rest of the resume matters more."
      : summaryLength < 40
        ? "The summary is very short. Add a sentence about your focus and evidence, or remove it."
        : summaryLength > 700
          ? "The summary is long. Keep it to a few focused sentences."
          : "A concise summary is present.",
    2,
    "content",
  );

  const firstPerson = /\b(i|me|my)\b/i.test([data.summary, ...bullets].join(" "));
  add(
    "pronouns",
    "No first-person pronouns",
    firstPerson ? "warn" : "pass",
    firstPerson
      ? 'Replace "I", "me", and "my" with direct achievement statements.'
      : "Wording is neutral and professional.",
    1,
    "content",
  );

  /* ----------------------------- Structure ------------------------------ */
  add(
    "education",
    "Education",
    completeEducation.length > 0 ? "pass" : "warn",
    completeEducation.length > 0
      ? "Each listed education entry has an institution and a qualification, degree, or course."
      : partialEducation
        ? "Add both the institution and the qualification, degree, or course for each education entry."
        : "Optional if your experience is strong, but most resumes include an institution and qualification, degree, or course.",
    3,
    "structure",
  );

  const lengthStatus: AtsStatus =
    words.length >= 150 && words.length <= 1100 ? "pass" : "warn";
  add(
    "length",
    "Resume length",
    lengthStatus,
    words.length > 1100
      ? `About ${words.length} words. That may be longer than needed; trim repetition and older detail. A two-page technical resume can still be appropriate.`
      : words.length >= 150
        ? `About ${words.length} words. Word count is a warning indicator, not a pass/fail rule.`
        : `About ${words.length} words. Very short resumes can be fine for graduates, but make sure there is enough evidence of what you did.`,
    2,
    "structure",
  );

  /* ----------------------------- Document ------------------------------- */
  add(
    "export-text",
    "Text-based export",
    "pass",
    "This document is rendered as real text, not a rasterized image, so parsers can extract it.",
    5,
    "document",
  );

  add(
    "pdf-verification",
    "Exported PDF verification",
    "info",
    data.template === "two-column"
      ? "Not evaluated from structured data. Export the PDF and check that text is selectable, the reading order is sensible, contact details are readable, and headings are identifiable. Two-column templates can be read out of order by some parsers."
      : "Not evaluated from structured data. Export the PDF and check that text is selectable, the reading order is sensible, and contact details and headings are readable.",
    0,
    "document",
  );

  checks.push(...qualityChecks(data));

  /* ------------------------------ Scoring ------------------------------- */
  const scored = checks.filter(
    (check) => check.status !== "info" && check.weight > 0,
  );
  const totalWeight = scored.reduce((sum, check) => sum + check.weight, 0);
  const earned = scored.reduce(
    (sum, check) =>
      sum +
      (check.status === "pass"
        ? check.weight
        : check.status === "warn"
          ? check.weight / 2
          : 0),
    0,
  );
  const rawScore = clampScore(earned, totalWeight);

  const categories: AtsCategoryScore[] = CATEGORY_ORDER.map((id) => {
    const categoryChecks = checks.filter(
      (check) =>
        check.category === id && check.status !== "info" && check.weight > 0,
    );
    const total = categoryChecks.reduce((sum, check) => sum + check.weight, 0);
    const categoryEarned = categoryChecks.reduce(
      (sum, check) =>
        sum +
        (check.status === "pass"
          ? check.weight
          : check.status === "warn"
            ? check.weight / 2
            : 0),
      0,
    );
    return {
      id,
      label: CATEGORY_LABELS[id],
      earned: round1(categoryEarned),
      total: round1(total),
      percent: total > 0 ? Math.round((categoryEarned / total) * 100) : 0,
    };
  });

  const statusOf = (id: string) => checks.find((check) => check.id === id)?.status;
  const caps: Array<[number, string]> = [];

  // Genuine blockers only. Everything else is handled by weighted deductions.
  if (statusOf("name") === "fail" || statusOf("email") === "fail") {
    caps.push([35, "A resume needs a name and a working email address before it can be sent."]);
  }
  if (statusOf("unresolved-placeholders") === "fail") {
    caps.push([
      60,
      "The resume still contains placeholder or instruction text. Replace bracketed prompts and TODO text with real content before sending it.",
    ]);
  }
  const hasAnyContent =
    data.experience.some(
      (entry) => hasText(entry.company) || hasText(entry.role) || hasText(entry.description),
    ) ||
    completeProjects.length > 0 ||
    partialEducation ||
    data.certifications.some(
      (entry) => hasText(entry.name) || hasText(entry.issuer),
    ) ||
    skills > 0 ||
    summaryLength > 0;
  if (!hasAnyContent) {
    caps.push([20, "There is no resume content to assess yet."]);
  }

  const ceiling = caps.length ? Math.min(...caps.map(([max]) => max)) : 100;
  const score = Math.min(rawScore, ceiling);

  return {
    score,
    rawScore,
    caps: score < rawScore ? caps.map(([, reason]) => reason) : [],
    verdict: verdictFor(score),
    checks,
    categories,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: checks.filter((check) => check.status === "fail").length,
    info: checks.filter((check) => check.status === "info").length,
  };
}
