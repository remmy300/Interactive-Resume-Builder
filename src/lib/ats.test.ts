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
    expect(report.checks.find((check) => check.id === "export-text")?.status).toBe(
      "pass",
    );
    expect(report.checks.find((check) => check.id === "outcomes")?.status).toBe(
      "pass",
    );
  });

  it("does not penalise a two-column template without inspecting the exported PDF", () => {
    const classic = analyzeResume({ ...completeResume(), template: "classic" });
    const twoColumn = analyzeResume({
      ...completeResume(),
      template: "two-column",
    });
    expect(twoColumn.score).toBe(classic.score);
    expect(
      twoColumn.checks.find((item) => item.id === "pdf-verification")?.status,
    ).toBe("info");
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

  it("does not let a vague resume score well", () => {
    const report = analyzeResume(vagueResume());
    expect(report.score).toBeLessThan(70);
    // Weighted deductions do the work; there is no arbitrary cap for vague wording.
    expect(report.caps).toHaveLength(0);
    expect(report.rawScore).toBe(report.score);
  });

  it("flags vague phrases and buzzwords with examples", () => {
    const data = vagueResume();
    expect(find(data, "weak-phrases")?.status).toBe("fail");
    expect(find(data, "weak-phrases")?.examples?.length).toBeGreaterThan(0);
    expect(find(data, "cliches")?.status).not.toBe("pass");
  });

  it("treats metrics as a bonus rather than a requirement", () => {
    const data = completeResume();
    data.experience[0].description = [
      "Implemented OAuth login with Google and GitHub providers.",
      "Integrated Stripe webhooks to keep subscription status in sync.",
      "Added unit tests and a CI pipeline for the payments service.",
      "Refactored the API layer to support versioned endpoints.",
    ].join("\n");

    expect(find(data, "outcomes")?.status).toBe("pass");
    expect(find(data, "metrics")?.status).toBe("info");
    expect(analyzeResume(data).score).toBeGreaterThan(70);
  });

  it("does not treat a bare year as a credible metric", () => {
    const data = completeResume();
    data.experience[0].description = [
      "Built the portal in 2023",
      "Led the redesign in 2022",
      "Shipped the app in 2021",
    ].join("\n");
    expect(find(data, "metrics")?.status).toBe("warn");
  });

  it("flags end dates before start dates and long gaps", () => {
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
    expect(find(gap, "dates")?.status).toBe("warn");
  });

  it("flags listed skills that the experience never shows", () => {
    const data = completeResume();
    data.skills.technologies = "Kubernetes, Terraform, Ansible, Go, Rust";
    expect(find(data, "skills-evidence")?.status).not.toBe("pass");
  });

  it("distinguishes strong actions, passive descriptions, responsibilities, and vague bullets", () => {
    const data = completeResume();
    data.experience[0].description = [
      "The dashboard was built by the team.",
      "Responsible for the billing dashboard.",
      "Various tasks and meetings.",
      "Built a React dashboard used by 12 product teams.",
    ].join("\n");

    const check = find(data, "action");
    expect(check?.status).not.toBe("pass");
    const examples = check?.examples?.join(" ") ?? "";
    expect(examples).toMatch(/Passive:/);
    expect(examples).toMatch(/Responsibility:/);
    expect(examples).toMatch(/Vague:/);
  });

  it("fails and caps a resume with unresolved placeholder text", () => {
    const data = completeResume();
    data.experience[0].description +=
      "\nDesigned schemas and wrote queries. [add a measurable result: %, time saved, users, or revenue]";

    const report = analyzeResume(data);
    expect(find(data, "unresolved-placeholders")?.status).toBe("fail");
    expect(find(data, "unresolved-placeholders")?.examples?.length).toBeGreaterThan(
      0,
    );
    expect(report.score).toBeLessThanOrEqual(60);
    expect(report.caps.length).toBeGreaterThan(0);
  });

  it("flags fragment bullets and lowers the score", () => {
    const data = completeResume();
    data.experience[0].description = [
      "Built dashboard",
      "Implemented API",
      "React, TypeScript, and Node.js",
      "Reduced latency",
      "Added tests",
      "Shipped feature",
    ].join("\n");

    const report = analyzeResume(data);
    const completeness = report.checks.find(
      (check) => check.id === "sentence-completeness",
    );
    expect(completeness?.status).toBe("fail");
    expect(completeness?.examples?.length).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(85);
  });

  it("passes complete, well-formed bullets", () => {
    expect(
      find(completeResume(), "sentence-completeness")?.status,
    ).toBe("pass");
  });

  it("flags comma-separated action fragments", () => {
    const data = completeResume();
    data.experience[0].description =
      "Built a responsive web application, integrated APIs, and wrote tests.";
    expect(find(data, "sentence-completeness")?.status).toBe("fail");
  });

  it("does not let project bullets hide an empty work role", () => {
    const data = completeResume();
    data.experience[0].description = "";
    data.projects = [
      {
        id: "p1",
        title: "Payments dashboard",
        description: [
          "Built a React dashboard for the payments team.",
          "Implemented OAuth login with Google and GitHub providers.",
          "Added unit tests and a CI pipeline.",
        ].join("\n"),
        link: "",
        github: "",
      },
    ];

    const report = analyzeResume(data);
    expect(find(data, "outcomes")?.status).toBe("fail");
    expect(find(data, "action")?.status).toBe("fail");
    expect(find(data, "role-bullets")?.status).toBe("fail");
    expect(report.score).toBeLessThan(85);
  });

  it("treats word count as a warning rather than a pass/fail rule", () => {
    const short = completeResume();
    short.summary = "";
    short.experience[0].description = "Built a React dashboard.";
    expect(find(short, "length")?.status).not.toBe("fail");

    const long = completeResume();
    long.summary = Array.from({ length: 700 }, (_, index) => `word${index}`).join(
      " ",
    );
    // About 800 words: comfortably inside the warning band, not automatically bad.
    expect(find(long, "length")?.status).toBe("pass");
  });

  it("does not mark incomplete experience or education entries as complete", () => {
    const experience = completeResume();
    experience.experience[0].endDate = "";
    experience.experience[0].current = false;
    expect(find(experience, "experience")?.status).toBe("warn");

    const education = completeResume();
    education.education[0].degree = "";
    expect(find(education, "education")?.status).toBe("warn");
  });

  it("does not let optional contact details dominate the score", () => {
    const data = completeResume();
    data.personal.phone = "";
    data.personal.location = "";
    data.personal.linkedIn = "";
    data.personal.github = "";
    data.personal.portfolio = "";

    const report = analyzeResume(data);
    expect(report.score).toBeGreaterThan(85);
    expect(find(data, "name")?.status).toBe("pass");
    expect(find(data, "email")?.status).toBe("pass");
  });

  it("reports a category breakdown that totals 100 points", () => {
    const report = analyzeResume(completeResume());
    expect(report.categories).toHaveLength(6);
    expect(report.categories.reduce((sum, item) => sum + item.total, 0)).toBe(100);
    expect(report.categories.map((item) => item.label)).toContain(
      "Document compatibility",
    );
  });

  it("only caps the score for genuine critical blockers", () => {
    const data = completeResume();
    data.personal.name = "";
    data.personal.email = "";

    const report = analyzeResume(data);
    expect(report.score).toBeLessThanOrEqual(35);
    expect(report.caps.length).toBeGreaterThan(0);
  });
});

