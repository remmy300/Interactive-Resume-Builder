import type { ResumeEvidence } from "./resume-evidence";

export type EvidenceMatchStrength = "weak" | "direct";

export interface ResumeEvidenceMatch {
  evidenceId: string;
  source: ResumeEvidence["source"];
  title: string;
  strength: EvidenceMatchStrength;
  matchedTerms: string[];
  matchCount: number;
  totalKeywords: number;
  matchPercentage: number;
}

export interface ResumeEvidenceMatchResult {
  matches: ResumeEvidenceMatch[];
  directMatches: ResumeEvidenceMatch[];
  weakMatches: ResumeEvidenceMatch[];
  unmatchedEvidenceIds: string[];
}

/**
 * Words that are too general to provide useful evidence on their own.
 * These are filtered during matching, not removed from the original
 * extracted resume evidence.
 */
const GENERIC_TERMS = new Set([
  "application",
  "applications",
  "built",
  "business",
  "created",
  "developed",
  "development",
  "experience",
  "helped",
  "implemented",
  "improved",
  "including",
  "managed",
  "project",
  "projects",
  "responsible",
  "system",
  "systems",
  "team",
  "used",
  "using",
  "worked",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds the actual spelling and casing of a keyword in the answer.
 * Matching is case-insensitive and uses token boundaries.
 */

function findMatchedTerm(answer: string, keyword: string): string | null {
  const pattern = new RegExp(
    `(^|[^a-z0-9+#])(${escapeRegExp(keyword)})(?=$|[^a-z0-9+#])`,
    "i",
  );

  const match = answer.match(pattern);

  return match?.[2] ?? null;
}

function matchEvidence(
  answer: string,
  evidence: ResumeEvidence,
): ResumeEvidenceMatch | null {
  const meaningfulKeywords = [
    ...new Set(
      evidence.keywords
        .map((keyword) => keyword.toLowerCase())
        .filter((keyword) => keyword.length > 1 && !GENERIC_TERMS.has(keyword)),
    ),
  ];

  if (meaningfulKeywords.length === 0) {
    return null;
  }

  const matchedTerms = meaningfulKeywords
    .map((keyword) => findMatchedTerm(answer, keyword))
    .filter((term): term is string => term !== null);

  const uniqueMatchedTerms = [
    ...new Set(matchedTerms.map((term) => term.toLowerCase())),
  ].map(
    (term) => matchedTerms.find((matched) => matched.toLowerCase() === term)!,
  );

  if (uniqueMatchedTerms.length === 0) {
    return null;
  }

  const matchCount = uniqueMatchedTerms.length;
  const totalKeywords = meaningfulKeywords.length;
  const matchPercentage = Math.round((matchCount / totalKeywords) * 100);

  /*
   * A single distinctive term is enough for a direct skill match.
   * For projects, experience and other sources, require at least
   * two matching terms to classify the match as direct.
   */
  const strength: EvidenceMatchStrength =
    evidence.source === "skill" || matchCount >= 2 ? "direct" : "weak";

  return {
    evidenceId: evidence.id,
    source: evidence.source,
    title: evidence.title,
    strength,
    matchedTerms: uniqueMatchedTerms,
    matchCount,
    totalKeywords,
    matchPercentage,
  };
}

/**
 * Compares an interview answer with previously extracted resume evidence.
 *
 * This performs literal keyword matching. It does not understand
 * synonyms, context or whether a claim is factually true.
 */
export function matchResumeEvidence(
  answer: string,
  evidence: ResumeEvidence[],
): ResumeEvidenceMatchResult {
  const normalizedAnswer = answer.trim();

  if (!normalizedAnswer) {
    return {
      matches: [],
      directMatches: [],
      weakMatches: [],
      unmatchedEvidenceIds: evidence.map((item) => item.id),
    };
  }

  const matches = evidence
    .map((item) => matchEvidence(normalizedAnswer, item))
    .filter((match): match is ResumeEvidenceMatch => match !== null);

  const matchedIds = new Set(matches.map((match) => match.evidenceId));

  const directMatches = matches.filter((match) => match.strength === "direct");

  const weakMatches = matches.filter((match) => match.strength === "weak");

  return {
    matches,
    directMatches,
    weakMatches,
    unmatchedEvidenceIds: evidence
      .filter((item) => !matchedIds.has(item.id))
      .map((item) => item.id),
  };
}
