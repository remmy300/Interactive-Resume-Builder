import { experienceYears, qualityChecks } from "./ats-quality";
import {
  applyCaps,
  explainScore,
  scoreCategories,
  scoreChecks,
  verdictFor,
  withWeights,
} from "./ats-scoring";
import { hasText, resumeBullets, resumeText, skillItems } from "./ats-text";
import type { AtsCheck, AtsReport, AtsStatus, AtsCategory } from "./ats-types";
import type { ResumeData } from "./resume-schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SECONDARY =
  /\b(secondary|high ?school|senior school|kcse|kcpe|a-?levels?|o-?levels?|gcse|ged)\b/i;

// Emoji and private-use symbols are often dropped or turned into stray
// characters when a parser reads the file back.
const PARSE_UNSAFE = new RegExp(
  "[\\p{Extended_Pictographic}\\uE000-\\uF8FF]",
  "u",
);

const bulletLineCount = (value: string) =>
  value
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*▪◦●]\s*/, "").trim())
    .filter(Boolean).length;
function lengthLimit(years: number): number {
  if (years >= 10) return 1400;
  if (years >= 3) return 1100;
  return 800;
}

export function analyzeResume(data: ResumeData, now = new Date()): AtsReport {
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
  const completeRolesWithBullets = completeExperience.filter(
    (entry) => bulletLineCount(entry.description) > 0,
  );
  const years = experienceYears(data, now);

  const add = (
    id: string,
    label: string,
    status: AtsStatus,
    detail: string,
    category: AtsCategory,
    examples?: string[],
  ) =>
    checks.push({ id, label, status, detail, weight: 0, category, examples });

  /*  Contact  */

  add(
    "name",
    "Full name",
    hasText(data.personal.name) ? "pass" : "fail",
    hasText(data.personal.name)
      ? "Recruiters and parsers can identify the document owner."
      : "Add your full name at the top of the resume.",
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
    "contact",
  );

  add(
    "title",
    "Professional title",
    hasText(data.personal.title) ? "pass" : "warn",
    hasText(data.personal.title)
      ? "A target job title helps readers and keyword matches."
      : "Recommended. Add the role you are targeting, for example Frontend Developer.",
    "contact",
  );

  add(
    "phone",
    "Phone number",
    hasText(data.personal.phone) ? "pass" : "info",
    hasText(data.personal.phone)
      ? "A phone number is present."
      : "Optional. Add one if you are comfortable with recruiters calling. It does not affect your score.",
    "contact",
  );

  add(
    "location",
    "Location",
    hasText(data.personal.location) ? "pass" : "info",
    hasText(data.personal.location)
      ? "Location is present and searchable."
      : "Optional. A city and country can help location-based filters. It does not affect your score.",
    "contact",
  );

  const links = [
    data.personal.linkedIn,
    data.personal.github,
    data.personal.portfolio,
  ];
  add(
    "links",
    "Online profiles",
    links.some(hasText) ? "pass" : "info",
    links.some(hasText)
      ? "At least one profile link is included."
      : "Optional. Add LinkedIn, GitHub, or a portfolio if it supports your application. Missing profiles do not affect your score.",
    "contact",
  );

  /* Experience  */
  const experienceComplete =
    completeExperience.length > 0 &&
    completeRolesWithBullets.length === completeExperience.length;
  const projectsOnly = !partialExperience && completeProjects.length > 0;
  add(
    "experience",
    "Work experience",
    experienceComplete || projectsOnly
      ? "pass"
      : partialExperience
        ? "warn"
        : "fail",
    experienceComplete
      ? `${completeExperience.length} role${completeExperience.length === 1 ? "" : "s"} include a company or organization, job title, start date, end date or current status, and at least one achievement bullet.`
      : projectsOnly
        ? "No work roles, so your projects carry the experience. That is a fair way to show practical skills; add a role when you have one."
        : partialExperience
          ? completeExperience.length > 0
            ? "One or more roles are missing achievements or a company, title, start date, or end date/current status."
            : "Complete each role with a company or organization, job title, start date, and end date or current status."
          : "Add a role or a project with a concrete description so there is evidence of what you can do.",
    "experience",
  );

  const hasWork = completeExperience.length > 0;
  add(
    "projects",
    "Relevant projects",
    completeProjects.length > 0 ? "pass" : hasWork ? "info" : "warn",
    completeProjects.length > 0
      ? `${completeProjects.length} project${completeProjects.length === 1 ? "" : "s"} include a title and description.`
      : hasWork
        ? "Optional. Your work history already shows practical experience."
        : "Add one or two projects with a title and a concrete description to show practical skills.",
    "experience",
  );

  add(
    "bullets",
    "Achievement bullets",
    bullets.length >= 3 ? "pass" : bullets.length > 0 ? "warn" : "fail",
    bullets.length >= 3
      ? `${bullets.length} bullets give the reader concrete contributions to assess.`
      : "Add at least three bullet points describing what you built, changed, or improved.",
    "experience",
  );

  /*  Skills - */
  add(
    "skills",
    "Skills section",
    skills >= 4 ? "pass" : skills > 0 ? "warn" : "fail",
    skills >= 4
      ? `${skills} skills are listed and searchable.`
      : skills > 0
        ? `${skills} skill${skills === 1 ? "" : "s"} listed. Add the tools and methods you actually use.`
        : "List the tools, languages, or methods you actually use.",
    "skills",
  );

  /* Content  */
  const summaryLength = data.summary.trim().length;
  add(
    "summary",
    "Professional summary",
    summaryLength === 0
      ? "info"
      : summaryLength < 40 || summaryLength > 700
        ? "warn"
        : "pass",
    summaryLength === 0
      ? "Optional. A two or three sentence summary can help, but the rest of the resume matters more."
      : summaryLength < 40
        ? "The summary is very short. Add a sentence about your focus and evidence, or remove it."
        : summaryLength > 700
          ? "The summary is long. Keep it to a few focused sentences."
          : "A concise summary is present.",
    "content",
  );

  const firstPerson = /\b(i|me|my)\b/i.test(
    [data.summary, ...bullets].join(" "),
  );
  add(
    "pronouns",
    "No first-person pronouns",
    firstPerson ? "warn" : "pass",
    firstPerson
      ? 'Replace "I", "me", and "my" with direct achievement statements.'
      : "Wording is neutral and professional.",
    "content",
  );

  /*  Structure  */
  const onlySecondary =
    completeEducation.length > 0 &&
    completeEducation.every((entry) =>
      SECONDARY.test(`${entry.college} ${entry.degree}`),
    );

  const experienceCarries = completeRolesWithBullets.length > 0 && years >= 2;
  const educationStatus: AtsStatus =
    completeEducation.length > 0 && !onlySecondary
      ? "pass"
      : completeEducation.length === 0 && !partialEducation && experienceCarries
        ? "info"
        : "warn";
  add(
    "education",
    "Education",
    educationStatus,
    onlySecondary
      ? "Only secondary school is listed. Employers usually expect a degree, diploma, bootcamp or certification here. Add one if you have it (including online courses and certificates)."
      : completeEducation.length > 0
        ? "Each listed education entry has an institution and a qualification, degree, or course."
        : partialEducation
          ? "Add both the institution and the qualification, degree, or course for each education entry."
          : educationStatus === "info"
            ? "Optional here: your work history already carries the resume. Add a qualification or course if you have one."
            : "Most resumes include an institution and qualification, degree, or course. Add yours, or a certificate or course if you have no degree.",
    "structure",
  );

  const limit = lengthLimit(years);
  const lengthStatus: AtsStatus =
    words.length >= 120 && words.length <= limit ? "pass" : "warn";
  add(
    "length",
    "Resume length",
    lengthStatus,
    words.length > limit
      ? `About ${words.length} words. For ${years >= 3 ? "this much experience" : "your level of experience"} that is on the long side; trim repetition and older detail.`
      : words.length >= 120
        ? `About ${words.length} words. Length is a guide, not a rule: relevance matters more than the count.`
        : `About ${words.length} words. Very short resumes can be fine for graduates, but make sure there is enough evidence of what you did.`,
    "structure",
  );

  /* ----------------------------- Document ------------------------------- */
  add(
    "export-text",
    "Text-based export",
    "pass",
    "This document is rendered as real text, not a rasterized image, so parsers can extract it.",
    "document",
  );

  const unsafe = text.match(new RegExp(PARSE_UNSAFE.source, "gu")) ?? [];
  add(
    "parse-safe-text",
    "Characters parsers can read",
    unsafe.length === 0 ? "pass" : "warn",
    unsafe.length === 0
      ? "The text uses ordinary characters that parsers read reliably."
      : `${unsafe.length} emoji or symbol character${unsafe.length === 1 ? "" : "s"} found. Parsers often drop them or show stray characters, so use plain text.`,
    "document",
    unsafe.length === 0 ? undefined : [...new Set(unsafe)].slice(0, 3),
  );

  add(
    "pdf-verification",
    "Exported PDF verification",
    "info",
    data.template === "two-column"
      ? "Not evaluated from structured data. Export the PDF and check that text is selectable, the reading order is sensible, contact details are readable, and headings are identifiable. Two-column templates can be read out of order by some parsers."
      : "Not evaluated from structured data. Export the PDF and check that text is selectable, the reading order is sensible, and contact details and headings are readable.",
    "document",
  );

  checks.push(...qualityChecks(data, now));

  /*  Scoring  */
  const weighted = withWeights(checks);
  const qualityChecksOnly = weighted.filter(
    (check) => check.category !== "document",
  );
  const documentChecks = weighted.filter(
    (check) => check.category === "document",
  );

  const quality = scoreChecks(qualityChecksOnly);
  const rawScore = quality.percent;

  const statusOf = (id: string) =>
    weighted.find((check) => check.id === id)?.status;
  const hasAnyContent =
    data.experience.some(
      (entry) =>
        hasText(entry.company) ||
        hasText(entry.role) ||
        hasText(entry.description),
    ) ||
    completeProjects.length > 0 ||
    partialEducation ||
    data.certifications.some(
      (entry) => hasText(entry.name) || hasText(entry.issuer),
    ) ||
    skills > 0 ||
    summaryLength > 0;
  const hasPracticalEvidence =
    data.experience.some((entry) => hasText(entry.description)) ||
    completeProjects.length > 0;

  const { score, applied } = applyCaps(rawScore, {
    statusOf,
    hasAnyContent,
    hasPracticalEvidence,
  });
  const verdict = verdictFor(score);

  const documentScore = scoreChecks(documentChecks);
  const documentHasScore = documentScore.total > 0;

  return {
    score,
    rawScore,
    caps: applied.map((cap) => cap.reason),
    capDetails: applied,
    verdict,
    checks: weighted,
    categories: scoreCategories(weighted),
    breakdown: explainScore(qualityChecksOnly),
    quality: { score, verdict },
    document: {
      score: documentHasScore ? documentScore.percent : null,
      verdict: !documentHasScore
        ? "Not assessed"
        : documentScore.percent >= 90
          ? "Reads reliably"
          : documentScore.percent >= 60
            ? "Some risk"
            : "At risk",
      checks: documentChecks,
    },
    passed: weighted.filter((check) => check.status === "pass").length,
    warnings: weighted.filter((check) => check.status === "warn").length,
    failed: weighted.filter((check) => check.status === "fail").length,
    info: weighted.filter((check) => check.status === "info").length,
  };
}
