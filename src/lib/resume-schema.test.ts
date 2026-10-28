import { describe, expect, it } from "vitest";
import {
  createEmptyResume,
  normalizeResumeData,
  resumeDataSchema,
  saveResumeSchema,
  type ResumeData,
} from "./resume-schema";

function entryBase(): ResumeData {
  return createEmptyResume();
}

describe("normalizeResumeData", () => {
  it("fills defaults for empty or malformed input", () => {
    const normalized = normalizeResumeData(null);
    expect(normalized.template).toBe("classic");
    expect(normalized.summary).toBe("");
    expect(normalized.education).toEqual([]);
    expect(normalized.certifications).toEqual([]);
    expect(normalized.skills.spoken).toBe("");
  });

  it("upgrades legacy entries with stable ids and new fields", () => {
    const legacy = {
      personal: { name: "Ada Lovelace", email: "ada@example.com" },
      education: [{ college: "Cambridge", degree: "Maths" }],
      experience: [{ company: "Analytical Engines", role: "Engineer", description: "Built things" }],
      projects: [{ title: "Engine", description: "Notes", link: "" }],
      skills: { languages: "English", technologies: "Maths", databases: "" },
    };

    const normalized = normalizeResumeData(legacy);

    expect(normalized.personal.name).toBe("Ada Lovelace");
    expect(normalized.education[0].id).toBeTruthy();
    expect(normalized.experience[0].current).toBe(false);
    expect(normalized.certifications).toEqual([]);
    expect(normalized.skills.spoken).toBe("");
    expect(resumeDataSchema.safeParse(normalized).success).toBe(true);
  });

  it("falls back to classic when the stored template is unknown", () => {
    expect(normalizeResumeData({ template: "hologram" }).template).toBe("classic");
  });

  it("replaces arrays instead of merging old defaults back in", () => {
    const data = entryBase();
    data.education = [];
    const normalized = normalizeResumeData({ ...data, education: [] });
    expect(normalized.education).toHaveLength(0);
  });
});

describe("saveResumeSchema", () => {
  it("accepts a valid payload", () => {
    const data = createEmptyResume();
    expect(
      saveResumeSchema.safeParse({ title: "Backend resume", data }).success,
    ).toBe(true);
  });

  it("rejects a blank title", () => {
    const data = createEmptyResume();
    expect(saveResumeSchema.safeParse({ title: "   ", data }).success).toBe(false);
  });

  it("rejects unknown templates", () => {
    const data = { ...createEmptyResume(), template: "neon" };
    expect(saveResumeSchema.safeParse({ title: "CV", data }).success).toBe(false);
  });
});
