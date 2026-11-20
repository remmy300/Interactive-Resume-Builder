import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "./evaluate-answers";
import type { ResumeEvidence } from "./resume-evidence";

const resumeEvidence: ResumeEvidence[] = [
  {
    id: "skill-1",
    source: "skill",
    title: "Technologies",
    text: "React, TypeScript, Next.js",
    keywords: ["react", "typescript", "next.js"],
  },
  {
    id: "project-1",
    source: "project",
    title: "Grocery Shop",
    text: "Built a grocery ordering application using React and PostgreSQL.",
    keywords: [
      "built",
      "grocery",
      "ordering",
      "application",
      "using",
      "react",
      "postgresql",
    ],
  },
];

describe("evaluateAnswer", () => {
  const baseInput = {
    question: "Tell me about a project you worked on.",
    answer:
      "I faced a problem with a grocery ordering application. My task was to improve the ordering process. I used React and PostgreSQL to build the solution. As a result, the ordering process became easier.",
    category: "behavioral" as const,
  };

  it("evaluates an answer without requiring resume evidence", () => {
    const result = evaluateAnswer(baseInput);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.resumeEvidence).toBeUndefined();
  });

  it("includes resume evidence matches when evidence is supplied", () => {
    const result = evaluateAnswer({
      ...baseInput,
      resumeEvidence,
    });

    expect(result.resumeEvidence).toBeDefined();
    expect(result.resumeEvidence?.matches.length).toBeGreaterThan(0);
  });

  it("does not change the rubric score when resume evidence is supplied", () => {
    const withoutResume = evaluateAnswer(baseInput);

    const withResume = evaluateAnswer({
      ...baseInput,
      resumeEvidence,
    });

    expect(withResume.score).toBe(withoutResume.score);
  });

  it("returns resume matching results for an empty answer", () => {
    const result = evaluateAnswer({
      ...baseInput,
      answer: "",
      resumeEvidence,
    });

    expect(result.resumeEvidence).toBeDefined();
    expect(result.resumeEvidence?.matches).toHaveLength(0);
    expect(result.resumeEvidence?.unmatchedEvidenceIds).toHaveLength(
      resumeEvidence.length,
    );
  });
});
