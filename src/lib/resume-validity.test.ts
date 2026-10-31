import { describe, expect, it } from "vitest";
import { checkResumeValidity, isValidResume } from "./resume-validity";
import { createEmptyResume } from "./resume-schema";

describe("checkResumeValidity", () => {
  it("rejects an empty resume", () => {
    const result = checkResumeValidity(createEmptyResume());
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("your full name");
    expect(result.missing).toContain("your email address");
  });

  it("rejects an invalid email", () => {
    const data = createEmptyResume();
    data.personal.name = "Ada Lovelace";
    data.personal.email = "not-an-email";
    data.skills.technologies = "React";
    expect(checkResumeValidity(data).missing).toContain("a valid email address");
  });

  it("accepts a name, valid email, and at least one section", () => {
    const data = createEmptyResume();
    data.personal.name = "Ada Lovelace";
    data.personal.email = "ada@example.com";
    data.education = [
      {
        id: "edu-1",
        college: "Cambridge",
        degree: "Maths",
        startDate: "2017-09",
        endDate: "2020-06",
        current: false,
      },
    ];
    expect(checkResumeValidity(data).missing).toEqual([]);
    expect(isValidResume(data)).toBe(true);
  });
});