describe("resume types", () => {
  it("does not score a resume with no experience or projects highly", () => {
    const data = completeResume();
    data.experience = [];
    data.projects = [];

    const report = analyzeResume(data);
    expect(report.score).toBeLessThan(70);
    expect(report.checks.find((check) => check.id === "outcomes")?.status).toBe(
      "fail",
    );
    expect(report.checks.find((check) => check.id === "action")?.status).toBe(
      "fail",
    );
  });

  it("supports a graduate with projects and no work experience", () => {
    const data = createEmptyResume();
    data.personal = {
      name: "Sam Rivera",
      title: "Junior Developer",
      phone: "",
      email: "sam@example.com",
      location: "Manchester, UK",
      linkedIn: "",
      github: "github.com/sam",
      portfolio: "",
    };
    data.summary =
      "Computer science graduate building accessible React applications.";
    data.experience = [];
    data.education = [
      {
        id: "edu-1",
        college: "University of Manchester",
        degree: "BSc Computer Science",
        startDate: "2022-09",
        endDate: "2025-06",
        current: false,
      },
    ];
    data.projects = [
      {
        id: "p1",
        title: "Task manager",
        description: [
          "Built a task manager with React, TypeScript, and a REST API.",
          "Added unit tests and a CI pipeline that caught regressions early.",
          "Implemented keyboard navigation and WCAG accessibility checks.",
        ].join("\n"),
        link: "https://example.com/tasks",
        github: "https://github.com/sam/tasks",
      },
    ];
    data.skills = {
      languages: "TypeScript, SQL",
      technologies: "React, Next.js, Docker",
      databases: "PostgreSQL",
      spoken: "English",
    };

    const report = analyzeResume(data);
    expect(report.score).toBeGreaterThan(55);
    expect(report.checks.find((check) => check.id === "experience")?.status).toBe(
      "warn",
    );
    expect(
      report.checks.find((check) => check.id === "skills-evidence")?.status,
    ).toBe("warn");
  });

  it("supports a non-technical professional with operational evidence", () => {
    const data = createEmptyResume();
    data.personal = {
      name: "Jordan Blake",
      title: "Operations Manager",
      phone: "+44 20 7946 0100",
      email: "jordan@example.com",
      location: "Leeds, UK",
      linkedIn: "linkedin.com/in/jordan",
      github: "",
      portfolio: "",
    };
    data.summary =
      "Operations manager focused on inventory accuracy, logistics, and team performance.";
    data.experience = [
      {
        id: "e1",
        company: "North Retail",
        role: "Operations Manager",
        description: [
          "Managed a team of 18 across two stores and improved on-time stock replenishment.",
          "Reduced stock loss by 15% through a new inventory and audit process.",
          "Introduced forecasting and scheduling workflows used by three departments.",
        ].join("\n"),
        startDate: "2020-03",
        endDate: "",
        current: true,
      },
    ];
    data.education = [
      {
        id: "edu-1",
        college: "Leeds Business School",
        degree: "BA Business Management",
        startDate: "2015-09",
        endDate: "2018-06",
        current: false,
      },
    ];
    data.skills = {
      languages: "",
      technologies: "Inventory Management, Logistics, Forecasting",
      databases: "",
      spoken: "English",
    };

    const report = analyzeResume(data);
    expect(report.score).toBeGreaterThan(65);
    expect(report.checks.find((check) => check.id === "outcomes")?.status).toBe(
      "pass",
    );
    expect(report.checks.find((check) => check.id === "metrics")?.status).toBe(
      "pass",
    );
  });
});

