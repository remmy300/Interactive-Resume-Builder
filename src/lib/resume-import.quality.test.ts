import { describe, expect, it } from "vitest";
import { parseResumeText } from "./resume-import";

describe("nothing is lost silently", () => {
  const TEXT = [
    "Sam Ndungu",
    "Software Engineer",
    "sam@example.com | +254 700 123 456 | Nairobi, Kenya",
    "EXPERIENCE",
    "Software Engineer | Acme Ltd | Jan 2021 – Present",
    "• Built the checkout flow used by 20,000 customers.",
    "• Cut page load time by 38% on mobile.",
    "Responsible for various duties across several teams and also helping out wherever needed in the company.",
    "Interests",
    "Chess and long-distance running",
    "REFERENCES",
    "Available on request",
    "EDUCATION",
    "Reading, writing and arithmetic were learnt at home through plenty of practice over many years.",
  ].join("\n");
  const result = parseResumeText(TEXT);

  it("keeps text under headings the builder has no section for", () => {
    expect(result.unassigned.map((item) => item.heading)).toEqual(["Interests", "REFERENCES"]);
    expect(result.unassigned[0].text).toContain("Chess");
    expect(result.warnings.join(" ")).toMatch(/Interests/);
  });

  it("does not let an unknown section's text leak into the previous section", () => {
    const descriptions = result.data.experience.map((entry) => entry.description).join("\n");
    expect(descriptions).not.toContain("Chess");
    expect(descriptions).not.toContain("Available on request");
  });

  it("records an education paragraph it could not read, with its text", () => {
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({ section: "education" });
    expect(result.rejected[0].text).toContain("plenty of practice");
    expect(result.warnings.join(" ")).toMatch(/skipped/);
  });
});

describe("rejected entries", () => {
  it("records an experience block with no company or title", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "EXPERIENCE",
        "Software Engineer | Acme | Jan 2020 – Present",
        "• Built things people use every day.",
        "Jan 2015 – Dec 2016",
        "• Did some work that nobody wrote a title for.",
      ].join("\n"),
    );
    expect(result.data.experience.length).toBeGreaterThanOrEqual(1);
    const lost = result.rejected.filter((item) => item.section === "experience");
    if (lost.length > 0) {
      expect(lost[0].text).toContain("2015");
    }
    // Whatever happened, the text of the dropped block is not simply gone.
    const everything = JSON.stringify(result);
    expect(everything).toContain("nobody wrote a title");
  });

  it("records a skill too long to be a skill", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "SKILLS",
        `JavaScript, ${"an extremely long sentence pretending to be a single skill ".repeat(2)}`,
      ].join("\n"),
    );
    expect(result.rejected.some((item) => item.section === "skills")).toBe(true);
    expect(result.data.skills.languages + result.data.skills.technologies).toContain("JavaScript");
  });

  it("records a certification it cannot read", () => {
    const result = parseResumeText(
      ["Ada Lovelace", "ada@example.com", "CERTIFICATIONS", "• AWS Cloud Practitioner"].join("\n"),
    );
    expect(result.data.certifications.map((item) => item.name)).toEqual(["AWS Cloud Practitioner"]);
    expect(result.rejected).toEqual([]);
  });
});

describe("incomplete fields", () => {
  it("lists what is missing from each role and the contact details", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "EXPERIENCE",
        "Software Engineer | Acme",
        "• Built the billing system for the finance team.",
      ].join("\n"),
    );
    const role = result.incomplete.find((item) => item.section === "experience");
    expect(role?.missing).toEqual(expect.arrayContaining(["start date", "end date"]));
    const contact = result.incomplete.find((item) => item.section === "personal");
    expect(contact?.missing).toEqual(expect.arrayContaining(["phone number", "location"]));
    expect(result.warnings.join(" ")).toMatch(/incomplete/i);
  });

  it("flags impossible dates", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "EXPERIENCE",
        "Software Engineer | Acme | Jan 2022 – Jan 2020",
        "• Built the billing system for the finance team.",
      ].join("\n"),
    );
    const role = result.incomplete.find((item) => item.section === "experience");
    expect(role?.issues.join(" ")).toMatch(/before the start/);
    expect(result.warnings.join(" ")).toMatch(/dates/i);
    expect(result.data.experience[0].startDate).toBe("2022-01");
  });

  it("reports nothing when the CV is complete", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "Software Engineer",
        "ada@example.com | +44 20 7946 0958 | London, UK",
        "EXPERIENCE",
        "Software Engineer | Acme | Jan 2020 – Dec 2022",
        "• Built the billing system for the finance team.",
        "EDUCATION",
        "BSc Mathematics | University of London | 2015 – 2018",
      ].join("\n"),
    );
    expect(result.incomplete).toEqual([]);
    expect(result.rejected).toEqual([]);
  });
});

