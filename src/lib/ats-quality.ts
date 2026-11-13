import { hasText, resumeBullets, skillItems } from "./ats-text";
import type { AtsCheck, AtsStatus } from "./ats";
import type { ResumeData } from "./resume-schema";

const MAX_EXAMPLES = 3;

const WEAK_PHRASES =
  /\b(responsible for|duties (included|include)|worked on|helped (to |with )?|assisted (with|in)|involved in|participated in|tasked with|various|etc\.?|and more)\b/i;

const CLICHES =
  /\b(hard[- ]?working|team player|results[- ]driven|detail[- ]oriented|self[- ]motivated|go[- ]getter|fast learner|quick learner|passionate about|dynamic|synergy|think outside the box|excellent communication skills|strong work ethic|highly motivated)\b/i;

// Metrics are useful evidence, but their absence is not proof of a weak achievement.
const METRIC =
  /(\d+(?:\.\d+)?\s?%|[$£€₦]\s?\d|\b\d+(?:\.\d+)?\s?[kKmMbB]\b|\b\d+x\b|\b\d{1,3}(?:,\d{3})+\b|\b(?!(?:19|20)\d{2}\b)\d+\+?\b)/;

const SKILL_ALIASES: Record<string, string[]> = {
  "react": ["react", "react.js", "reactjs"],
  "next.js": ["next.js", "nextjs", "next js"],
  "node.js": ["node.js", "nodejs", "node"],
  "express": ["express", "express.js", "expressjs"],
  "postgresql": ["postgresql", "postgres"],
  "javascript": ["javascript", "js"],
  "typescript": ["typescript", "ts"],
  "mongodb": ["mongodb", "mongo db"],
  "tailwind css": ["tailwind css", "tailwind"],
  "amazon web services": ["amazon web services", "aws"],
  "google cloud platform": ["google cloud platform", "gcp"],
  "c sharp": ["c#", "c sharp"],
  "cplusplus": ["c++", "cplusplus"],
};

const trim = (line: string, max = 110) =>
  line.length > max ? line.slice(0, max - 1).trimEnd() + "…" : line;

export const isQuantified = (line: string) => METRIC.test(line);

export function leadingWord(line: string): string {
  return (line.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0] ?? "").toLowerCase();
}

function worst(statuses: AtsStatus[]): AtsStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

function monthIndex(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return Number(match[1]) * 12 + month - 1;
}

function nowIndex(now: Date): number {
  return now.getFullYear() * 12 + now.getMonth();
}

interface Span {
  label: string;
  start: number | null;
  end: number | null;
}

function experienceSpans(data: ResumeData, now: Date): Span[] {
  return data.experience
    .filter((entry) => hasText(entry.company) || hasText(entry.role))
    .map((entry) => ({
      label: entry.company.trim() || entry.role.trim(),
      start: monthIndex(entry.startDate),
      end: entry.current ? nowIndex(now) : monthIndex(entry.endDate),
    }));
}

/** Counts overlapping employment periods once rather than double-counting them. */
export function experienceYears(data: ResumeData, now = new Date()): number {
  const spans = experienceSpans(data, now)
    .filter((span): span is Span & { start: number; end: number } =>
      span.start !== null && span.end !== null && span.end >= span.start,
    )
    .sort((a, b) => a.start - b.start);

  let months = 0;
  let cursor = -Infinity;
  for (const span of spans) {
    const from = Math.max(span.start, cursor);
    if (span.end + 1 > from) months += span.end + 1 - from;
    cursor = Math.max(cursor, span.end + 1);
  }
  return months / 12;
}

function dateCheck(data: ResumeData, now: Date): AtsCheck | null {
  const spans = experienceSpans(data, now);
  if (spans.length === 0) return null;

  const failures: string[] = [];
  const warnings: string[] = [];
  const current = nowIndex(now);

  for (const span of spans) {
    if (span.start === null) {
      warnings.push(span.label + ": add a valid start date (YYYY-MM).");
    } else if (span.start > current + 1) {
      warnings.push(span.label + ": the start date is in the future.");
    }

    if (span.start !== null && span.end !== null && span.end < span.start) {
      failures.push(span.label + ": the end date is before the start date.");
    }
  }

  const status = worst([
    ...failures.map(() => "fail" as const),
    ...warnings.map(() => "warn" as const),
  ]);

  return {
    id: "dates",
    label: "Date consistency",
    status,
    detail:
      status === "pass"
        ? "The employment dates provided are internally consistent."
        : "Check incomplete, invalid, future, or reversed employment dates.",
    weight: 4,
    group: "content",
    examples: [...failures, ...warnings].slice(0, MAX_EXAMPLES),
  };
}

