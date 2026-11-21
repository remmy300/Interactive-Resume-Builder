import { describe, expect, it } from "vitest";
import {
  analyzeResume,
  assessJobFit,
  extractKeywords,
  isValidCheck,
  matchKeywords,
  type AtsReport,
} from "./ats";
import { analyzeBullet, qualityChecks } from "./ats-quality";
import { SCORE_CAPS, VERDICTS, verdictFor, CHECK_WEIGHTS } from "./ats-scoring";
import { suggestOpeningVariety } from "./cv-fixes";
import { createEmptyResume, type ResumeData } from "./resume-schema";

// Dates are evaluated against a fixed "today" so these tests never drift.
const NOW = new Date("2026-06-15T00:00:00Z");

type Role = Partial<ResumeData["experience"][number]>;

function role(overrides: Role = {}): ResumeData["experience"][number] {
  return {
    id: `r${Math.random().toString(36).slice(2, 8)}`,
    company: "Northwind Ltd",
    role: "Frontend Developer",
    startDate: "2022-01",
    endDate: "2024-12",
    current: false,
    description: [
      "Built a checkout flow in React that reduced cart abandonment by 18%.",
      "Cut page load time from 4.2s to 1.9s by splitting bundles and caching API responses.",
      "Led migration of 40 components to TypeScript, which removed a class of runtime bugs.",
    ].join("\n"),
    ...overrides,
  };
}

function baseResume(): ResumeData {
  const data = createEmptyResume();
  data.personal = {
    name: "Ada Lovelace",
    title: "Frontend Developer",
    phone: "+44 20 7946 0958",
    email: "ada@example.com",
    location: "London, UK",
    linkedIn: "linkedin.com/in/ada",
    github: "github.com/ada",
    portfolio: "",
  };
  data.summary =
    "Frontend developer with four years of experience building accessible React applications for large teams.";
  data.experience = [role()];
  data.education = [
    {
      id: "e1",
      college: "University of London",
      degree: "BSc Computer Science",
      startDate: "2018-09",
      endDate: "2021-06",
      current: false,
    },
  ];
  data.projects = [];
  data.certifications = [];
  data.skills = {
    languages: "TypeScript, JavaScript",
    technologies: "React, Next.js",
    databases: "PostgreSQL",
    spoken: "English",
  };
  return data;
}

const check = (report: AtsReport, id: string) =>
  report.checks.find((item) => item.id === id);

/* -------------------------------------------------------------------------- */

