import type { InterviewCategory } from "@/lib/career";
import type { ResumeEvidenceMatchResult } from "./match-resume-evidence";
import type { ResumeEvidence } from "./resume-evidence";

export type EvaluationFramework =
  | "STAR"
  | "TECHNICAL_REASONING"
  | "ROLE_RELEVANCE"
  | "COMPANY_ALIGNMENT";

export type CriterionStatus = "missing" | "partial" | "strong";

export interface EvaluationCriterion {
  id: string;
  name: string;
  weight: number;
  score: number;
  status: CriterionStatus;
  feedback: string;
  evidence: string[];
}

export interface CriterionRule {
  id: string;
  name: string;
  weight: number;
  description: string;
  indicators: RegExp[];
  missingFeedback: string;
  partialFeedback: string;
  strongFeedback: string;
}

export interface AnswerEvaluation {
  version: 1;
  framework: EvaluationFramework;
  category: InterviewCategory;
  score: number;
  criteria: EvaluationCriterion[];
  strengths: string[];
  improvements: string[];
  answerWordCount: number;
  overallFeedback: string;
  evaluatedAt: string;

  // Present only when resume evidence is supplied.
  resumeEvidence?: ResumeEvidenceMatchResult;
}

export interface EvaluationInput {
  question: string;
  answer: string;
  category: InterviewCategory;
  resumeEvidence?: ResumeEvidence[];
}
