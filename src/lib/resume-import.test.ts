import { describe, expect, it } from "vitest";
import { parseResumeText } from "./resume-import";

const SAMPLE = `Alex Morgan
Frontend Developer
alex@example.com | +1 415 555 0134 | linkedin.com/in/alex | github.com/alex

PROFESSIONAL SUMMARY
Frontend developer with four years of experience building accessible React applications.

WORK EXPERIENCE
Northwind Labs
Frontend Developer
Jan 2023 - Present
- Led the migration to Next.js, cutting first load by 38%.
- Built a typed design system used by four teams.

Pineapple Studio
Junior Developer
Jun 2021 - Feb 2023
- Shipped a booking flow that increased reservations by 22%.

EDUCATION
University of California, Berkeley
BSc Computer Science
Aug 2017 - May 2021

SKILLS
TypeScript, React, Next.js
PostgreSQL, Redis
English`;

describe("parseResumeText", () => {
  it("extracts contact details and a title", () => {
    const { data } = parseResumeText(SAMPLE);
    expect(data.personal.name).toBe("Alex Morgan");
    expect(data.personal.title).toBe("Frontend Developer");
    expect(data.personal.email).toBe("alex@example.com");
    expect(data.personal.phone).toContain("555");
    expect(data.personal.linkedIn).toContain("linkedin.com");
    expect(data.personal.github).toContain("github.com");
  });

  it("splits roles and parses dates", () => {
    const { data } = parseResumeText(SAMPLE);
    expect(data.experience).toHaveLength(2);

    const current = data.experience[0];
    expect(current.company).toBe("Northwind Labs");
    expect(current.role).toBe("Frontend Developer");
    expect(current.startDate).toBe("2023-01");
    expect(current.current).toBe(true);
    expect(current.description).toContain("Led the migration");

    const previous = data.experience[1];
    expect(previous.company).toBe("Pineapple Studio");
    expect(previous.startDate).toBe("2021-06");
    expect(previous.endDate).toBe("2023-02");
    expect(previous.current).toBe(false);
  });

  it("extracts education, summary, and grouped skills", () => {
    const { data } = parseResumeText(SAMPLE);
    expect(data.summary).toContain("Frontend developer");
    expect(data.education[0].college).toContain("University");
    expect(data.education[0].degree).toContain("BSc");
    expect(data.skills.languages).toContain("TypeScript");
    expect(data.skills.technologies).toContain("React");
    expect(data.skills.databases).toContain("PostgreSQL");
    expect(data.skills.spoken).toContain("English");
  });

  it("falls back to the summary when no headings are recognised", () => {
    const { data, warnings } = parseResumeText(
      "Jamie Lee\njamie@example.com\nA designer who builds calm interfaces.",
    );
    expect(data.summary).toContain("designer");
    expect(warnings.some((warning) => warning.includes("headings"))).toBe(true);
  });

  it("returns warnings for missing sections", () => {
    const { warnings } = parseResumeText("Just a name");
    expect(warnings.length).toBeGreaterThan(0);
  });
});
