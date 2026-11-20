import { describe, expect, it } from "vitest";
import { matchResumeEvidence } from "./match-resume-evidence";
import type { ResumeEvidence } from "./resume-evidence";

const resumeEvidence: ResumeEvidence[] = [
  {
    id: "skill-2",
    source: "skill",
    title: "Technologies",
    text: "React, TypeScript, Next.js",
    keywords: ["react", "typescript", "next.js"],
  },
  {
    id: "project-grocery",
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
  {
    id: "experience-1",
    source: "experience",
    title: "Frontend Developer",
    text: "Developed reusable React components for a customer dashboard.",
    keywords: [
      "developed",
      "reusable",
      "react",
      "components",
      "customer",
      "dashboard",
    ],
  },
];

describe("matchResumeEvidence", () => {
  it("identifies direct skill matches", () => {
    const result = matchResumeEvidence(
      "I used React and TypeScript to build the interface.",
      resumeEvidence,
    );

    const skillMatch = result.matches.find(
      (match) => match.evidenceId === "skill-2",
    );

    expect(skillMatch).toBeDefined();
    expect(skillMatch?.strength).toBe("direct");
    expect(skillMatch?.matchedTerms).toEqual(["React", "TypeScript"]);
  });

  it("identifies a direct project match with multiple terms", () => {
    const result = matchResumeEvidence(
      "I worked on the Grocery Shop project using React and PostgreSQL.",
      resumeEvidence,
    );

    const projectMatch = result.matches.find(
      (match) => match.evidenceId === "project-grocery",
    );

    expect(projectMatch?.strength).toBe("direct");
    expect(projectMatch?.matchedTerms).toContain("Grocery");
    expect(projectMatch?.matchedTerms).toContain("React");
    expect(projectMatch?.matchedTerms).toContain("PostgreSQL");
  });

  it("classifies a single project keyword as a weak match", () => {
    const result = matchResumeEvidence(
      "I used React in my work.",
      resumeEvidence,
    );

    const projectMatch = result.matches.find(
      (match) => match.evidenceId === "project-grocery",
    );

    expect(projectMatch?.strength).toBe("weak");
  });

  it("does not match partial words", () => {
    const result = matchResumeEvidence(
      "I used Reactivity to build the interface.",
      resumeEvidence,
    );

    const skillMatch = result.matches.find(
      (match) => match.evidenceId === "skill-2",
    );

    expect(skillMatch).toBeUndefined();
  });

  it("matches without being case-sensitive", () => {
    const result = matchResumeEvidence(
      "I worked with REACT and TYPESCRIPT.",
      resumeEvidence,
    );

    const skillMatch = result.matches.find(
      (match) => match.evidenceId === "skill-2",
    );

    expect(skillMatch?.matchedTerms).toEqual(["REACT", "TYPESCRIPT"]);
  });

  it("returns evidence that was not matched", () => {
    const result = matchResumeEvidence(
      "I used Vue to build the interface.",
      resumeEvidence,
    );

    expect(result.unmatchedEvidenceIds).toContain("project-grocery");
    expect(result.unmatchedEvidenceIds).toContain("skill-2");
    expect(result.unmatchedEvidenceIds).toContain("experience-1");
  });

  it("separates direct and weak matches", () => {
    const result = matchResumeEvidence(
      "I used React in my work.",
      resumeEvidence,
    );

    expect(result.directMatches.length).toBeGreaterThan(0);
    expect(result.weakMatches.length).toBeGreaterThan(0);
  });

  it("returns no matches for an empty answer", () => {
    const result = matchResumeEvidence("   ", resumeEvidence);

    expect(result.matches).toEqual([]);
    expect(result.directMatches).toEqual([]);
    expect(result.weakMatches).toEqual([]);
    expect(result.unmatchedEvidenceIds).toHaveLength(resumeEvidence.length);
  });

  it("returns the actual matched spelling from the answer", () => {
    const result = matchResumeEvidence(
      "My project used PostgreSQL.",
      resumeEvidence,
    );

    const projectMatch = result.matches.find(
      (match) => match.evidenceId === "project-grocery",
    );

    expect(projectMatch?.matchedTerms).toContain("PostgreSQL");
  });
});
