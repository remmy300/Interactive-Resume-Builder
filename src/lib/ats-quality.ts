import { hasText, resumeBullets, skillItems } from "./ats-text";
import type { AtsCheck, AtsStatus } from "./ats";
import type { ResumeData } from "./resume-schema";

/**
 * Content-quality checks. These look at what the resume actually says, not only
 * whether a section exists, so a resume full of vague bullets cannot score well.
 */

const MAX_EXAMPLES = 3;

const WEAK_PHRASES =
  /\b(responsible for|duties (included|include)|worked on|helped (to |with )?|assisted (with|in)|involved in|participated in|tasked with|various|etc\.?|and more)\b/i;

const CLICHES =
  /\b(hard[- ]?working|team player|results[- ]driven|detail[- ]oriented|self[- ]motivated|go[- ]getter|fast learner|quick learner|passionate about|dynamic|synergy|think outside the box|excellent communication skills|strong work ethic|highly motivated)\b/i;

// A figure that says something about scale or impact. A bare year such as
// "2023" is a date, not a result.
const METRIC =
  /(\d+(\.\d+)?\s?%|[$£€₦]\s?\d|\b\d+(\.\d+)?\s?[kKmMbB]\b|\b\d+x\b|\b\d{1,3}(,\d{3})+\b|\b(?!(19|20)\d{2}\b)\d+\+?\b)/;

const trim = (line: string, max = 110) =>
  line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;

export const isQuantified = (line: string) => METRIC.test(line);

export function leadingWord(line: string): string {
  return (line.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0] ?? "").toLowerCase();
}

function worst(statuses: AtsStatus[]): AtsStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

/* ------------------------------- dates ----------------------------------- */

function monthIndex(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
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

/** Total months of experience, with overlapping roles counted once. */
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
      warnings.push(`${span.label}: add a start date.`);
    } else if (span.start > current + 1) {
      warnings.push(`${span.label}: the start date is in the future.`);
    }
    if (span.start !== null && span.end !== null && span.end < span.start) {
      failures.push(`${span.label}: the end date is before the start date.`);
    }
  }

  const dated = spans
    .filter((span): span is Span & { start: number; end: number } =>
      span.start !== null && span.end !== null && span.end >= span.start,
    )
    .sort((a, b) => a.start - b.start);
  for (let index = 1; index < dated.length; index += 1) {
    const gap = dated[index].start - dated[index - 1].end - 1;
    if (gap > 6) {
      warnings.push(
        `${gap}-month gap before ${dated[index].label}. Recruiters notice this, so mention what you did (study, freelance, caregiving).`,
      );
    }
  }

  const status = worst([
    ...failures.map(() => "fail" as const),
    ...warnings.map(() => "warn" as const),
  ]);
  return {
    id: "dates",
    label: "Dates and career timeline",
    status,
    detail:
      status === "pass"
        ? "Dates are complete and consistent, with no unexplained gaps."
        : "There are problems with your dates or timeline.",
    weight: 6,
    group: "content",
    examples: [...failures, ...warnings].slice(0, MAX_EXAMPLES + 1),
  };
}

/* ------------------------------ bullet checks ----------------------------- */

function bulletQualityChecks(data: ResumeData): AtsCheck[] {
  const bullets = resumeBullets(data);
  if (bullets.length === 0) return [];
  const checks: AtsCheck[] = [];

  const weak = bullets.filter((line) => WEAK_PHRASES.test(line));
  const weakRatio = weak.length / bullets.length;
  checks.push({
    id: "weak-phrases",
    label: "Specific, confident wording",
    status: weak.length === 0 ? "pass" : weakRatio >= 0.3 ? "fail" : "warn",
    detail:
      weak.length === 0
        ? "Bullets avoid vague phrases like “responsible for” and “worked on”."
        : `${weak.length} of ${bullets.length} bullets use vague phrases such as “responsible for”, “worked on” or “helped”. State what you did and the result instead.`,
    weight: 6,
    group: "content",
    examples: weak.slice(0, MAX_EXAMPLES).map((line) => trim(line)),
  });

  const wordCount = (line: string) => line.split(/\s+/).filter(Boolean).length;
  const tooShort = bullets.filter((line) => wordCount(line) < 6);
  const tooLong = bullets.filter((line) => wordCount(line) > 35);
  checks.push({
    id: "bullet-length",
    label: "Bullet length",
    status: tooShort.length + tooLong.length === 0 ? "pass" : "warn",
    detail:
      tooShort.length + tooLong.length === 0
        ? "Bullets are a readable length (about one or two lines)."
        : `${tooShort.length} bullets are too thin to show impact (under 6 words) and ${tooLong.length} are too long to skim (over 35 words). Aim for one to two lines each.`,
    weight: 3,
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
    label: "Varied opening verbs",
    status: repeated.length === 0 ? "pass" : "warn",
    detail:
      repeated.length === 0
        ? "Bullets open with a good mix of verbs."
        : "Several bullets open with the same word, which reads as repetitive.",
    weight: 3,
    group: "content",
    examples: repeated
      .slice(0, MAX_EXAMPLES)
      .map(([word, count]) => `“${word}” starts ${count} bullets`),
  });

  return checks;
}

