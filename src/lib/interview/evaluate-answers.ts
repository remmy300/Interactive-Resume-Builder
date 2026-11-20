import type { InterviewCategory } from "@/lib/career";
import { EVALUATION_RULES } from "./evaluation-rules";
import { matchResumeEvidence } from "./match-resume-evidence";
import type {
  AnswerEvaluation,
  CriterionRule,
  EvaluationFramework,
  EvaluationInput,
  EvaluationCriterion,
} from "./evaluation-types";

const FRAMEWORK_BY_CATEGORY: Record<InterviewCategory, EvaluationFramework> = {
  behavioral: "STAR",
  technical: "TECHNICAL_REASONING",
  role: "ROLE_RELEVANCE",
  company: "COMPANY_ALIGNMENT",
};

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function evaluateCriterion(
  rule: CriterionRule,
  answer: string,
): EvaluationCriterion {
  const evidence = rule.indicators
    .filter((pattern) => pattern.test(answer))
    .map((pattern) => pattern.source);

  const score =
    evidence.length === 0
      ? 0
      : evidence.length === rule.indicators.length
        ? 100
        : 50;

  const status = score === 0 ? "missing" : score === 50 ? "partial" : "strong";

  const feedback =
    score === 0
      ? rule.missingFeedback
      : score === 50
        ? rule.partialFeedback
        : rule.strongFeedback;

  return {
    id: rule.id,
    name: rule.name,
    weight: rule.weight,
    score,
    status,
    feedback,
    evidence,
  };
}

export function evaluateAnswer(input: EvaluationInput): AnswerEvaluation {
  const answer = input.answer.trim();
  const framework = FRAMEWORK_BY_CATEGORY[input.category];

  const rules = EVALUATION_RULES[framework];

  const criteria = rules.map((rule) => evaluateCriterion(rule, answer));

  const weightedScore = criteria.reduce(
    (total, criterion) => total + criterion.score * (criterion.weight / 100),
    0,
  );

  const score = Math.round(weightedScore);

  const strengths = criteria
    .filter((criterion) => criterion.status === "strong")
    .map((criterion) => criterion.feedback);

  const improvements = criteria
    .filter((criterion) => criterion.status !== "strong")
    .map((criterion) => criterion.feedback);

  let overallFeedback: string;

  if (!answer) {
    overallFeedback = "Write an answer before requesting a review.";
  } else if (score >= 80) {
    overallFeedback =
      "Your answer covers most of the evaluation criteria. Review the remaining suggestions to make it stronger.";
  } else if (score >= 50) {
    overallFeedback =
      "Your answer has a useful foundation, but some important areas need more explanation.";
  } else {
    overallFeedback =
      "Your answer needs more detail. Work through the evaluation criteria and add relevant examples.";
  }

  // Resume matching is supplementary; it does not affect the rubric score.
  const resumeEvidence =
    input.resumeEvidence !== undefined
      ? matchResumeEvidence(answer, input.resumeEvidence)
      : undefined;

  return {
    version: 1,
    framework,
    category: input.category,
    score,
    criteria,
    strengths,
    improvements,
    answerWordCount: countWords(answer),
    overallFeedback,
    evaluatedAt: new Date().toISOString(),
    ...(resumeEvidence !== undefined && { resumeEvidence }),
  };
}
