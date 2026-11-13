import { describe, expect, it } from "vitest";
import {
  analyzeResume,
  extractKeywords,
  matchKeywords,
  mergeSkillList,
  resumeText,
  suggestSkillsField,
} from "./ats";
import { experienceYears } from "./ats-quality";
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
    expect(report.checks.find((check) => check.id === "format")?.status).toBe("warn");
    expect(report.checks.find((check) => check.id === "format")?.weight).toBe(0);
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

  it("ignores company names, locations, and ordinary prose", () => {
    const keywords = extractKeywords(`
About Northwind Labs
Northwind Labs is a fast-growing company building tools for modern teams in London.
Requirements
- 5+ years of experience with React and TypeScript
- Strong communication and problem-solving skills
- Experience with AWS and Docker
Benefits
- Competitive salary, health insurance, and a great culture
`);
    const terms = keywords.map((keyword) => keyword.term);
    expect(terms).toContain("react");
    expect(terms).toContain("typescript");
    expect(terms).toContain("aws");
    expect(terms).toContain("docker");
    expect(terms).not.toContain("northwind");
    expect(terms).not.toContain("labs");
    expect(terms).not.toContain("company");
    expect(terms).not.toContain("teams");
    expect(terms).not.toContain("london");
    expect(terms).not.toContain("salary");
    expect(terms).not.toContain("insurance");
    expect(terms).not.toContain("culture");
    expect(terms).not.toContain("communication");
    expect(terms).not.toContain("problem");
  });

  it("normalises common skill aliases and multi-word terms", () => {
    const terms = extractKeywords(
      "Node.js, PostgreSQL, CI/CD, REST APIs, K8s, and unit testing",
    ).map((keyword) => keyword.term);
    expect(terms).toContain("node.js");
    expect(terms).toContain("postgresql");
    expect(terms).toContain("ci cd");
    expect(terms).toContain("rest api");
    expect(terms).toContain("kubernetes");
    expect(terms).toContain("unit testing");
  });

  it("keeps specific skill labels instead of broad aliases", () => {
    const displays = extractKeywords(
      "PostgreSQL, unit testing, IAM, Node.js, iOS, and AWS",
    ).map((keyword) => keyword.display);
    expect(displays).toContain("PostgreSQL");
    expect(displays).toContain("Unit Testing");
    expect(displays).toContain("Identity and Access Management");
    expect(displays).toContain("Node.js");
    expect(displays).toContain("iOS");
    expect(displays).toContain("AWS");
    expect(displays).not.toContain("SQL");
    expect(displays).not.toContain("Backend");
    expect(displays).not.toContain("Mobile Development");
  });

  it("keeps requirement wording when a benefit phrase appears in the same line", () => {
    const terms = extractKeywords(
      "Requirements: experience with health insurance systems and React.",
    ).map((keyword) => keyword.term);
    expect(terms).toContain("react");
  });

  it("does not treat a company name as a technical keyword", () => {
    const keywords = extractKeywords(
      "At Acme Corp, you will use Kubernetes and Terraform.",
    );
    const terms = keywords.map((keyword) => keyword.term);
    expect(terms).toContain("kubernetes");
    expect(terms).toContain("terraform");
    expect(terms).not.toContain("acme");
    expect(terms).not.toContain("corp");
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

  it("weights requirements instead of counting every word in the posting", () => {
    const keywords = extractKeywords(`
Requirements: React, TypeScript, Kubernetes, AWS.
Benefits: competitive salary and health insurance.
`);
    const result = matchKeywords(completeResume(), keywords);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.missing.join(" ")).toMatch(/Kubernetes/);
    expect(result.missing.join(" ")).not.toMatch(/salary|insurance|benefits/i);
  });

  it("treats a specific database as SQL experience", () => {
    const data = createEmptyResume();
    data.skills.databases = "PostgreSQL";
    expect(matchKeywords(data, extractKeywords("SQL")).matched).toContain("SQL");
  });

  it("recommends known skills, not company names or filler words", () => {
    const result = matchKeywords(
      completeResume(),
      extractKeywords(
        "At Northwind Labs we are looking for a developer with Kubernetes and Terraform experience.",
      ),
    );
    expect(result.missing).toContain("Kubernetes");
    expect(result.missing).toContain("Terraform");
    expect(result.missing.join(" ")).not.toMatch(/northwind|labs|developer|looking/i);
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

describe("analyzeResume honesty", () => {
  const find = (data: ResumeData, id: string) =>
    analyzeResume(data).checks.find((check) => check.id === id);

  function vagueResume(): ResumeData {
    const data = completeResume();
    data.summary = "Hard-working team player, passionate about results-driven work.";
    data.experience[0].description = [
      "Responsible for the website",
      "Worked on various tasks",
      "Helped with bug fixes",
      "Duties included meetings",
    ].join("\n");
    return data;
  }

  it("flags vague wording without applying an arbitrary score cap", () => {
    const report = analyzeResume(vagueResume());
    expect(report.checks.find((check) => check.id === "weak-phrases")?.status).toBe("warn");
    expect(report.caps).toEqual([]);
    expect(report.rawScore).toBe(report.score);
  });

  it("flags vague phrases and buzzwords with examples", () => {
    const data = vagueResume();
    expect(find(data, "weak-phrases")?.status).toBe("warn");
    expect(find(data, "weak-phrases")?.examples?.length).toBeGreaterThan(0);
    expect(find(data, "cliches")?.status).not.toBe("pass");
  });

  it("does not treat a year as a measurable result", () => {
    const data = completeResume();
    data.experience[0].description = [
      "Built the portal in 2023",
      "Led the redesign in 2022",
      "Shipped the app in 2021",
    ].join("\n");
    expect(find(data, "numbers")?.status).toBe("warn");
  });

  it("flags reversed dates but does not penalize employment gaps", () => {
    const data = completeResume();
    data.experience.push({
      id: "e2",
      company: "Old Co",
      role: "Developer",
      description: "Built internal tools that saved 10 hours a week.",
      startDate: "2019-06",
      endDate: "2019-01",
      current: false,
    });
    expect(find(data, "dates")?.status).toBe("fail");

    const gap = completeResume();
    gap.experience[0].startDate = "2022-01";
    gap.experience.push({
      id: "e3",
      company: "Prior Co",
      role: "Developer",
      description: "Built tools used by 40 staff.",
      startDate: "2019-01",
      endDate: "2020-01",
      current: false,
    });
    expect(find(gap, "dates")?.status).toBe("pass");
  });

  it("flags listed skills that the experience never shows", () => {
    const data = completeResume();
    data.skills.languages = "";
    data.skills.databases = "";
    data.skills.technologies = "Kubernetes, Terraform, Ansible, Go, Rust, Scala";
    expect(find(data, "skills-evidence")?.status).not.toBe("pass");
  });
});


describe("general assessment regression coverage", () => {
  it("does not judge email professionalism by digits in the address", () => {
    const data = completeResume();
    data.personal.email = "ada123456@example.com";
    const report = analyzeResume(data);
    expect(report.checks.some((check) => check.id === "email-tone")).toBe(false);
    expect(report.checks.find((check) => check.id === "email")?.status).toBe("pass");
  });

  it("does not count employment overlap twice", () => {
    const data = completeResume();
    data.experience = [
      {
        id: "overlap-a",
        company: "Company A",
        role: "Developer",
        description: "Built services.",
        startDate: "2020-01",
        endDate: "2022-01",
        current: false,
      },
      {
        id: "overlap-b",
        company: "Company B",
        role: "Consultant",
        description: "Delivered integrations.",
        startDate: "2021-01",
        endDate: "2023-01",
        current: false,
      },
    ];
    expect(experienceYears(data, new Date("2024-01-01T00:00:00Z"))).toBeCloseTo(3.08, 1);
  });

  it("recognizes common technology aliases in skills evidence", () => {
    const data = completeResume();
    data.skills.languages = "";
    data.skills.technologies = "React, Node.js, PostgreSQL, JavaScript, Next.js, TypeScript";
    data.skills.databases = "";
    data.summary = "Uses React.js, Node, Postgres, JS, Next JS and TS.";
    expect(analyzeResume(data).checks.find((check) => check.id === "skills-evidence")?.status).toBe("pass");
  });

  it("does not make the absence of metrics a hard failure", () => {
    const data = completeResume();
    data.experience[0].description = [
      "Implemented OAuth authentication using Clerk.",
      "Built reusable React components for the dashboard.",
      "Fixed a session persistence bug after page refresh.",
    ].join("\n");
    const report = analyzeResume(data);
    expect(report.checks.find((check) => check.id === "numbers")?.status).toBe("warn");
    expect(report.caps).toEqual([]);
  });
});