describe("one contract for every check", () => {
  it("produces only valid checks, with weights from the central table", () => {
    const resumes = [baseResume(), createEmptyResume()];
    const placeholder = baseResume();
    placeholder.summary = "[Add a summary]";
    resumes.push(placeholder);

    for (const data of resumes) {
      const report = analyzeResume(data, NOW);
      for (const item of report.checks) {
        expect(isValidCheck(item), `${item.id} breaks the contract`).toBe(true);
        expect(item.weight).toBe(CHECK_WEIGHTS[item.id] ?? 0);
      }
      const ids = report.checks.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("leaves the dates check out when no role has dates", () => {
    const data = baseResume();
    data.experience = [role({ startDate: "", endDate: "" })];
    const ids = qualityChecks(data, NOW).map((item) => item.id);
    expect(ids).not.toContain("dates");

    data.experience = [];
    expect(qualityChecks(data, NOW).map((item) => item.id)).not.toContain(
      "role-bullets",
    );
  });

  it("never lets an optional detail change the score", () => {
    const full = analyzeResume(baseResume(), NOW);
    const data = baseResume();
    data.personal.phone = "";
    data.personal.location = "";
    data.personal.linkedIn = "";
    data.personal.github = "";
    const bare = analyzeResume(data, NOW);

    expect(bare.score).toBe(full.score);
    for (const id of ["phone", "location", "links"]) {
      expect(check(bare, id)?.status).toBe("info");
      expect(check(bare, id)?.weight).toBe(0);
    }
  });
});

describe("a complete resume with strong achievements", () => {
  it("scores well and explains why", () => {
    const report = analyzeResume(baseResume(), NOW);

    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.caps).toEqual([]);
    expect(check(report, "outcomes")?.status).toBe("pass");
    expect(check(report, "metrics")?.status).toBe("pass");
    expect(check(report, "dates")?.status).toBe("pass");
    expect(report.verdict).toBe(verdictFor(report.score));
  });

  it("explains every point that was lost, biggest loss first", () => {
    const data = baseResume();
    data.summary = "Short.";
    const report = analyzeResume(data, NOW);

    expect(report.breakdown.length).toBeGreaterThan(0);
    const lost = report.breakdown.map((item) => item.lost);
    expect([...lost].sort((a, b) => b - a)).toEqual(lost);
    for (const item of report.breakdown) {
      expect(item.earned + item.lost).toBeCloseTo(item.possible, 1);
    }
    expect(report.breakdown.find((item) => item.id === "summary")?.lost).toBeGreaterThan(0);
  });

  it("does not give any single check an outsized share of the score", () => {
    const scoredWeights = Object.entries(CHECK_WEIGHTS)
      .filter(([id]) => !["export-text", "parse-safe-text", "pdf-verification"].includes(id))
      .map(([, weight]) => weight);
    const total = scoredWeights.reduce((sum, weight) => sum + weight, 0);
    expect(Math.max(...scoredWeights) / total).toBeLessThanOrEqual(0.15);
  });
});

describe("a resume with no work experience but strong projects", () => {
  function graduate(): ResumeData {
    const data = baseResume();
    data.experience = [];
    data.projects = [
      {
        id: "p1",
        title: "Task manager",
        description: [
          "Built a task manager in React and TypeScript that syncs offline edits when a connection returns.",
          "Added unit tests and a CI pipeline that caught regressions before release.",
          "Reduced initial load time by 35% by lazy loading routes.",
        ].join("\n"),
        link: "https://example.com/tasks",
        github: "https://github.com/ada/tasks",
      },
    ];
    return data;
  }

  it("is not failed for lacking a job, and the dates check does not appear", () => {
    const report = analyzeResume(graduate(), NOW);
    expect(check(report, "experience")?.status).toBe("pass");
    expect(check(report, "dates")).toBeUndefined();
    expect(check(report, "role-bullets")).toBeUndefined();
    expect(report.score).toBeGreaterThanOrEqual(70);
  });

  it("does not penalise missing projects when work experience is strong", () => {
    const withProjects = analyzeResume(baseResume(), NOW);
    expect(check(withProjects, "projects")?.status).toBe("info");
  });

  it("caps a resume that shows no work and no project at all", () => {
    const data = baseResume();
    data.experience = [];
    const report = analyzeResume(data, NOW);
    // Never better than "needs work", whatever else the resume does well.
    expect(report.score).toBeLessThanOrEqual(60);
    expect(report.verdict).not.toBe("Good resume");
  });
});

describe("a resume with missing optional contact information", () => {
  it("is not marked down for phone, location or profile links", () => {
    const data = baseResume();
    data.personal.phone = "";
    data.personal.location = "";
    data.personal.linkedIn = "";
    data.personal.github = "";
    const report = analyzeResume(data, NOW);

    expect(report.failed).toBe(0);
    expect(report.score).toBeGreaterThanOrEqual(85);
  });

  it("still treats name and email as required", () => {
    const data = baseResume();
    data.personal.email = "";
    const report = analyzeResume(data, NOW);
    expect(check(report, "email")?.status).toBe("fail");
    expect(report.score).toBeLessThanOrEqual(35);
    expect(report.capDetails.map((cap) => cap.id)).toContain("unsendable");
  });
});

describe("employment dates", () => {
  it("fails an end date before the start date", () => {
    const data = baseResume();
    data.experience = [role({ startDate: "2024-06", endDate: "2023-01" })];
    const dates = check(analyzeResume(data, NOW), "dates");
    expect(dates?.status).toBe("fail");
    expect(dates?.examples?.join(" ")).toMatch(/before the start/i);
  });

  it("asks for a date that cannot be read instead of treating it as missing", () => {
    const data = baseResume();
    data.experience = [role({ startDate: "sometime in spring" })];
    const dates = check(analyzeResume(data, NOW), "dates");
    expect(dates?.status).toBe("warn");
    expect(dates?.examples?.join(" ")).toMatch(/could not be read/i);
  });

  it("reads month names and a bare year", () => {
    const data = baseResume();
    data.experience = [role({ startDate: "Jan 2022", endDate: "2024" })];
    expect(check(analyzeResume(data, NOW), "dates")?.status).toBe("pass");
  });

  it("warns when two different employers overlap for months", () => {
    const data = baseResume();
    data.experience = [
      role({ company: "Northwind Ltd", startDate: "2021-01", endDate: "2023-06" }),
      role({ company: "Contoso", startDate: "2022-01", endDate: "2024-06" }),
    ];
    const dates = check(analyzeResume(data, NOW), "dates");
    expect(dates?.status).toBe("warn");
    expect(dates?.examples?.join(" ")).toMatch(/overlap/i);
  });

  it("does not flag a promotion, a short handover or part-time work as overlap", () => {
    const promotion = baseResume();
    promotion.experience = [
      role({ company: "Northwind Ltd", role: "Developer", startDate: "2021-01", endDate: "2022-06" }),
      role({ company: "Northwind Ltd", role: "Senior Developer", startDate: "2022-03", endDate: "2024-06" }),
    ];
    expect(check(analyzeResume(promotion, NOW), "dates")?.status).toBe("pass");

    const handover = baseResume();
    handover.experience = [
      role({ company: "Northwind Ltd", startDate: "2021-01", endDate: "2022-06" }),
      role({ company: "Contoso", startDate: "2022-05", endDate: "2024-06" }),
    ];
    expect(check(analyzeResume(handover, NOW), "dates")?.status).toBe("pass");

    const partTime = baseResume();
    partTime.experience = [
      role({ company: "Northwind Ltd", startDate: "2021-01", endDate: "2023-06" }),
      role({ company: "Contoso", role: "Freelance Designer", startDate: "2022-01", endDate: "2024-06" }),
    ];
    expect(check(analyzeResume(partTime, NOW), "dates")?.status).toBe("pass");
  });

  it("counts overlapping years once", () => {
    const data = baseResume();
    data.experience = [
      role({ startDate: "2020-01", endDate: "2022-12" }),
      role({ company: "Other", startDate: "2021-01", endDate: "2022-12" }),
    ];
    const report = analyzeResume(data, NOW);
    expect(report.checks.find((item) => item.id === "length")).toBeDefined();
  });
});

describe("skills written with aliases", () => {
  it("treats Node, Postgres, React.js and REST APIs as the skills the posting names", () => {
    const posting = `Requirements:
- React.js and Node.js
- PostgreSQL and REST APIs`;
    const data = baseResume();
    data.experience = [
      role({
        description:
          "Built REST API endpoints in Node backed by Postgres, and a React frontend that cut report time by 40%.",
      }),
    ];
    const match = matchKeywords(data, extractKeywords(posting));

    expect(match.missing).toEqual([]);
    expect(match.matched.length).toBeGreaterThanOrEqual(4);
    expect(match.score).toBe(100);
  });

  it("counts one skill once however it is written", () => {
    const keywords = extractKeywords(
      "Requirements: React, React.js and ReactJS. Node, Node.js, NodeJS.",
    );
    const terms = keywords.map((item) => item.term);
    expect(terms.filter((term) => term === "react")).toHaveLength(1);
    expect(terms.filter((term) => term === "node.js")).toHaveLength(1);
  });

  it("keeps React Native, REST API and CI/CD as whole terms", () => {
    const terms = extractKeywords(
      "Requirements: React Native, REST API design and CI/CD pipelines.",
    ).map((item) => item.display);
    expect(terms).toEqual(expect.arrayContaining(["React Native", "REST API", "CI/CD"]));
  });
});

describe("a job description with irrelevant words", () => {
  const posting = `Frontend Engineer at Acme Corp
At Acme, employees are at the heart of it. It is a great place to work.
Requirements:
- Experience with React and TypeScript
Nice to have:
- GraphQL
Benefits: free lunch for all employees, health insurance`;

  it("extracts requirements and not ordinary words", () => {
    const terms = extractKeywords(posting).map((item) => item.term);
    for (const noise of ["at", "is", "it", "employees", "acme", "lunch", "great"]) {
      expect(terms).not.toContain(noise);
    }
    expect(terms).toEqual(expect.arrayContaining(["react", "typescript", "graphql"]));
  });

  it("separates required skills from preferred ones", () => {
    const keywords = extractKeywords(posting);
    const importance = (term: string) =>
      keywords.find((item) => item.term === term)?.importance;
    expect(importance("react")).toBe("required");
    expect(importance("graphql")).toBe("preferred");

    const weight = (term: string) =>
      keywords.find((item) => item.term === term)?.weight ?? 0;
    expect(weight("react")).toBeGreaterThan(weight("graphql"));
  });

  it("does not read the verb 'go' as the language", () => {
    const terms = extractKeywords(
      "We are a go to market team. Go live fast. Experience with Python required.",
    ).map((item) => item.term);
    expect(terms).not.toContain("go");
    expect(
      extractKeywords("Requirements: Go and Python").map((item) => item.term),
    ).toContain("go");
  });

  it("does not match a skill on a name, a company or a location", () => {
    const data = baseResume();
    data.personal.name = "Go Java";
    data.personal.location = "React, Texas";
    data.summary = "";
    data.personal.title = "";
    data.experience = [
      role({
        company: "Node Labs",
        description: "Built dashboards for finance teams that cut month-end close by 2 days.",
      }),
    ];
    data.skills = { languages: "", technologies: "", databases: "", spoken: "" };

    const match = matchKeywords(data, extractKeywords("Requirements: Java, Go, React, Node.js"));
    expect(match.matched).toEqual([]);
  });

  it("credits a skill that was used more than one that is only listed", () => {
    const posting = "Requirements: React and Docker";
    const data = baseResume();
    data.experience = [
      role({ description: "Built a React checkout flow that reduced abandonment by 18%." }),
    ];
    data.skills = { languages: "", technologies: "Docker", databases: "", spoken: "" };

    const match = matchKeywords(data, extractKeywords(posting));
    expect(match.listedOnly).toEqual(["Docker"]);
    expect(match.score).toBeLessThan(100);
    expect(match.score).toBeGreaterThan(50);
  });
});

describe("job compatibility is its own assessment", () => {
  it("is separate from general quality and from the document check", () => {
    const data = baseResume();
    const report = analyzeResume(data, NOW);
    const fit = assessJobFit(data, "Requirements: Kubernetes, Terraform, Go and AWS");

    expect(fit.score).toBe(0);
    expect(fit.verdict).toBe("Weak match");
    expect(fit.missingRequired.length).toBeGreaterThan(0);
    // The same resume stays a good resume: the job fit did not touch the score.
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.document.score).not.toBeNull();
    expect(report.document.checks.every((item) => item.category === "document")).toBe(true);
  });

  it("keeps document checks out of the quality score", () => {
    const report = analyzeResume(baseResume(), NOW);
    expect(report.breakdown.every((item) => item.category !== "document")).toBe(true);
  });

  it("reports no score when the posting has no requirements", () => {
    const fit = assessJobFit(baseResume(), "   ");
    expect(fit.score).toBeNull();
    expect(fit.verdict).toBe("No requirements found");
  });

  it("flags emoji that parsers can drop", () => {
    const data = baseResume();
    data.summary = "Frontend developer 🚀 who builds accessible React applications for large teams.";
    const report = analyzeResume(data, NOW);
    expect(check(report, "parse-safe-text")?.status).toBe("warn");
    expect(report.document.score).toBeLessThan(100);
    expect(report.score).toBe(analyzeResume(baseResume(), NOW).score);
  });
});

describe("bullets with genuine metrics", () => {
  it.each([
    "Reduced page load time from 4.2s to 1.9s by splitting bundles.",
    "Grew newsletter signups by 32% through a redesigned sign-up form.",
    "Handled 1,200 support tickets a month with a median reply under 2 hours.",
  ])("counts %s", (text) => {
    const bullet = analyzeBullet(text);
    expect(bullet.metric).toBe(true);
    expect(bullet.strength).toBe(3);
  });
});

describe("numbers that are not achievements", () => {
  it.each([
    "Built 5 apps for internal teams across the company.",
    "Team of 10 developers working across 3 time zones.",
    "Worked at Northwind from 2019 to 2022 on the web team.",
    "Used React 18 and Node 20 to build the portal.",
  ])("does not count a metric in %s", (text) => {
    expect(analyzeBullet(text).metric).toBe(false);
  });

  it("keeps a result-free bullet below full strength", () => {
    expect(analyzeBullet("Built 5 apps for internal teams across the company.").strength).toBeLessThan(3);
  });
});

describe("bullet quality", () => {
  it("recognises an outcome that has no number", () => {
    const bullet = analyzeBullet(
      "Rewrote the approval screen so reviewers could clear requests faster.",
    );
    expect(bullet.metric).toBe(false);
    expect(bullet.outcome).toBe(true);
    expect(bullet.strength).toBeGreaterThanOrEqual(2);
  });

  it("treats short verb-and-noun statements as fragments", () => {
    for (const text of ["Built dashboard", "Created REST API integration", "Worked on testing"]) {
      expect(analyzeBullet(text).complete, text).toBe(false);
    }
  });

  it("does not reward a list of tool names", () => {
    const bullet = analyzeBullet(
      "Used React, Redux, Node.js, Docker, AWS and PostgreSQL on projects.",
    );
    expect(bullet.strength).toBeLessThanOrEqual(1.5);
  });

  it("separates passive, responsibility and vague wording from real action", () => {
    expect(analyzeBullet("Responsible for maintaining the reporting dashboards.").action).toBe(
      "responsibility",
    );
    expect(analyzeBullet("The migration was completed by the platform team.").action).toBe("passive");
    expect(analyzeBullet("Managed various tasks and other things as needed.").action).toBe("vague");
    expect(
      analyzeBullet("Migrated the billing service to a queue-based design.").action,
    ).toBe("strong");
  });

  it("gives little credit to a boast with nothing behind it", () => {
    const boast = analyzeBullet("Expert in world-class customer delivery and outstanding results.");
    expect(boast.claim).toBe(true);
    expect(boast.strength).toBeLessThanOrEqual(1);

    const report = analyzeResume(
      (() => {
        const data = baseResume();
        data.experience = [
          role({
            description: [
              "Expert in world-class customer delivery and outstanding results.",
              "Managed various tasks and other things as needed.",
              "Responsible for maintaining the reporting dashboards.",
            ].join("\n"),
          }),
        ];
        return data;
      })(),
      NOW,
    );
    expect(check(report, "outcomes")?.status).not.toBe("pass");
    expect(check(report, "weak-phrases")?.status).not.toBe("pass");
  });

  it("does not make repeated opening verbs a major defect", () => {
    const withBullets = (bullets: string[]) => {
      const data = baseResume();
      data.experience = [role({ description: bullets.join("\n") })];
      return data;
    };
    const varied = withBullets([
      "Built a checkout flow in React that reduced cart abandonment by 18%.",
      "Built a reporting screen that lets managers export weekly totals.",
      "Cut page load time from 4.2s to 1.9s by caching API responses.",
      "Led migration of 40 components to TypeScript, which removed runtime bugs.",
      "Introduced code review checks that caught 30 defects before release.",
      "Mentored two junior developers through their first production releases.",
    ]);
    expect(check(analyzeResume(varied, NOW), "verb-variety")?.status).toBe("pass");

    // Even when one verb dominates, it is a small note, not a big deduction.
    const repetitive = withBullets([
      "Built a checkout flow in React that reduced cart abandonment by 18%.",
      "Built a reporting screen that lets managers export weekly totals.",
      "Built a notification service that cut missed alerts by 25%.",
      "Built a search page that returns results in under 300 ms.",
    ]);
    const report = analyzeResume(repetitive, NOW);
    const variety = check(report, "verb-variety");
    expect(variety?.status).toBe("warn");
    expect(variety?.weight).toBeLessThanOrEqual(1);
    expect(analyzeResume(varied, NOW).score - report.score).toBeLessThanOrEqual(2);
  });
});

describe("suggestions only reuse what the resume says", () => {
  it("suggests no verb that repeats a word in the bullet, role or company", () => {
    const data = baseResume();
    data.experience = [
      role({
        company: "Developed Labs",
        role: "Developer",
        description: [
          "Built a checkout flow in React.",
          "Built a reporting screen for managers.",
          "Built a notification service for alerts and developed a rollout plan.",
        ].join("\n"),
      }),
    ];
    for (const fix of suggestOpeningVariety(data)) {
      const verb = fix.suggested.split(/\s+/)[0].toLowerCase();
      expect(verb).not.toBe("developed");
      const rest = fix.suggested.toLowerCase().split(/\s+/).slice(1);
      expect(rest).not.toContain(verb);
    }
  });
});

describe("placeholders and unfinished content", () => {
  it.each([
    "[Add a measurable result]",
    "TODO write achievements",
    "TBD",
    "Increased sales by XX%",
    "Reduced costs by [metric]",
    "Lorem ipsum dolor sit amet",
  ])("fails and caps a resume that still says %s", (text) => {
    const data = baseResume();
    data.experience = [
      role({
        description: [
          "Built a checkout flow in React that reduced cart abandonment by 18%.",
          "Cut page load time from 4.2s to 1.9s by caching API responses.",
          text,
        ].join("\n"),
      }),
    ];
    const report = analyzeResume(data, NOW);
    expect(check(report, "unresolved-placeholders")?.status).toBe("fail");
    expect(report.score).toBeLessThanOrEqual(60);
    expect(report.capDetails.map((cap) => cap.id)).toContain("placeholders");
  });

  it("does not mistake ordinary brackets for a placeholder", () => {
    const data = baseResume();
    data.experience = [
      role({
        description: [
          "Built a checkout flow (React and TypeScript) that reduced cart abandonment by 18%.",
          "Cut page load time from 4.2s to 1.9s by caching API responses [see case study].",
        ].join("\n"),
      }),
    ];
    expect(check(analyzeResume(data, NOW), "unresolved-placeholders")?.status).toBe("pass");
  });
});

describe("fair checks", () => {
  it("does not call 'dynamic' a buzzword in a technical sentence", () => {
    const data = baseResume();
    data.summary =
      "Frontend developer who builds accessible React applications with dynamic programming for large teams.";
    expect(check(analyzeResume(data, NOW), "cliches")?.status).toBe("pass");
  });

  it("scales the length guidance to experience", () => {
    const long = baseResume();
    long.experience = [
      role({
        startDate: "2010-01",
        endDate: "2024-12",
        description: Array.from(
          { length: 14 },
          (_, index) =>
            `Led project ${index} to modernise the delivery pipeline, which reduced release time by ${10 + index}% across teams. ${"Worked closely with product and design to refine scope and priorities every week. ".repeat(4)}`,
        ).join("\n"),
      }),
    ];
    const senior = check(analyzeResume(long, NOW), "length");

    const junior = baseResume();
    junior.experience = [role({ startDate: "2025-01", endDate: "2025-12", description: long.experience[0].description })];
    const early = check(analyzeResume(junior, NOW), "length");

    // The same amount of text can be fine for a decade of experience and long
    // for a first role.
    expect(senior?.status).toBe("pass");
    expect(early?.status).toBe("warn");
  });

  it("does not require education when a strong work history carries the resume", () => {
    const data = baseResume();
    data.education = [];
    data.experience = [role({ startDate: "2019-01", endDate: "2024-12" })];
    expect(check(analyzeResume(data, NOW), "education")?.status).toBe("info");

    const junior = baseResume();
    junior.education = [];
    junior.experience = [role({ startDate: "2025-01", endDate: "2025-12" })];
    expect(check(analyzeResume(junior, NOW), "education")?.status).toBe("warn");
  });

  it("only counts skills that the work shows, not the summary's own claim", () => {
    const data = baseResume();
    data.summary = "Frontend developer experienced with Kubernetes and Terraform at scale.";
    data.skills.technologies = "React, Kubernetes, Terraform";
    const evidence = check(analyzeResume(data, NOW), "skills-evidence");
    expect(evidence?.examples).toEqual(expect.arrayContaining(["Kubernetes", "Terraform"]));
  });
});

describe("scores, caps and verdicts", () => {
  it("keeps verdict thresholds in one ordered table", () => {
    const mins = VERDICTS.map((entry) => entry.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
    expect(mins.at(-1)).toBe(0);
    for (const entry of VERDICTS) {
      expect(verdictFor(entry.min)).toBe(entry.label);
    }
  });

  it("keeps every cap justified and below a good score", () => {
    for (const cap of SCORE_CAPS) {
      expect(cap.reason.length).toBeGreaterThan(20);
      expect(cap.max).toBeLessThan(VERDICTS.find((entry) => entry.label === "Good resume")!.min);
    }
    expect(new Set(SCORE_CAPS.map((cap) => cap.id)).size).toBe(SCORE_CAPS.length);
  });

  it("scores an empty resume as empty", () => {
    const report = analyzeResume(createEmptyResume(), NOW);
    expect(report.score).toBeLessThanOrEqual(20);
    expect(report.verdict).toBe("Not ready");
  });

  it("gives identical results every time for the same input", () => {
    const variants: ResumeData[] = [baseResume(), createEmptyResume()];
    const messy = baseResume();
    messy.experience = [
      role({ description: "Responsible for various tasks.\n[Add a result]\nBuilt dashboard" }),
      role({ company: "Contoso", startDate: "2023-05", endDate: "2021-01" }),
    ];
    variants.push(messy);

    for (const data of variants) {
      const first = JSON.stringify(analyzeResume(data, NOW));
      for (let run = 0; run < 5; run += 1) {
        expect(JSON.stringify(analyzeResume(structuredClone(data), NOW))).toBe(first);
      }
    }

    const posting = "Requirements:\n- React.js and Node.js\n- PostgreSQL\nNice to have:\n- GraphQL";
    const jobFirst = JSON.stringify(assessJobFit(baseResume(), posting));
    for (let run = 0; run < 5; run += 1) {
      expect(JSON.stringify(assessJobFit(baseResume(), posting))).toBe(jobFirst);
    }
  });
});
