import { describe, expect, it } from "vitest";
import { analyzeResume } from "./ats";
import { skillEvidence } from "./ats-quality";
import { applyBulletChanges } from "./career";
import {
  completeEducation,
  incompleteEducation,
  removeSkills,
  setLocation,
  suggestOpeningVariety,
} from "./cv-fixes";
import { createEmptyResume, type ResumeData } from "./resume-schema";

function resume(): ResumeData {
  const data = createEmptyResume();
  data.personal.name = "Ada Lovelace";
  data.personal.email = "ada@example.com";
  data.experience = [
    {
      id: "e1",
      company: "Acme",
      role: "Developer",
      startDate: "2022-01",
      endDate: "",
      current: true,
      description: [
        "Built login pages in React and TypeScript for the customer portal.",
        "Built a profile page with Redux Toolkit and loading states.",
        "Built a billing dashboard that shows invoices and payment history.",
        "Fixed a session bug by restoring the user from the profile API.",
      ].join("\n"),
    },
  ];
  data.projects = [
    {
      id: "p1",
      title: "Shop",
      link: "",
      github: "",
      description: "Integrated payments with a hosted checkout and webhooks.",
    },
  ];
  data.skills = {
    languages: "TypeScript, Python",
    technologies: "React, Django, Redux Toolkit",
    databases: "PostgreSQL, MySQL",
    spoken: "English",
  };
  return data;
}

describe("removeSkills", () => {
  it("removes the named skills from every group and keeps the rest", () => {
    const next = removeSkills(resume(), ["python", "Django", "MySQL"]);
    expect(next.skills).toEqual({
      languages: "TypeScript",
      technologies: "React, Redux Toolkit",
      databases: "PostgreSQL",
      spoken: "English",
    });
  });

  it("leaves nothing unevidenced once they are removed", () => {
    const data = resume();
    const { unsupported } = skillEvidence(data);
    expect(unsupported).toEqual(expect.arrayContaining(["Python", "Django", "MySQL"]));
    expect(skillEvidence(removeSkills(data, unsupported)).unsupported).toEqual([]);
  });

  it("does not touch the data when there is nothing to remove", () => {
    const data = resume();
    expect(removeSkills(data, [])).toBe(data);
  });
});

describe("suggestOpeningVariety", () => {
  it("changes only the third use of a repeated opening word", () => {
    const fixes = suggestOpeningVariety(resume());
    expect(fixes).toHaveLength(1);
    expect(fixes[0].original.startsWith("Built a billing dashboard")).toBe(true);
    expect(fixes[0].suggested).toBe(
      fixes[0].original.replace(/^Built/, fixes[0].suggested.split(" ")[0]),
    );
    expect(fixes[0].suggested).not.toMatch(/^Built/);
  });

  it("applies cleanly and clears the finding", () => {
    const data = resume();
    const fixes = suggestOpeningVariety(data);
    const next = applyBulletChanges(
      data,
      fixes.map((fix) => ({ entryId: fix.entryId, original: fix.original, suggested: fix.suggested })),
    );
    expect(next.experience[0].description).toContain(fixes[0].suggested);
    expect(suggestOpeningVariety(next)).toEqual([]);
    expect(analyzeResume(next).checks.find((c) => c.id === "verb-variety")?.status).toBe("pass");
  });

  it("also reaches project bullets", () => {
    const data = resume();
    data.projects[0].description = "Built a checkout flow with hosted payments.";
    const fixes = suggestOpeningVariety(data);
    const projectFix = fixes.find((fix) => fix.entryId === "p1");
    expect(projectFix).toBeDefined();
    const next = applyBulletChanges(data, [
      { entryId: "p1", original: projectFix!.original, suggested: projectFix!.suggested },
    ]);
    expect(next.projects[0].description).toBe(projectFix!.suggested);
  });
});

describe("contact and education", () => {
  it("sets the location", () => {
    expect(setLocation(resume(), " Nairobi, Kenya ").personal.location).toBe("Nairobi, Kenya");
  });

  it("treats a qualification typed as the school as a missing institution", () => {
    const data = resume();
    data.education = [
      { id: "ed1", college: "Highschool Graduate", degree: "", startDate: "", endDate: "", current: false },
    ];
    const found = incompleteEducation(data);
    expect(found?.institution).toBe("");
    expect(found?.qualification).toBe("Highschool Graduate");

    const next = completeEducation(data, "ed1", "Eldoro Girls High School", "KCSE");
    expect(next.education[0]).toMatchObject({ college: "Eldoro Girls High School", degree: "KCSE" });
    expect(incompleteEducation(next)).toBeNull();
  });
});
