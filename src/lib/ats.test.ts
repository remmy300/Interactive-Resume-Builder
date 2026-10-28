import { describe, expect, it } from "vitest";
import {
  analyzeResume,
  extractKeywords,
  matchKeywords,
  mergeSkillList,
  resumeText,
  suggestSkillsField,
} from "./ats";
import { createEmptyResume, type ResumeData } from "./resume-schema";

function completeResume(): ResumeData {
  const data = createEmptyResume();
  data.template = "ats";
  data.summary =
    "Frontend developer with four years of experience building accessible React applications for large teams.";
  data.personal = {
    name: "Ada Lovelace",
    title: "Frontend Developer",
    phone: "+44 20 7946 0958",
    email: "ada@example.com",
    location: "London, UK",
    linkedIn: "linkedin.com/in/ada",
    github: "github.com/ada",
    portfolio: "ada.dev",
  };
  data.experience = [
    {
      id: "e1",
      company: "Analytical Engines",
      role: "Frontend Developer",
      description: [
        "Led a migration to Next.js that cut page load time by 40%.",
        "Built a design system used by 12 product teams.",
        "Reduced accessibility defects by 60% across the checkout flow.",
        "Mentored three junior engineers and ran weekly code reviews.",
        "Improved Lighthouse performance scores from 62 to 94.",
        "Shipped a component library adopted by four squads.",
      ].join("\n"),
      startDate: "2021-01",
      endDate: "",
      current: true,
    },
  ];
  data.education = [
    {
      id: "ed1",
      college: "University of London",
      degree: "BSc Computer Science",
      startDate: "2016-09",
      endDate: "2020-06",
      current: false,
    },
  ];
  data.skills = {
    languages: "TypeScript, Python, SQL",
    technologies: "React, Next.js, Docker, AWS, Figma",
    databases: "PostgreSQL, Redis",
    spoken: "English",
  };
  return data;
}

describe("analyzeResume", () => {
  it("scores an empty resume poorly", () => {
    const report = analyzeResume(createEmptyResume());
    expect(report.score).toBeLessThan(25);
    expect(report.failed).toBeGreaterThan(0);
  });

  it("scores a complete, quantified resume highly", () => {
    const report = analyzeResume(completeResume());
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.checks.find((check) => check.id === "format")?.status).toBe("pass");
    expect(report.checks.find((check) => check.id === "numbers")?.status).toBe(
      "pass",
    );
  });

  it("warns when a two-column template is used", () => {
    const data = { ...completeResume(), template: "two-column" as const };
    const check = analyzeResume(data).checks.find((item) => item.id === "format");
    expect(check?.status).toBe("warn");
  });

  it("flags first-person wording", () => {
    const data = completeResume();
    data.summary = "I am a frontend developer who builds my own design systems.";
    const check = analyzeResume(data).checks.find((item) => item.id === "pronouns");
    expect(check?.status).toBe("warn");
  });
});

describe("resumeText", () => {
  it("includes contact details, bullets, and skills", () => {
    const text = resumeText(completeResume());
    expect(text).toContain("ada@example.com");
    expect(text).toContain("Analytical Engines");
    expect(text).toContain("TypeScript");
  });
});

describe("extractKeywords", () => {
  it("finds skills and phrases while ignoring filler words", () => {
    const keywords = extractKeywords(
      "We are looking for a React Native developer with TypeScript and AWS experience. React Native is required.",
    );
    const terms = keywords.map((keyword) => keyword.term);
    expect(terms).toContain("typescript");
    expect(terms).toContain("aws");
    expect(terms).toContain("react native");
    expect(terms).not.toContain("experience");
    expect(terms).not.toContain("looking");
    expect(keywords.every((keyword) => !/[.,;]$/.test(keyword.display))).toBe(true);
  });

  it("does not join comma-separated list items into phrases", () => {
    const terms = extractKeywords(
      "React, TypeScript, Next.js and Kubernetes are used here.",
    ).map((keyword) => keyword.term);
    expect(terms).toContain("react");
    expect(terms).toContain("typescript");
    expect(terms).not.toContain("react typescript");
    expect(terms).not.toContain("typescript next.js");
  });

  it("returns an empty list for empty text", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});

describe("matchKeywords", () => {
  it("separates matched and missing keywords", () => {
    const data = completeResume();
    const keywords = extractKeywords("TypeScript, React, and Kubernetes");
    const result = matchKeywords(data, keywords);
    expect(result.matched.map((term) => term.toLowerCase())).toContain("typescript");
    expect(result.missing.map((term) => term.toLowerCase())).toContain("kubernetes");
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("mergeSkillList", () => {
  it("adds new skills without duplicating existing ones", () => {
    expect(mergeSkillList("React, TypeScript", ["typescript", "GraphQL"])).toBe(
      "React, TypeScript, GraphQL",
    );
  });
});

describe("suggestSkillsField", () => {
  it("routes database and language keywords to the right group", () => {
    expect(suggestSkillsField("PostgreSQL")).toBe("databases");
    expect(suggestSkillsField("Spanish")).toBe("spoken");
    expect(suggestSkillsField("TypeScript")).toBe("languages");
    expect(suggestSkillsField("Kubernetes")).toBe("technologies");
  });
});
