import { describe, expect, it } from "vitest";
import { parseResumeText } from "./resume-import";

const PDF_TEXT = [
  "JENTAH REHEMA MWADIME",
  "Junior Software Developer | React | TypeScript | JavaScript | PostgreSQL | Testing",
  "Nairobi, Kenya | +254745577819 | jentahrehema7@gmail.com | github.com/remmy300",
  "Summary",
  "Self-taught developer in Nairobi building and deploying web applications since 2022.",
  "Experience",
  "Frontend Developer | [Startup name] | April 2025 to March 2026",
  "Team of 10 developers: 4 frontend, 6 backend",
  "Built sign-up and login pages in React and TypeScript, using Redux thunks for async",
  "requests and auth state, connected to APIs from the backend team.",
  "Fixed an authentication session bug where users had to sign in again after refreshing",
  "the page by saving the login token and restoring the session when the app loads.",
  "Independent Software Developer | 2022 to Present",
  "Built and deployed 5 full-stack apps with React, Next.js, TypeScript and Node.js,",
  "including authentication, payments and media upload.",
  "JENTAH REHEMA MWADIME",
  "Page 1 of 2",
  "Designed PostgreSQL schemas and wrote a real SQL query, using Prisma for data access.",
  "Projects",
  "CV App: Resume Builder and Career Platform | Live Demo: [link] | GitHub: [link] Next.js,",
  "React, TypeScript, Prisma, NextAuth, Material UI, Tailwind CSS, Vitest, React Testing",
  "Library",
  "Wrote automated tests with Vitest and React Testing Library covering resume parsing.",
  "Built a full-stack platform for resumes, job tracking and cover letters.",
  "Grocery Shop: E-commerce and Order Management | Live Demo: [link] | GitHub: [link]",
  "Next.js, React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Clerk, M-Pesa, Docker",
  "Built cart, checkout, delivery, order, inventory and admin workflows backed by REST",
  "APIs and PostgreSQL models.",
  "Education",
  "Kenya Certificate of Secondary Education (KCSE) | Eldoro Girls High School | [Year] Self-",
  "taught developer through independent projects and a team product.",
  "JENTAH REHEMA MWADIME",
  "Page 2 of 2",
].join("\n");

describe("a CV with a headline, footers and project stacks", () => {
  const { data } = parseResumeText(PDF_TEXT);

  it("reads the headline and the location from the contact line", () => {
    expect(data.personal.title).toBe("Junior Software Developer");
    expect(data.personal.location).toBe("Nairobi, Kenya");
    expect(data.personal.github).toBe("github.com/remmy300");
  });

  it("keeps every role, even when a page footer interrupts it", () => {
    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]).toMatchObject({
      company: "[Startup name]",
      role: "Frontend Developer",
      startDate: "2025-04",
      endDate: "2026-03",
    });
    expect(data.experience[0].description.split("\n")).toEqual([
      "Team of 10 developers: 4 frontend, 6 backend",
      "Built sign-up and login pages in React and TypeScript, using Redux thunks for async requests and auth state, connected to APIs from the backend team.",
      "Fixed an authentication session bug where users had to sign in again after refreshing the page by saving the login token and restoring the session when the app loads.",
    ]);
    expect(data.experience[1].role).toBe("Independent Software Developer");
    expect(data.experience[1].current).toBe(true);
    expect(data.experience[1].description).toContain("Designed PostgreSQL schemas");
    expect(data.experience[1].description).not.toMatch(/Page \d/);
  });

  it("splits projects whose stack sits on the title line or the next line", () => {
    expect(data.projects.map((project) => project.title)).toEqual([
      "CV App: Resume Builder and Career Platform",
      "Grocery Shop: E-commerce and Order Management",
    ]);
    expect(data.projects[0].description.split("\n")[0]).toMatch(
      /^Tech stack: Next\.js, React, TypeScript, Prisma.*React Testing Library$/,
    );
    expect(data.projects[0].description.split("\n")).toHaveLength(3);
    expect(data.projects[1].description.split("\n")[0]).toMatch(/^Tech stack: Next\.js, React/);
    expect(data.projects[1].description).toContain("Built cart, checkout");
  });

  it("reads an education line that holds the school, the award and a note", () => {
    expect(data.education).toHaveLength(1);
    expect(data.education[0].college).toBe("Eldoro Girls High School");
    expect(data.education[0].degree).toMatch(/Certificate of Secondary Education/);
  });
});