function roleBulletCheck(data: ResumeData): AtsCheck | null {
  const roles = data.experience.filter(
    (entry) => hasText(entry.company) || hasText(entry.role),
  );
  if (roles.length === 0) return null;

  const lines = (text: string) =>
    text.split("\n").filter((line) => line.replace(/^\s*[-•*]\s*/, "").trim()).length;
  const empty = roles.filter((entry) => lines(entry.description) === 0);
  const thin = roles.filter((entry) => {
    const count = lines(entry.description);
    return count > 0 && count < 2;
  });
  const heavy = roles.filter((entry) => lines(entry.description) > 8);

  const examples = [
    ...empty.map((e) => `${e.company || e.role}: no achievements listed.`),
    ...thin.map((e) => `${e.company || e.role}: only one bullet. Add at least two or three.`),
    ...heavy.map((e) => `${e.company || e.role}: more than 8 bullets. Keep the strongest 4–6.`),
  ];
  const status: AtsStatus = empty.length ? "fail" : examples.length ? "warn" : "pass";
  return {
    id: "role-bullets",
    label: "Achievements under each role",
    status,
    detail:
      status === "pass"
        ? "Each role has a focused set of achievements."
        : "Some roles list no achievements, or too many or too few.",
    weight: 6,
    group: "content",
    examples: examples.slice(0, MAX_EXAMPLES),
  };
}

/* ------------------------------ wording checks ---------------------------- */

function clicheCheck(data: ResumeData): AtsCheck {
  const sources = [data.summary, ...resumeBullets(data)];
  const hits = sources
    .map((text) => text.match(CLICHES)?.[0])
    .filter((hit): hit is string => Boolean(hit));
  const unique = [...new Set(hits.map((hit) => hit.toLowerCase()))];
  return {
    id: "cliches",
    label: "No empty buzzwords",
    status: unique.length === 0 ? "pass" : unique.length >= 3 ? "fail" : "warn",
    detail:
      unique.length === 0
        ? "No overused buzzwords. Claims are backed by specifics."
        : "Buzzwords like these say nothing a recruiter can verify. Replace them with a result or a fact.",
    weight: 4,
    group: "content",
    examples: unique.slice(0, MAX_EXAMPLES).map((word) => `“${word}”`),
  };
}

function emailCheck(data: ResumeData): AtsCheck | null {
  const email = data.personal.email.trim();
  if (!email.includes("@")) return null;
  const local = email.split("@")[0];
  const digits = (local.match(/\d/g) ?? []).length;
  const odd = digits >= 5 || /(cute|sexy|baby|princess|gamer|hacker|1337|xxx)/i.test(local);
  return {
    id: "email-tone",
    label: "Professional email address",
    status: odd ? "warn" : "pass",
    detail: odd
      ? "This address looks informal. Use a name-based address such as firstname.lastname@."
      : "The email address looks professional.",
    weight: 2,
    group: "contact",
  };
}

function skillsEvidenceCheck(data: ResumeData): AtsCheck | null {
  const skills = [
    ...skillItems(data.skills.languages),
    ...skillItems(data.skills.technologies),
    ...skillItems(data.skills.databases),
  ];
  if (skills.length < 6) return null;

  const corpus = [
    data.summary,
    ...data.experience.flatMap((e) => [e.role, e.description]),
    ...data.projects.flatMap((p) => [p.title, p.description]),
  ]
    .join("\n")
    .toLowerCase();

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const unsupported = skills.filter((skill) => {
    const term = skill.toLowerCase();
    if (term.length <= 3) {
      return !new RegExp(`(^|[^a-z0-9+#])${escape(term)}($|[^a-z0-9+#])`).test(corpus);
    }
    return !corpus.includes(term);
  });

  const ratio = unsupported.length / skills.length;
  return {
    id: "skills-evidence",
    label: "Skills backed by experience",
    status: ratio > 0.7 ? "fail" : ratio > 0.5 ? "warn" : "pass",
    detail:
      ratio > 0.5
        ? `${unsupported.length} of ${skills.length} listed skills never appear in your experience or projects. Recruiters probe these in interviews, so show where you used them or cut them.`
        : `${skills.length - unsupported.length} of ${skills.length} listed skills are shown in your experience or projects.`,
    weight: 5,
    group: "content",
    examples:
      ratio > 0.5 ? unsupported.slice(0, 6) : undefined,
  };
}

/** All content-quality checks that apply to this resume. */
export function qualityChecks(data: ResumeData, now = new Date()): AtsCheck[] {
  return [
    ...bulletQualityChecks(data),
    roleBulletCheck(data),
    dateCheck(data, now),
    clicheCheck(data),
    emailCheck(data),
    skillsEvidenceCheck(data),
  ].filter((check): check is AtsCheck => check !== null);
}
