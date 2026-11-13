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
  /** Zero-weight checks are displayed as guidance but do not affect the score. */
  weight: number;
  group: AtsGroup;
  examples?: string[];
}

export interface AtsReport {
  /** General resume-content score. It is not an employer ATS ranking. */
  score: number;
  rawScore: number;
  /** Retained for compatibility with the existing CV Check UI. */
  caps: string[];
  verdict: string;
  checks: AtsCheck[];
  passed: number;
  warnings: number;
  failed: number;
  categoryScores: Record<AtsGroup, number | null>;
  scoreLabel: "Resume quality score";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function statusValue(status: AtsStatus): number {
  if (status === "pass") return 1;
  if (status === "warn") return 0.5;
  return 0;
}

function scoreChecks(checks: AtsCheck[]): number {
  const applicable = checks.filter((check) => check.weight > 0);
  const totalWeight = applicable.reduce((sum, check) => sum + check.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = applicable.reduce(
    (sum, check) => sum + check.weight * statusValue(check.status),
    0,
  );
  return Math.round((earned / totalWeight) * 100);
}

function scoreGroup(checks: AtsCheck[], group: AtsGroup): number | null {
  const selected = checks.filter((check) => check.group === group && check.weight > 0);
  if (selected.length === 0) return null;
  return scoreChecks(selected);
}

function verdictFor(score: number): string {
  if (score >= 90) return "Strong resume foundation. Review the job-specific requirements before applying.";
  if (score >= 80) return "Good resume foundation. A few targeted improvements may help.";
  if (score >= 70) return "Several improvements could make the resume clearer and more complete.";
  if (score >= 60) return "The resume has some content gaps worth addressing.";
  return "The resume needs more complete and specific information.";
}

/**
 * Evaluates structured resume content. Document parsing and job-specific
 * matching are separate assessments and must not be inferred from this score.
 */
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
      (entry.current || hasText(entry.endDate)),
  );
  const completeProjects = data.projects.filter(
    (entry) => hasText(entry.title) && hasText(entry.description),
  );
  const completeEducation = data.education.filter(
    (entry) => hasText(entry.college) || hasText(entry.degree),
  );
  const quantified = bullets.filter(isQuantified).length;
  const actionBullets = bullets.filter((line) => ACTION_VERBS.has(leadingWord(line))).length;
  const sample = (lines: string[]) =>
    lines.slice(0, 3).map((line) => (line.length > 110 ? line.slice(0, 109) + "…" : line));

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
      ? "A name is present in the resume data."
      : "Add your name to the resume.",
    5,
    "contact",
  );

  add(
    "email",
    "Email address",
    !hasText(data.personal.email)
      ? "fail"
      : EMAIL_PATTERN.test(data.personal.email.trim())
        ? "pass"
        : "warn",
    !hasText(data.personal.email)
      ? "Add an email address so employers can contact you."
      : EMAIL_PATTERN.test(data.personal.email.trim())
        ? "The email address has a valid basic format."
        : "Check the email address format.",
    5,
    "contact",
  );

  add(
    "phone",
    "Phone number",
    hasText(data.personal.phone) ? "pass" : "warn",
    hasText(data.personal.phone)
      ? "A phone number is present."
      : "Add a phone number if the employer or application requires one.",
    1,
    "contact",
  );

  add(
    "location",
    "Location",
    hasText(data.personal.location) ? "pass" : "warn",
    hasText(data.personal.location)
      ? "A location is present."
      : "Add a city or region when location is relevant to the role.",
    1,
    "contact",
  );

  add(
    "title",
    "Professional title",
    hasText(data.personal.title) ? "pass" : "warn",
    hasText(data.personal.title)
      ? "A professional title is present."
      : "Consider adding the type of role you are targeting.",
    2,
    "contact",
  );

  const links = [data.personal.linkedIn, data.personal.github, data.personal.portfolio];
  add(
    "links",
    "Professional links",
    links.some(hasText) ? "pass" : "warn",
    links.some(hasText)
      ? "At least one professional profile or portfolio link is present."
      : "Add relevant profile links when they support your application.",
    1,
    "contact",
  );

  const summaryLength = data.summary.trim().length;
  add(
    "summary",
    "Professional summary",
    summaryLength === 0 ? "warn" : summaryLength < 40 ? "warn" : summaryLength > 900 ? "warn" : "pass",
    summaryLength === 0
      ? "A summary is optional, but can help explain your target role and strengths."
      : summaryLength < 40
        ? "The summary is very short. Add useful context if a summary helps your application."
        : summaryLength > 900
          ? "Consider shortening the summary so the most relevant information is easier to scan."
          : "A concise summary is present.",
    5,
    "content",
  );

  add(
    "experience",
    "Work experience",
    completeExperience.length > 0
      ? "pass"
      : data.experience.some((entry) => hasText(entry.company) || hasText(entry.role))
        ? "warn"
        : completeProjects.length > 0
          ? "warn"
          : "fail",
    completeExperience.length > 0
      ? completeExperience.length + " role(s) include an employer, title, and dates."
      : completeProjects.length > 0
        ? "No complete employment entry was found. Project experience can still demonstrate relevant skills, especially for early-career candidates."
        : "Add relevant work, internship, freelance, volunteer, or project experience.",
    8,
    "content",
  );

  add(
    "bullets",
    "Achievement and responsibility details",
    bullets.length >= 3 ? "pass" : bullets.length > 0 ? "warn" : "fail",
    bullets.length >= 3
      ? bullets.length + " description lines provide content to review."
      : bullets.length > 0
        ? "Only " + bullets.length + " description line(s) were found. Add more detail where it accurately represents your work."
        : "Add responsibilities, achievements, or project details.",
    6,
    "content",
    sample(bullets),
  );

  add(
    "numbers",
    "Measurable evidence",
    bullets.length === 0 || quantified === 0 ? "warn" : "pass",
    bullets.length === 0
      ? "Add achievement details before assessing measurable evidence."
      : quantified + " of " + bullets.length + " lines contain a detectable figure. Quantified outcomes are useful when genuine, but are not required for every strong achievement.",
    2,
    "content",
    sample(bullets.filter((line) => !isQuantified(line))),
  );

  add(
    "verbs",
    "Action-oriented descriptions",
    bullets.length === 0 ? "warn" : actionBullets > 0 ? "pass" : "warn",
    bullets.length === 0
      ? "Add experience or project descriptions."
      : actionBullets + " of " + bullets.length + " lines begin with a verb in the current action-verb list. This is a writing hint, not a parser requirement.",
    1,
    "content",
    sample(bullets.filter((line) => !ACTION_VERBS.has(leadingWord(line)))),
  );

  add(
    "skills",
    "Skills section",
    skills >= 4 ? "pass" : skills > 0 ? "warn" : "fail",
    skills > 0
      ? skills + " skill entries are listed. Relevance should be assessed against a specific job separately."
      : "Add the technical or professional skills relevant to your target roles.",
    6,
    "content",
  );

  add(
    "projects",
    "Projects",
    completeProjects.length > 0 || completeExperience.length > 0 ? "pass" : "warn",
    completeProjects.length > 0
      ? completeProjects.length + " complete project(s) are listed."
      : completeExperience.length > 0
        ? "No projects are listed. Projects are optional when work experience already demonstrates relevant skills."
        : "Consider adding projects if they demonstrate skills not covered by your work history.",
    completeProjects.length > 0 || completeExperience.length > 0 ? 2 : 1,
    "content",
  );

  add(
    "education",
    "Education",
    completeEducation.length > 0 ? "pass" : "warn",
    completeEducation.length > 0
      ? "Education information is present."
      : "Add education or relevant training when applicable to your target roles.",
    1,
    "content",
  );

  // A resume JSON template cannot prove how the exported PDF/DOCX is parsed.
  add(
    "format",
    "Document compatibility",
    "warn",
    "This check cannot be verified from resume data alone. Upload the exported PDF or DOCX for text extraction and reading-order tests.",
    0,
    "format",
  );

  const years = experienceYears(data);
  const maxWords = years >= 10 ? 1000 : 850;
  const wordCountStatus =
    words.length === 0 ? "warn" : words.length > maxWords * 1.4 ? "warn" : "pass";
  add(
    "length",
    "Resume length",
    wordCountStatus,
    "Approximately " + words.length + " words were found in the structured resume data. Length is guidance only; suitability depends on career stage, role, and document format.",
    0,
    "format",
  );

  const firstPerson = /\b(i|me|my)\b/i.test([data.summary, ...bullets].join(" "));
  add(
    "pronouns",
    "Writing perspective",
    firstPerson ? "warn" : "pass",
    firstPerson
      ? "First-person wording was detected. This is a style choice, not an ATS parsing failure."
      : "No first-person wording was detected in the summary or description lines.",
    0,
    "format",
  );

  checks.push(...qualityChecks(data));

  const score = scoreChecks(checks);
  const categoryScores: Record<AtsGroup, number | null> = {
    contact: scoreGroup(checks, "contact"),
    content: scoreGroup(checks, "content"),
    format: scoreGroup(checks, "format"),
  };

  return {
    score,
    rawScore: score,
    caps: [],
    verdict: verdictFor(score),
    checks,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: checks.filter((check) => check.status === "fail").length,
    categoryScores,
    scoreLabel: "Resume quality score",
  };
}