function bulletQualityChecks(data: ResumeData): AtsCheck[] {
  const bullets = resumeBullets(data);
  if (bullets.length === 0) return [];

  const checks: AtsCheck[] = [];
  const weak = bullets.filter((line) => WEAK_PHRASES.test(line));

  checks.push({
    id: "weak-phrases",
    label: "Specific achievement wording",
    status: weak.length === 0 ? "pass" : "warn",
    detail:
      weak.length === 0
        ? "No common vague phrases were detected."
        : weak.length + " of " + bullets.length + " achievement lines contain wording that could be more specific. Review the examples; context matters.",
    weight: 2,
    group: "content",
    examples: weak.slice(0, MAX_EXAMPLES).map((line) => trim(line)),
  });

  const wordCount = (line: string) => line.split(/\s+/).filter(Boolean).length;
  const tooShort = bullets.filter((line) => wordCount(line) < 6);
  const tooLong = bullets.filter((line) => wordCount(line) > 40);

  checks.push({
    id: "bullet-length",
    label: "Achievement readability",
    status: tooShort.length + tooLong.length === 0 ? "pass" : "warn",
    detail:
      tooShort.length + tooLong.length === 0
        ? "Achievement lines are within a practical scanning length."
        : tooShort.length + " lines are very short and " + tooLong.length + " are long. Review these for clarity rather than following a rigid word limit.",
    weight: 1,
    group: "format",
    examples: [...tooShort, ...tooLong].slice(0, MAX_EXAMPLES).map((line) => trim(line)),
  });

  const counts = new Map<string, number>();
  for (const line of bullets) {
    const word = leadingWord(line);
    if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  checks.push({
    id: "verb-variety",
    label: "Varied opening words",
    status: repeated.length === 0 ? "pass" : "warn",
    detail:
      repeated.length === 0
        ? "No repeated opening word pattern was detected."
        : "Some achievement lines begin with the same word. Consider varying the wording where it improves readability.",
    weight: 1,
    group: "content",
    examples: repeated.slice(0, MAX_EXAMPLES).map(([word, count]) =>
      "“" + word + "” starts " + count + " lines",
    ),
  });

  const quantified = bullets.filter(isQuantified);
  checks.push({
    id: "metrics",
    label: "Evidence of scale or outcomes",
    status: quantified.length > 0 ? "pass" : "warn",
    detail:
      quantified.length > 0
        ? quantified.length + " of " + bullets.length + " achievement lines include a detectable figure. Numbers can add useful context, but are not required for every achievement."
        : "No measurable figures were detected. Add genuine scale or outcome data where you have it; do not invent metrics.",
    weight: 2,
    group: "content",
    examples: bullets.filter((line) => !isQuantified(line)).slice(0, MAX_EXAMPLES).map(trim),
  });

  return checks;
}

function roleContentCheck(data: ResumeData): AtsCheck | null {
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  if (roles.length === 0) return null;

  const empty = roles.filter((entry) => !hasText(entry.description));
  return {
    id: "role-content",
    label: "Experience descriptions",
    status: empty.length === 0 ? "pass" : "warn",
    detail:
      empty.length === 0
        ? "Each listed role contains descriptive content."
        : empty.length + " of " + roles.length + " listed roles have no description. Add relevant responsibilities or achievements where applicable.",
    weight: 3,
    group: "content",
    examples: empty.slice(0, MAX_EXAMPLES).map((entry) =>
      entry.company || entry.role || "Untitled role",
    ),
  };
}

function clicheCheck(data: ResumeData): AtsCheck {
  const sources = [data.summary, ...resumeBullets(data)];
  const hits = sources
    .flatMap((text) => [...text.matchAll(new RegExp(CLICHES.source, "gi"))].map((match) => match[0]));
  const unique = [...new Set(hits.map((hit) => hit.toLowerCase()))];

  return {
    id: "cliches",
    label: "Specific language",
    status: unique.length === 0 ? "pass" : "warn",
    detail:
      unique.length === 0
        ? "No common generic phrases were detected."
        : "Review generic phrases and replace them with concrete skills, responsibilities, or evidence when possible.",
    weight: 1,
    group: "content",
    examples: unique.slice(0, MAX_EXAMPLES).map((word) => "“" + word + "”"),
  };
}

function normalizeSkillText(value: string): string {
  return value
    .toLowerCase()
    .replace(/c\+\+/g, " cplusplus ")
    .replace(/c#/g, " c sharp ")
    .replace(/\.js\b/g, " js ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function skillTerms(skill: string): string[] {
  const normalized = normalizeSkillText(skill);
  const key = Object.keys(SKILL_ALIASES).find(
    (candidate) => normalizeSkillText(candidate) === normalized,
  );
  const aliases = key ? SKILL_ALIASES[key] : [skill];
  return [...new Set([skill, ...aliases].map(normalizeSkillText).filter(Boolean))];
}

function containsSkill(corpus: string, skill: string): boolean {
  const normalizedCorpus = " " + normalizeSkillText(corpus) + " ";
  return skillTerms(skill).some((term) => {
    const padded = " " + term + " ";
    return normalizedCorpus.includes(padded);
  });
}

export function findUnsupportedSkills(data: ResumeData): string[] {
  const skills = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];
  const corpus = [
    data.summary,
    ...data.experience.flatMap((entry) => [entry.role, entry.description]),
    ...data.projects.flatMap((project) => [project.title, project.description]),
  ].join("\n");

  return skills.filter((skill) => !containsSkill(corpus, skill));
}

function skillsEvidenceCheck(data: ResumeData): AtsCheck | null {
  const skills = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];
  if (skills.length === 0) return null;

  const unsupported = findUnsupportedSkills(data);
  const supportedCount = skills.length - unsupported.length;
  const ratio = unsupported.length / skills.length;

  return {
    id: "skills-evidence",
    label: "Skills supported by resume content",
    status: ratio > 0.7 ? "warn" : "pass",
    detail:
      supportedCount + " of " + skills.length + " listed technical skills were also found in the summary, experience, or project descriptions. A listed skill is not automatically invalid just because the resume does not repeat it elsewhere.",
    weight: 2,
    group: "content",
    examples: unsupported.length > 0 ? unsupported.slice(0, MAX_EXAMPLES) : undefined,
  };
}

/** Content checks are advisory; none claims to predict an employer's ATS decision. */
export function qualityChecks(data: ResumeData, now = new Date()): AtsCheck[] {
  return [
    ...bulletQualityChecks(data),
    roleContentCheck(data),
    dateCheck(data, now),
    clicheCheck(data),
    skillsEvidenceCheck(data),
  ].filter((check): check is AtsCheck => check !== null);
}
