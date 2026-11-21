import {
  extractKeywords,
  matchKeywords,
  type KeywordDetail,
  type KeywordMatch,
} from "./ats-keywords";
import type { ResumeData } from "./resume-schema";

/**
 * Job compatibility: how well this resume matches one job description. It is
 * reported on its own and never mixed into the general quality score, because a
 * strong resume can still be a poor fit for a given job, and the reverse.
 */

export const JOB_FIT_VERDICTS: Array<{ min: number; label: string }> = [
  { min: 75, label: "Strong match" },
  { min: 50, label: "Partial match" },
  { min: 0, label: "Weak match" },
];

const STRONG_REQUIRED_COVERAGE = 0.7;

export interface JobFitAssessment {
  score: number | null;
  verdict: string;

  requiredCoverage: number | null;
  matched: KeywordDetail[];
  missingRequired: string[];
  missingPreferred: string[];
  listedOnly: string[];
  match: KeywordMatch;
  advice: string[];
}

export function assessJobFit(
  data: ResumeData,
  jobDescription: string,
): JobFitAssessment {
  const keywords = jobDescription.trim() ? extractKeywords(jobDescription) : [];
  const match = matchKeywords(data, keywords);

  if (keywords.length === 0) {
    return {
      score: null,
      verdict: "No requirements found",
      requiredCoverage: null,
      matched: [],
      missingRequired: [],
      missingPreferred: [],
      listedOnly: [],
      match,
      advice: [
        "Paste the full job description so its requirements can be read.",
      ],
    };
  }

  const required = match.details.filter(
    (item) => item.importance === "required",
  );
  const requiredFound = required.filter((item) => item.evidence !== "missing");
  const requiredCoverage =
    required.length > 0 ? requiredFound.length / required.length : null;

  const verdict = (
    JOB_FIT_VERDICTS.find((entry) => match.score >= entry.min) ??
    JOB_FIT_VERDICTS.at(-1)!
  ).label;
  const strongNeedsCoverage =
    verdict === "Strong match" &&
    requiredCoverage !== null &&
    requiredCoverage < STRONG_REQUIRED_COVERAGE;

  const missingRequired = match.details
    .filter(
      (item) =>
        item.importance !== "preferred" && item.importance !== "general",
    )
    .filter((item) => item.evidence === "missing")
    .map((item) => item.display);
  const missingPreferred = match.details
    .filter(
      (item) => item.importance === "preferred" && item.evidence === "missing",
    )
    .map((item) => item.display);

  const advice: string[] = [];
  if (missingRequired.length > 0) {
    advice.push(
      `The posting asks for ${missingRequired.slice(0, 4).join(", ")}. Add them only where you have genuinely used them, in a role or project, not just the skills list.`,
    );
  }
  if (match.listedOnly.length > 0) {
    advice.push(
      `${match.listedOnly.slice(0, 4).join(", ")} appear only in your skills list. Show where you used them in a role or project bullet.`,
    );
  }

  return {
    score: match.score,
    verdict: strongNeedsCoverage ? "Partial match" : verdict,
    requiredCoverage,
    matched: match.details.filter((item) => item.evidence !== "missing"),
    missingRequired,
    missingPreferred,
    listedOnly: match.listedOnly,
    match,
    advice,
  };
}
