import type {
  AtsCapDetail,
  AtsCategory,
  AtsCategoryScore,
  AtsCheck,
  AtsContribution,
  AtsStatus,
} from "./ats-types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./ats-types";

/*  credit */

export const STATUS_CREDIT: Record<Exclude<AtsStatus, "info">, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

export const CHECK_WEIGHTS: Record<string, number> = {
  name: 5,
  email: 5,
  title: 1,
  phone: 0,
  location: 0,
  links: 0,

  experience: 8,
  projects: 2,
  bullets: 2,
  outcomes: 10,
  action: 3,
  metrics: 4,
  "role-bullets": 2,

  // Skills.
  skills: 6,
  "skills-evidence": 8,

  // Content.
  summary: 1,
  pronouns: 1,
  "weak-phrases": 3,
  "bullet-length": 1,
  "sentence-completeness": 4,
  "verb-variety": 1,
  cliches: 1,
  "unresolved-placeholders": 4,
  // Structure.
  education: 3,
  length: 1,
  dates: 4,

  "export-text": 5,
  "parse-safe-text": 3,
  "pdf-verification": 0,
};

export const weightOf = (id: string): number => CHECK_WEIGHTS[id] ?? 0;

/** Applies the central weights, so no check carries its own private number. */
export function withWeights(checks: AtsCheck[]): AtsCheck[] {
  return checks.map((check) => ({ ...check, weight: weightOf(check.id) }));
}

/*  verdicts */

export const VERDICTS: Array<{ min: number; label: string }> = [
  { min: 90, label: "Strong resume" },
  { min: 80, label: "Good resume" },
  { min: 55, label: "Needs work" },
  { min: 0, label: "Not ready" },
];

export function verdictFor(score: number): string {
  return (VERDICTS.find((entry) => score >= entry.min) ?? VERDICTS.at(-1)!)
    .label;
}

/*  scoring  */

const round1 = (value: number) => Math.round(value * 10) / 10;

export const isScored = (check: AtsCheck): boolean =>
  check.status !== "info" && check.weight > 0;

export const creditFor = (check: AtsCheck): number =>
  check.status === "info" ? 0 : check.weight * STATUS_CREDIT[check.status];

export function percentOf(earned: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

export interface ScoreResult {
  earned: number;
  total: number;
  percent: number;
}

export function scoreChecks(checks: AtsCheck[]): ScoreResult {
  const scored = checks.filter(isScored);
  const total = scored.reduce((sum, check) => sum + check.weight, 0);
  const earned = scored.reduce((sum, check) => sum + creditFor(check), 0);
  return { earned, total, percent: percentOf(earned, total) };
}

export function scoreCategories(checks: AtsCheck[]): AtsCategoryScore[] {
  return CATEGORY_ORDER.map((id: AtsCategory) => {
    const { earned, total, percent } = scoreChecks(
      checks.filter((check) => check.category === id),
    );
    return {
      id,
      label: CATEGORY_LABELS[id],
      earned: round1(earned),
      total: round1(total),
      percent,
    };
  });
}

/** Each scored check with the points it earned and lost, biggest loss first. */
export function explainScore(checks: AtsCheck[]): AtsContribution[] {
  return checks
    .filter(isScored)
    .map((check) => {
      const earned = creditFor(check);
      return {
        id: check.id,
        label: check.label,
        status: check.status,
        category: check.category,
        possible: round1(check.weight),
        earned: round1(earned),
        lost: round1(check.weight - earned),
      };
    })
    .sort((a, b) => b.lost - a.lost || b.possible - a.possible);
}

/* ---------------------------------- caps ---------------------------------- */

export interface CapContext {
  statusOf: (id: string) => AtsStatus | undefined;
  hasAnyContent: boolean;
  hasPracticalEvidence: boolean;
}

interface CapRule extends AtsCapDetail {
  applies: (context: CapContext) => boolean;
}

export const SCORE_CAPS: CapRule[] = [
  {
    id: "empty",
    max: 20,
    reason: "There is no resume content to assess yet.",
    applies: ({ hasAnyContent }) => !hasAnyContent,
  },
  {
    id: "unsendable",
    max: 35,
    reason:
      "A resume needs a name and a working email address before it can be sent.",
    applies: ({ statusOf }) =>
      statusOf("name") === "fail" || statusOf("email") === "fail",
  },
  {
    id: "no-evidence",
    max: 60,
    reason:
      "There is no work role or project to show what you can do. Add one, even a small project, before this can score as a good resume.",
    applies: ({ hasAnyContent, hasPracticalEvidence }) =>
      hasAnyContent && !hasPracticalEvidence,
  },
  {
    id: "placeholders",
    max: 60,
    reason:
      "The resume still contains placeholder or instruction text. Replace bracketed prompts and TODO text with real content before sending it.",
    applies: ({ statusOf }) => statusOf("unresolved-placeholders") === "fail",
  },
];

export function applyCaps(
  rawScore: number,
  context: CapContext,
): { score: number; applied: AtsCapDetail[] } {
  const matching = SCORE_CAPS.filter((rule) => rule.applies(context));
  if (matching.length === 0) return { score: rawScore, applied: [] };
  const ceiling = Math.min(...matching.map((rule) => rule.max));
  const score = Math.min(rawScore, ceiling);
  // Report a cap only when it actually lowered the score.
  const applied = matching
    .filter((rule) => rawScore > rule.max)
    .map(({ id, max, reason }) => ({ id, max, reason }));
  return { score, applied };
}
