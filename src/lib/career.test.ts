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
  it("rewrites weak openings without inserting placeholder text", () => {
    const suggestions = suggestBulletImprovements(sampleResume());
    const suggestion = suggestions.find((item) =>
      item.original.startsWith("Responsible"),
    );
    expect(suggestion).toBeDefined();
    expect(suggestion?.suggested.startsWith("Owned ")).toBe(true);
    expect(suggestion?.suggested).not.toMatch(/[[\]]/);
    expect(suggestion?.reasons.length).toBeGreaterThan(0);
  });

  it("never suggests a bullet just because it has no number", () => {
    const data = sampleResume();
    data.experience[0].description = "Built sign-up and login pages in React and TypeScript.";
    expect(suggestBulletImprovements(data)).toEqual([]);
  });

  it("does not suggest changes for strong, quantified bullets", () => {
    const suggestions = suggestBulletImprovements(sampleResume());
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

describe("generateCoverLetter voice", () => {
  function realisticResume(): ResumeData {
    const data = createEmptyResume();
    data.personal = {
      ...data.personal,
      name: "Jentah Mwadime",
      title: "AI-Native Developer Intern | JavaScript & Full-Stack Development",
      email: "j@example.com",
    };
    data.summary =
      "JavaScript and TypeScript developer who builds and deploys full-stack web apps. Has shipped 5 full-stack apps.";
    data.experience = [
      {
        id: "e1",
        company: "Devbyte Community",
        role: "Frontend Developer",
        startDate: "2025-04",
        endDate: "2026-03",
        current: false,
        description: [
          "Worked in a team of 10 on a live startup product, consuming REST APIs built by the backend team.",
          "Built sign-up and login flows in React and TypeScript, handling auth state with Redux thunks.",
        ].join("\n"),
      },
      {
        id: "e2",
        company: "Upwork",
        role: "Software Developer",
        startDate: "2022-01",
        endDate: "2023-09",
        current: false,
        description:
          "Designed, built and deployed 5 full-stack apps in JavaScript and TypeScript with React and Node.js.",
      },
    ];
    data.projects = [
      {
        id: "p1",
        title: "FlowDesk (project management)",
        link: "",
        github: "",
        description:
          "Delivered project and task workflows with role-based access, using TanStack Query for caching.",
      },
    ];
    data.skills = {
      languages: "JavaScript, TypeScript",
      technologies: "React, Next.js, Redux Toolkit",
      databases: "PostgreSQL",
      spoken: "",
    };
    return data;
  }

  it("does not paste the CV summary or the long headline", () => {
    const letter = generateCoverLetter({
      resume: realisticResume(),
      company: "JanSoft",
      role: "AI Native Developer",
      jobDescription: "We use React, TypeScript and Node.js.",
    });
    expect(letter).not.toContain("Has shipped 5 full-stack apps");
    expect(letter).not.toContain("JavaScript & Full-Stack Development");
    expect(letter).not.toContain("hands-on experience in");
    expect(letter).toContain("I am an AI-Native Developer Intern");
  });

  it("writes first-person sentences from real bullets", () => {
    const letter = generateCoverLetter({
      resume: realisticResume(),
      company: "JanSoft",
      role: "AI Native Developer",
      jobDescription: "We use React and TypeScript.",
    });
    expect(letter).toContain("As a Frontend Developer at Devbyte Community, I ");
    expect(letter).toContain("Previously, as a Software Developer at Upwork, I ");
    expect(letter).toContain("where I delivered project and task workflows");
    expect(letter).toContain("FlowDesk,");
    expect(letter).not.toContain("(project management)");
  });

  it("only claims keywords that are on the CV", () => {
    const letter = generateCoverLetter({
      resume: realisticResume(),
      company: "JanSoft",
      role: "Developer",
      jobDescription: "Requires Kubernetes, Terraform and React.",
    });
    expect(letter).not.toMatch(/Kubernetes|Terraform/);
  });

  it("stays short in the concise tone", () => {
    const concise = generateCoverLetter({
      resume: realisticResume(),
      company: "JanSoft",
      role: "Developer",
      tone: "concise",
    });
    expect(concise).not.toContain("Outside of my day-to-day work");
    expect(concise).not.toContain("Previously,");
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