describe("field confidence", () => {
  const result = parseResumeText(
    [
      "Ada Lovelace",
      "Software Engineer",
      "ada@example.com | +44 20 7946 0958 | London, UK",
      "EXPERIENCE",
      "Acme",
      "• Built the billing system for the finance team.",
    ].join("\n"),
  );

  it("is high for clearly read fields", () => {
    expect(result.confidence["personal.name"].level).toBe("high");
    expect(result.confidence["personal.email"].level).toBe("high");
    expect(result.confidence["personal.phone"].level).toBe("high");
  });

  it("is low for fields it had to guess, and says so", () => {
    expect(result.confidence["experience.0.role"].level).toBe("low");
    expect(result.confidence["experience.0.dates"].level).toBe("low");
    expect(result.warnings.join(" ")).toMatch(/hard to read/);
    expect(result.warnings.join(" ")).toMatch(/job title of role 1/);
  });

  it("is medium for a title taken from the contact line", () => {
    const shared = parseResumeText(
      ["Kelvin Muthomi", "Software Engineer • Nairobi, Kenya • +254706783609", "k@example.com"].join("\n"),
    );
    expect(shared.confidence["personal.title"].level).toBe("medium");
  });

  it("marks a summary found under no heading as medium", () => {
    const loose = parseResumeText(
      [
        "Kelvin Muthomi",
        "k@example.com | +254706783609",
        "I am a skilled engineer with four years of experience in software development and design.",
        "I have worked across global teams to solve problems and build secure, scalable systems.",
        "EXPERIENCE",
        "Software Engineer | Acme | Jan 2020 – Present",
      ].join("\n"),
    );
    expect(loose.confidence.summary.level).toBe("medium");
  });

  it("is low when no headings were found at all", () => {
    const flat = parseResumeText("Just some words with no structure at all, nothing else.");
    expect(flat.confidence.summary.level).toBe("low");
  });
});

describe("headers, punctuation and validation", () => {
  it("reads accented and hyphenated names", () => {
    expect(parseResumeText("José Müller-Ñandú\njose@example.com\nSKILLS\nGo, Rust").data.personal.name).toBe(
      "José Müller-Ñandú",
    );
  });

  it("does not take a date range for the phone number", () => {
    const result = parseResumeText(
      ["Ada Lovelace", "ada@example.com", "EXPERIENCE", "Software Engineer | Acme | 2018 - 2020"].join("\n"),
    );
    expect(result.data.personal.phone).toBe("");
    expect(result.incomplete[0].missing).toContain("phone number");
  });

  it("ignores rules drawn between sections", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "________________",
        "EXPERIENCE",
        "────────────────",
        "Software Engineer | Acme | Jan 2020 – Present",
        "• Built the billing system for the finance team.",
      ].join("\n"),
    );
    expect(result.data.experience).toHaveLength(1);
    expect(result.data.experience[0].description).not.toMatch(/[_─]/);
  });

  it("strips punctuation that trails a link", () => {
    const result = parseResumeText(
      ["Ada Lovelace", "ada@example.com | https://github.com/ada.", "SKILLS", "Go"].join("\n"),
    );
    expect(result.data.personal.github).toBe("https://github.com/ada");
  });

  it("puts a Languages section in spoken languages", () => {
    const result = parseResumeText(
      ["Ada Lovelace", "ada@example.com", "SKILLS", "Go, Rust", "LANGUAGES", "English (Fluent), Swahili (Native)"].join("\n"),
    );
    expect(result.data.skills.spoken).toBe("English (Fluent), Swahili (Native)");
    expect(result.unassigned).toEqual([]);
  });

  it("keeps a Languages label inside Skills as part of the skills", () => {
    const result = parseResumeText(
      ["Ada Lovelace", "ada@example.com", "SKILLS", "Languages: Go, Rust", "Databases: PostgreSQL"].join("\n"),
    );
    expect(result.data.skills.languages).toContain("Go");
    expect(result.data.skills.spoken).toBe("");
  });

  it("reads a role written as 'Role, Company (dates)'", () => {
    const result = parseResumeText(
      [
        "Ada Lovelace",
        "ada@example.com",
        "EXPERIENCE",
        "Backend Engineer, PesaPay Ltd (Mar 2020 - Present)",
        "• Designed REST APIs handling 20,000 requests a day.",
      ].join("\n"),
    );
    expect(result.data.experience[0]).toMatchObject({
      role: "Backend Engineer",
      company: "PesaPay Ltd",
      startDate: "2020-03",
      current: true,
    });
  });
});
