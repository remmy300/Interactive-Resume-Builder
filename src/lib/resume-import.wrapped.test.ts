import { describe, expect, it } from "vitest";
import { parseResumeText } from "./resume-import";

/** Text as a PDF extractor returns it: hard-wrapped lines, no bullet characters. */
const WRAPPED_CV = `JENTAH REHEMA MWADIME
FULL-STACK DEVELOPER
jentahrehema7@gmail.com · GitHub
SUMMARY
Full-Stack Developer with 4 years of experience building responsive, production-oriented web applications
using React, Next.js, TypeScript, JavaScript, Node.js, Express.js, PostgreSQL, MongoDB, and Prisma.
EXPERIENCE
Independent / Project-Based Jan 2022 – Present
Full-Stack Developer
Built and shipped full-stack applications from 0→1, translating product requirements into responsive
interfaces, APIs, database models,
authentication, integrations, and deployments.
Developed reusable React and Next.js component architectures with TypeScript and modern UI libraries,
improving consistency and
making new features easier to implement.
Integrated Clerk, Google OAuth, Google Maps/Places, Cloudinary, M-Pesa, PayPal, and Firebase into
complete customer and business
workflows.
Improved application quality through performance and accessibility optimization, achieving 81%
Lighthouse Performance and 91%
Accessibility on a production-oriented grocery platform.
PROJECTS
Grocery Shop
Built an end-to-end grocery ordering platform covering product discovery, cart, checkout, orders,
delivery information, payments, inventory,
and administration.
Developed REST APIs for products, orders, authentication, inventory, settings, and payment workflows,
connecting the customer interface
to backend operations.
FlowDesk — Project Management Platform
Next.js · React · TypeScript · Node.js · Express · PostgreSQL · Prisma · Clerk · TanStack Query
Built a centralized project-management workflow for projects, tasks, priorities, statuses, and users,
bringing core work tracking into one
application.
Task Manager
React · Redux Toolkit · Node.js · Express · REST APIs
Built a full-stack task management application with reusable React components, predictable state
management, and REST APIs for task
CRUD workflows.
Job Tracker
React · TypeScript · Firebase
Built a responsive application for organizing and tracking job applications with React, TypeScript,
Firebase authentication, and application
data management.
EDUCATION & PROFESSIONAL DEVELOPMENT
Technical development: Continuous hands-on development in TypeScript, Python, system design,
PostgreSQL/Prisma, authentication,
APIs, deployment, and modern frontend engineering.
EDUCATION
Eldorado
highscool graduate
SKILLS
LANGUAGES
TypeScript
FRAMEWORKS & TOOLS
React, Next.js, shadcn/ui, responsive design, CI/CD fundamentals, Google Maps/Places
DATABASES
PostgreSQL, MongoDB, MySQL, SQL, Neon PostgreSQL`;