describe("Word text with a blank line between paragraphs", () => {
  const double = PDF_TEXT.split("\n")
    .filter((line) => !/^Page \d/.test(line) && line !== "JENTAH REHEMA MWADIME")
    .join("\n\n");
  const { data } = parseResumeText(`JENTAH REHEMA MWADIME\n\n${double}`);

  it("is not split into one entry per paragraph", () => {
    expect(data.experience).toHaveLength(2);
    expect(data.projects).toHaveLength(2);
    expect(data.education).toHaveLength(1);
  });
});

describe("a CV without a headline", () => {
  it("does not take the summary for the title", () => {
    const { data } = parseResumeText(
      "Alex Morgan\n+254700000000 · alex@example.com\nSUMMARY\nSelf-taught developer building web applications.\nSKILLS\nReact, TypeScript",
    );
    expect(data.personal.title).toBe("");
  });
});

describe("a wrapped Tech stack line from an exported resume", () => {
  it("keeps the whole list on one line instead of making a bullet of its tail", () => {
    const { data } = parseResumeText(
      [
        "Alex Morgan",
        "alex@example.com",
        "PROJECTS",
        "CV App: Resume Builder and Career Platform",
        "Tech stack: Next.js, React, TypeScript, Prisma, NextAuth, Material UI, Tailwind CSS, Vitest, React",
        "Testing Library",
        "Wrote automated tests with Vitest and React Testing Library covering resume parsing.",
        "Built a full-stack platform for resumes and job tracking, with Google sign-in.",
        "Grocery Shop: E-commerce and Order Management",
        "Tech stack: Next.js, React, TypeScript, Node.js, Express, PostgreSQL, Prisma, Clerk, M-Pesa, Docker",
        "Built cart, checkout, delivery and admin workflows backed by REST APIs.",
      ].join("\n"),
    );
    expect(data.projects).toHaveLength(2);
    expect(data.projects[0].description.split("\n")).toEqual([
      "Tech stack: Next.js, React, TypeScript, Prisma, NextAuth, Material UI, Tailwind CSS, Vitest, React Testing Library",
      "Wrote automated tests with Vitest and React Testing Library covering resume parsing.",
      "Built a full-stack platform for resumes and job tracking, with Google sign-in.",
    ]);
  });
});

describe("this app's own Classic Professional export", () => {
  const exported = [
    "Alex Morgan",
    "Frontend Engineer | React · Next.js · TypeScript",
    "alex@example.com · +254 700 000 000 · Nairobi, Kenya · LinkedIn · GitHub",
    "PROFESSIONAL SUMMARY",
    "Frontend engineer with 4+ years shipping production web apps in React and TypeScript.",
    "TECHNICAL SKILLS & TOOLS",
    "JavaScript | TypeScript | React | Next.js | Prisma | PostgreSQL",
    "PROJECTS",
    "Grocery Shop (e-commerce) | Next.js, TypeScript, PostgreSQL, Prisma | Live demo · GitHub",
    "Built cart, checkout and admin workflows on REST APIs and PostgreSQL.",
    "Resume Studio (career platform) | Next.js, TypeScript, Prisma, NextAuth, Material UI, Tailwind CSS",
    "Built PDF and Word resume import and a paginated live preview with PDF export.",
  ].join("\n");

  it("reads the skills heading and every project, with its stack", () => {
    const { data } = parseResumeText(exported);
    expect(data.skills.languages).toContain("TypeScript");
    expect(data.skills.technologies).toContain("Next.js");
    expect(data.projects.map((project) => project.title)).toEqual([
      "Grocery Shop (e-commerce)",
      "Resume Studio (career platform)",
    ]);
    expect(data.projects[0].description.split("\n")[0]).toBe(
      "Tech stack: Next.js, TypeScript, PostgreSQL, Prisma",
    );
    expect(data.projects[1].description.split("\n")[0]).toMatch(/^Tech stack: Next\.js, TypeScript, Prisma, NextAuth/);
  });
});
