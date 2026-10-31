import { describe, expect, it } from "vitest";
import {
  addSkillsToResume,
  applicationInputSchema,
  applyBulletChanges,
  buildInterviewQuestions,
  coverLetterInputSchema,
  generateCoverLetter,
  suggestBulletImprovements,
} from "./career";
import { extractKeywords } from "./ats";
import { createEmptyResume, type ResumeData } from "./resume-schema";

function sampleResume(): ResumeData {
  const data = createEmptyResume();
  data.personal = {
    name: "Alex Morgan",
    title: "Frontend Developer",
    phone: "+1 415 555 0134",
    email: "alex@example.com",
    location: "San Francisco, CA",
    linkedIn: "linkedin.com/in/alex",
    github: "github.com/alex",
    portfolio: "alex.dev",
  };
  data.summary = "Frontend developer focused on accessible React applications.";
  data.experience = [
    {
      id: "exp-1",
      company: "Northwind Labs",
      role: "Frontend Developer",
      description: [
        "Responsible for building the billing dashboard",
        "Reduced load time by 38% across the dashboard",
      ].join("\n"),
      startDate: "2023-01",
      endDate: "",
      current: true,
    },
  ];
  data.skills = {
    languages: "TypeScript",
    technologies: "React, Next.js",
    databases: "PostgreSQL",
    spoken: "English",
  };
  return data;
}

describe("suggestBulletImprovements", () => {
  it("rewrites weak openings and asks for a measurable result", () => {
    const suggestions = suggestBulletImprovements(
      sampleResume(),
      extractKeywords("React TypeScript AWS"),
    );
    const suggestion = suggestions.find((item) =>
      item.original.startsWith("Responsible"),
    );
    expect(suggestion).toBeDefined();
    expect(suggestion?.suggested.startsWith("Owned ")).toBe(true);
    expect(suggestion?.suggested).toContain("[add a measurable result");
    expect(suggestion?.reasons.length).toBeGreaterThan(0);
  });

  it("does not suggest changes for strong, quantified bullets", () => {
    const suggestions = suggestBulletImprovements(sampleResume(), []);
    expect(
      suggestions.some((item) => item.original.startsWith("Reduced load time")),
    ).toBe(false);
  });
});

describe("applyBulletChanges", () => {
  it("replaces only the approved bullet and keeps the order", () => {
    const data = sampleResume();
    const next = applyBulletChanges(data, [
      {
        entryId: "exp-1",
        original: "Responsible for building the billing dashboard",
        suggested: "Owned the billing dashboard, saving 6 hours per week.",
      },
    ]);
    const lines = next.experience[0].description.split("\n");
    expect(lines[0]).toBe("Owned the billing dashboard, saving 6 hours per week.");
    expect(lines[1]).toBe("Reduced load time by 38% across the dashboard");
    expect(data.experience[0].description).toContain("Responsible for");
  });

  it("returns the same data when nothing is selected", () => {
    const data = sampleResume();
    expect(applyBulletChanges(data, [])).toBe(data);
  });
});

describe("addSkillsToResume", () => {
  it("routes reviewed keywords into the right skills groups", () => {
    const next = addSkillsToResume(sampleResume(), [
      "Kubernetes",
      "Python",
      "Redis",
      "Spanish",
    ]);
    expect(next.skills.technologies).toContain("Kubernetes");
    expect(next.skills.languages).toContain("Python");
    expect(next.skills.databases).toContain("Redis");
    expect(next.skills.spoken).toContain("Spanish");
  });

  it("does not duplicate an existing skill", () => {
    const next = addSkillsToResume(sampleResume(), ["react"]);
    expect(next.skills.technologies.match(/React/gi)).toHaveLength(1);
  });
});

describe("generateCoverLetter", () => {
  it("uses the resume, company, role, and job keywords", () => {
    const letter = generateCoverLetter({
      resume: sampleResume(),
      company: "Acme",
      role: "Senior Frontend Developer",
      manager: "Dana Lee",
      jobDescription: "We need React and TypeScript engineers.",
    });
    expect(letter).toContain("Dear Dana Lee,");
    expect(letter).toContain("Senior Frontend Developer");
    expect(letter).toContain("Acme");
    expect(letter).toContain("TypeScript");
    expect(letter).toContain("Alex Morgan");
    expect(letter).toContain("Sincerely,");
  });
});

describe("buildInterviewQuestions", () => {
  it("grounds questions in the resume and company", () => {
    const questions = buildInterviewQuestions(sampleResume(), "Acme");
    const text = questions.map((item) => item.question).join(" ");
    expect(text).toContain("Frontend Developer");
    expect(text).toContain("Northwind Labs");
    expect(text).toContain("TypeScript");
    expect(text).toContain("Acme");
    expect(new Set(questions.map((item) => item.question)).size).toBe(questions.length);
  });
});

describe("career schemas", () => {
  it("accepts a valid application and rejects an unknown status", () => {
    expect(
      applicationInputSchema.safeParse({
        company: "Acme",
        role: "Developer",
        status: "applied",
      }).success,
    ).toBe(true);
    expect(
      applicationInputSchema.safeParse({
        company: "Acme",
        role: "Developer",
        status: "ghosted",
      }).success,
    ).toBe(false);
  });

  it("requires cover letter content", () => {
    expect(
      coverLetterInputSchema.safeParse({ title: "Letter", content: "" }).success,
    ).toBe(false);
  });
});

describe("application url", () => {
  const base = { company: "Acme", role: "Engineer" };

  it("accepts http(s) links and an empty value", () => {
    expect(applicationInputSchema.safeParse({ ...base, url: "https://acme.com/jobs/1" }).success).toBe(true);
    expect(applicationInputSchema.safeParse({ ...base, url: "" }).success).toBe(true);
  });

  it("rejects non-http schemes", () => {
    expect(applicationInputSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...base, url: "acme.com" }).success).toBe(false);
  });
});
