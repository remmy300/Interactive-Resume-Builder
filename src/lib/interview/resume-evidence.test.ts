import { describe, expect, it } from "vitest";
import { extractResumeEvidence } from "./resume-evidence";
import { createEmptyResume, type ResumeData } from "@/lib/resume-schema";

describe("extractResumeEvidence", () => {
  it("extracts the professional summary", () => {
    const resume = createEmptyResume();

    resume.summary = "Frontend developer experienced in React and TypeScript.";

    const result = extractResumeEvidence(resume);

    expect(result).toContainEqual(
      expect.objectContaining({
        id: "summary",
        source: "summary",
        title: "Professional Summary",
        text: resume.summary,
      }),
    );
  });

  it("extracts technical skill groups", () => {
    const resume = createEmptyResume();

    resume.skills.languages = "JavaScript, TypeScript";
    resume.skills.technologies = "React, Next.js";
    resume.skills.databases = "PostgreSQL, MongoDB";

    const result = extractResumeEvidence(resume);

    const skills = result.filter((item) => item.source === "skill");

    expect(skills).toHaveLength(3);
    expect(skills[0].text).toBe("JavaScript, TypeScript");
    expect(skills[1].text).toBe("React, Next.js");
    expect(skills[2].text).toBe("PostgreSQL, MongoDB");
  });

  it("extracts work experience", () => {
    const resume = createEmptyResume();

    resume.experience = [
      {
        id: "experience-1",
        company: "Example Company",
        role: "Frontend Developer",
        description: "Built reusable React components.",
        startDate: "2024",
        endDate: "2025",
        current: false,
      },
    ];

    const result = extractResumeEvidence(resume);

    expect(result).toContainEqual(
      expect.objectContaining({
        id: "experience-experience-1-role",
        source: "experience",
        title: "Frontend Developer",
        text: expect.stringContaining("Built reusable React components."),
      }),
    );
  });

  it("extracts projects", () => {
    const resume = createEmptyResume();

    resume.projects = [
      {
        id: "project-1",
        title: "Grocery Shop",
        description: "Built an online grocery ordering application.",
        link: "",
        github: "",
      },
    ];

    const result = extractResumeEvidence(resume);

    expect(result).toContainEqual(
      expect.objectContaining({
        id: "project-project-1",
        source: "project",
        title: "Grocery Shop",
      }),
    );
  });

  it("extracts certifications", () => {
    const resume = createEmptyResume();

    resume.certifications = [
      {
        id: "cert-1",
        name: "Web Development",
        issuer: "Example Institute",
        date: "2025",
        link: "",
      },
    ];

    const result = extractResumeEvidence(resume);

    expect(result).toContainEqual(
      expect.objectContaining({
        id: "certification-cert-1",
        source: "certification",
        title: "Web Development",
      }),
    );
  });

  it("ignores empty evidence", () => {
    const resume = createEmptyResume();

    const result = extractResumeEvidence(resume);

    expect(result.every((item) => item.text.trim().length > 0)).toBe(true);
  });

  it("normalizes and deduplicates keywords", () => {
    const resume = createEmptyResume();

    resume.summary = "React React, TypeScript and PostgreSQL";

    const result = extractResumeEvidence(resume);
    const summary = result.find((item) => item.source === "summary");

    expect(summary?.keywords).toContain("react");
    expect(summary?.keywords).toContain("typescript");
    expect(summary?.keywords).toContain("postgresql");

    expect(summary?.keywords.filter((word) => word === "react")).toHaveLength(
      1,
    );
  });

  it("does not modify the original resume", () => {
    const resume: ResumeData = createEmptyResume();
    resume.summary = "Frontend developer.";

    const originalSummary = resume.summary;

    extractResumeEvidence(resume);

    expect(resume.summary).toBe(originalSummary);
  });
});