describe("job postings that are not about software", () => {
  const terms = (text: string) => extractKeywords(text).map((keyword) => keyword.display);

  it("finds the duties and requirements of a housekeeping job", () => {
    const found = terms(
      [
        "Housekeeper",
        "We are looking for a reliable Housekeeper. Duties include cleaning rooms, doing laundry, ironing and washing dishes.",
        "Requirements:",
        "- Minimum 2 years experience as a housekeeper",
        "- Honest, hardworking and trustworthy",
        "- Knowledge of cleaning products and equipment",
      ].join("\n"),
    );
    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(found).toEqual(expect.arrayContaining(["Cleaning", "Trustworthy"]));
  });

  it("returns something for a driver posting with no software terms", () => {
    expect(
      terms("Driver wanted. Must hold a valid driving licence, vehicle maintenance knowledge, punctual."),
    ).not.toEqual([]);
  });

  it("matches word forms, so cleaned on a resume covers cleaning in a posting", () => {
    const data = completeResume();
    data.experience[0].description = "Cleaned and organised 12 rooms daily.";
    const keywords = extractKeywords(
      "Requirements:\n- Cleaning experience\n- Trustworthy and honest\n- Laundry\n- Ironing\n- Dishes",
    );
    expect(matchKeywords(data, keywords).matched).toContain("Cleaning");
  });

  it("does not read 'mobile money' as mobile app development", () => {
    expect(terms("Cashier: handle cash and mobile money payments")).not.toContain(
      "Mobile Development",
    );
  });

  it("uses a posting pasted on a single line, even in capitals", () => {
    expect(
      terms("FRONTEND DEVELOPER REQUIREMENTS: REACT, TYPESCRIPT, HTML, CSS, TAILWIND, REDUX, GIT"),
    ).toEqual(expect.arrayContaining(["React", "TypeScript", "Git"]));
  });
});
