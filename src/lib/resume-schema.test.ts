import { describe, expect, it } from "vitest";
import {
  createEmptyResume,
  normalizeResumeData,
  normalizeStyle,
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

describe("design settings", () => {
  it("gives older resumes the default design", () => {
    expect(normalizeResumeData({}).style).toEqual({
      font: "template",
      fontScale: 1,
      spacing: "normal",
      pageSize: "a4",
      accent: "",
      align: "template",
      headerAlign: "template",
    });
  });

  it("keeps valid choices and repairs invalid ones", () => {
    const style = normalizeResumeData({
      style: { font: "garamond", fontScale: 9, spacing: "huge", pageSize: "letter" },
    }).style;
    expect(style).toMatchObject({ font: "garamond", fontScale: 1.4, spacing: "normal", pageSize: "letter" });
  });

  it("accepts a save that has no design settings yet", () => {
    const empty = createEmptyResume() as Partial<ResumeData>;
    delete empty.style;
    const parsed = resumeDataSchema.safeParse(empty);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.style.pageSize).toBe("a4");
  });
});

describe("text style settings", () => {
  it("defaults to the template's own colour and alignment", () => {
    const style = normalizeStyle(undefined);
    expect(style.accent).toBe("");
    expect(style.align).toBe("template");
    expect(style.headerAlign).toBe("template");
  });

  it("keeps a valid colour and alignment", () => {
    const style = normalizeStyle({ accent: "#1D4ED8", align: "justify", headerAlign: "center" });
    expect(style.accent).toBe("#1d4ed8");
    expect(style.align).toBe("justify");
    expect(style.headerAlign).toBe("center");
  });

  it("drops anything that is not a six-digit hex colour or a known alignment", () => {
    const style = normalizeStyle({
      accent: "red; background:url(x)",
      align: "right",
      headerAlign: "middle",
    });
    expect(style.accent).toBe("");
    expect(style.align).toBe("template");
    expect(style.headerAlign).toBe("template");
  });

  it("rejects an unsafe colour when saving", () => {
    const data = createEmptyResume();
    data.style = { ...data.style, accent: "javascript:1" };
    expect(resumeDataSchema.safeParse(data).success).toBe(false);
  });
});