describe("wrapped PDF text", () => {
  const { data, warnings } = parseResumeText(WRAPPED_CV, [
    "https://github.com/jentah",
  ]);
  const bullets = (text: string) => text.split("\n");

  it("joins wrapped lines into whole bullets", () => {
    const [entry] = data.experience;
    expect(entry.company).toBe("Independent / Project-Based");
    expect(entry.role).toBe("Full-Stack Developer");
    expect(entry.current).toBe(true);
    expect(bullets(entry.description)).toHaveLength(4);
    expect(entry.description).toContain(
      "responsive interfaces, APIs, database models, authentication, integrations, and deployments.",
    );
    expect(entry.description).toContain("91% Accessibility on a production-oriented");
  });

  it("splits projects into separate entries with their stack", () => {
    expect(data.projects.map((project) => project.title)).toEqual([
      "Grocery Shop",
      "FlowDesk — Project Management Platform",
      "Task Manager",
      "Job Tracker",
    ]);
    const flowdesk = data.projects[1];
    expect(flowdesk.description).toContain("Tech stack: Next.js · React");
    expect(bullets(flowdesk.description)).toHaveLength(2);
    expect(bullets(data.projects[0].description)).toHaveLength(2);
  });

  it("does not turn project text into education", () => {
    expect(data.education).toHaveLength(1);
    expect(data.education[0].college).toBe("Eldorado");
    expect(warnings.join(" ")).toMatch(/skipped/);
  });

  it("keeps slash skills whole and groups by the CV's own labels", () => {
    expect(data.skills.languages).toBe("TypeScript");
    expect(data.skills.technologies).toContain("shadcn/ui");
    expect(data.skills.technologies).toContain("CI/CD fundamentals");
    expect(data.skills.technologies).toContain("Google Maps/Places");
    expect(data.skills.technologies).not.toContain("FRAMEWORKS");
    expect(data.skills.databases).toBe("PostgreSQL, MongoDB, MySQL, SQL, Neon PostgreSQL");
  });

  it("uses link annotations from the PDF", () => {
    expect(data.personal.github).toBe("https://github.com/jentah");
    expect(data.personal.title).toBe("FULL-STACK DEVELOPER");
  });
});

/** Bullets marked only by a leading space and a hidden symbol-font glyph. */
const INDENTED_CV = [
  "Alex Morgan",
  "Frontend Engineer",
  "alex@example.com",
  "SKILLS",
  "\uF0B7 Languages: JavaScript (ES6+), TypeScript",
  "\uF0B7 Methodologies: Agile (Scrum, Kanban), CI/CD",
  "EXPERIENCE",
  "Frontend Developer Acme | Remote January 2021 – Present",
  " \uF0B7Collaborated with designers to translate Figma designs into pixel-",
  "perfect interfaces.",
  " \uF0B7Optimized frontend performance using lazy loading and efficient state management,",
  "reducing load times by up to 40%.",
  " \uF0B7Built a dashboard",
  "used by the whole support team.",
  "PROJECTS",
  "Coffee Platform — MERN Stack",
  "Technologies: React, Node.js, MongoDB",
  " \uF0B7Integrated PayPal and M-Pesa gateways, enabling seamless payments.",
  " \uF0B7Designed responsive UI components, enhancing accessibility and cross-device",
  "compatibility.",
  " \uF0B7Live Demo | Github",
  "Recipe App — MERN Stack",
  "Technologies: React, Express.js",
  " \uF0B7Developed a recipe-sharing platform with CRUD functionality, improving user",
  "interaction and content management.",
  " \uF0B7Live Demo | Github",
].join("\n");

describe("indented bullets", () => {
  const { data } = parseResumeText(INDENTED_CV);

  it("never splits one achievement into two", () => {
    const lines = data.experience[0].description.split("\n");
    expect(lines).toEqual([
      "Collaborated with designers to translate Figma designs into pixel-perfect interfaces.",
      "Optimized frontend performance using lazy loading and efficient state management, reducing load times by up to 40%.",
      "Built a dashboard used by the whole support team.",
    ]);
  });

  it("splits projects, keeps the stack, and drops link captions", () => {
    expect(data.projects.map((project) => project.title)).toEqual([
      "Coffee Platform — MERN Stack",
      "Recipe App — MERN Stack",
    ]);
    const lines = data.projects[0].description.split("\n");
    expect(lines).toEqual([
      "Tech stack: React, Node.js, MongoDB",
      "Integrated PayPal and M-Pesa gateways, enabling seamless payments.",
      "Designed responsive UI components, enhancing accessibility and cross-device compatibility.",
    ]);
    expect(data.projects[1].description).not.toMatch(/Live Demo/);
  });

  it("keeps bracketed skills together and honours group labels", () => {
    expect(data.skills.languages).toBe("JavaScript (ES6+), TypeScript");
    expect(data.skills.technologies).toContain("Agile (Scrum, Kanban)");
  });
});
