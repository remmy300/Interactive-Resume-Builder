import { describe, expect, it } from "vitest";
import { cleanHeadingText, matchHeading, matchInlineHeading } from "./headings";
import {
  findEmail,
  findPhone,
  isDecorationLine,
  normalizeYear,
  parseDatesDetailed,
  splitSegments,
  toMonthValue,
  validUrl,
} from "./validate";

const NOW = new Date("2026-06-15T00:00:00Z");

describe("years", () => {
  it("reads two-digit years as the nearest sensible century", () => {
    expect(normalizeYear("21", NOW)).toBe(2021);
    expect(normalizeYear("98", NOW)).toBe(1998);
  });

  it("rejects years that cannot be real", () => {
    expect(normalizeYear("202", NOW)).toBeNull();
    expect(normalizeYear("9999", NOW)).toBeNull();
    expect(normalizeYear("1899", NOW)).toBeNull();
  });

  it("allows an expected graduation a few years ahead", () => {
    expect(normalizeYear("2029", NOW)).toBe(2029);
    expect(normalizeYear("2040", NOW)).toBeNull();
  });
});

describe("toMonthValue", () => {
  it.each([
    ["Jan 2021", "2021-01"],
    ["January, 2021", "2021-01"],
    ["Sept 2015", "2015-09"],
    ["Jan '21", "2021-01"],
    ["Jan’21", "2021-01"],
    ["03/2019", "2019-03"],
    ["2014-06", "2014-06"],
    ["2017", "2017-01"],
  ])("reads %s", (input, expected) => {
    expect(toMonthValue(input, NOW)).toBe(expected);
  });

  it.each(["13/2020", "00/2020", "Foo 2020", "Jan 202", "3/20"])(
    "refuses %s",
    (input) => {
      expect(toMonthValue(input, NOW)).toBe("");
    },
  );
});

describe("parseDatesDetailed", () => {
  it("reads closed and open ranges", () => {
    expect(parseDatesDetailed("Software Engineer 07/2021 - 02/2022", NOW)).toMatchObject({
      startDate: "2021-07",
      endDate: "2022-02",
      current: false,
      issues: [],
    });
    expect(parseDatesDetailed("Jan 2020 – Present", NOW)).toMatchObject({
      startDate: "2020-01",
      current: true,
    });
    expect(parseDatesDetailed("2019 till date", NOW).current).toBe(true);
    expect(parseDatesDetailed("2017 to 2019", NOW)).toMatchObject({
      startDate: "2017-01",
      endDate: "2019-01",
    });
  });

  it("reports an end date before the start date instead of hiding it", () => {
    const result = parseDatesDetailed("Jan 2022 – Jan 2020", NOW);
    expect(result.issues.join(" ")).toMatch(/before the start/);
    expect(result.startDate).toBe("2022-01");
  });

  it("reports a start date far in the future", () => {
    expect(parseDatesDetailed("Mar 2031 – Present", NOW).issues.join(" ")).toMatch(/future|read/);
  });

  it("reports a date it cannot read", () => {
    const result = parseDatesDetailed("13/2020 – 12/2021", NOW);
    expect(result.issues.join(" ")).toMatch(/Could not read the start date/);
  });

  it("finds nothing in text with no dates", () => {
    expect(parseDatesDetailed("Built a dashboard", NOW)).toMatchObject({
      startDate: "",
      endDate: "",
      current: false,
    });
  });
});

describe("findPhone", () => {
  it("accepts international and local numbers", () => {
    expect(findPhone("Call +254 706 783 609 today")?.value).toBe("+254 706 783 609");
    expect(findPhone("Tel: 0706 783 609")?.strong).toBe(false);
    expect(findPhone("(415) 555-0134")?.value).toBe("(415) 555-0134");
  });

  it("does not mistake date ranges for phone numbers", () => {
    expect(findPhone("Engineer 2018 - 2020")).toBeNull();
    expect(findPhone("Engineer 02/2022 - 11/2023")).toBeNull();
    expect(findPhone("Jan 2018 - Dec 2020")).toBeNull();
  });

  it("rejects strings that are too short, too long or repeated", () => {
    expect(findPhone("ID 1234567")).toBeNull();
    expect(findPhone("1234567890123456789")).toBeNull();
    expect(findPhone("00000000")).toBeNull();
  });

  it("prefers a number with a country code", () => {
    expect(findPhone("0706 783 609 or +254 706 783 609")?.value).toBe("+254 706 783 609");
  });
});

describe("findEmail", () => {
  it("returns the first well-formed address", () => {
    expect(findEmail("Contact: jane.doe+cv@mail.co.uk.")).toBe("jane.doe+cv@mail.co.uk");
    expect(findEmail("a@b")).toBe("");
    expect(findEmail("..bad@mail.com")).toBe("");
  });
});

describe("validUrl", () => {
  it("strips trailing punctuation", () => {
    expect(validUrl("https://github.com/jane/app).")).toBe("https://github.com/jane/app");
    expect(validUrl("(linkedin.com/in/jane),")).toBe("linkedin.com/in/jane");
  });

  it("rejects addresses that are not real links", () => {
    expect(validUrl("https://localhost")).toBe("");
    expect(validUrl("javascript:alert(1)")).toBe("");
    expect(validUrl("not a url")).toBe("");
    expect(validUrl("https://nodots")).toBe("");
  });
});

describe("splitSegments", () => {
  it("splits on the separators CVs use", () => {
    expect(splitSegments("Nairobi, Kenya | +254 700 111 222 | a@b.com")).toEqual([
      "Nairobi, Kenya",
      "+254 700 111 222",
      "a@b.com",
    ]);
    expect(splitSegments("Lisbon / +351 912 345 678 – tomas@example.com")).toEqual([
      "Lisbon",
      "+351 912 345 678",
      "tomas@example.com",
    ]);
    expect(splitSegments("Engineer • Nairobi; remote")).toEqual(["Engineer", "Nairobi", "remote"]);
  });

  it("keeps hyphenated words and slashes inside a word whole", () => {
    expect(splitSegments("Full-Stack Developer")).toEqual(["Full-Stack Developer"]);
    expect(splitSegments("CI/CD and DevOps")).toEqual(["CI/CD and DevOps"]);
  });
});

describe("isDecorationLine", () => {
  it("spots rules and ornaments, not text", () => {
    expect(isDecorationLine("________")).toBe(true);
    expect(isDecorationLine("─────")).toBe(true);
    expect(isDecorationLine("* * *")).toBe(true);
    expect(isDecorationLine("-- Skills --")).toBe(false);
    expect(isDecorationLine("--")).toBe(false);
  });
});

describe("headings", () => {
  it.each([
    ["EXPERIENCE", "experience"],
    ["Experience:", "experience"],
    ["— Education —", "education"],
    ["1. SKILLS", "skills"],
    ["## Projects", "projects"],
    ["Work Experience.", "experience"],
    ["PROFESSIONAL SUMMARY", "summary"],
    ["Licenses & Certifications", "certifications"],
    ["Technical Skills & Tools", "skills"],
    ["Languages", "languages"],
    ["Interests", "other"],
    ["References", "other"],
    ["Contact Details", "contact"],
    ["E D U C A T I O N", "education"],
    ["W O R K  E X P E R I E N C E", "experience"],
  ])("recognises %s", (line, key) => {
    expect(matchHeading(line)?.key).toBe(key);
  });

  it.each([
    "Software Engineer",
    "Built a dashboard used by 40 teams",
    "History",
    "Background",
    "Nairobi, Kenya",
  ])("does not treat %s as a heading", (line) => {
    expect(matchHeading(line)).toBeNull();
  });

  it("cleans decoration from a heading", () => {
    expect(cleanHeadingText("  *** EXPERIENCE *** ")).toBe("EXPERIENCE");
    expect(cleanHeadingText("3) Education:")).toBe("Education");
  });

  it("splits an inline heading from its text", () => {
    expect(matchInlineHeading("Skills: Java, Python")).toMatchObject({
      key: "skills",
      rest: "Java, Python",
    });
    expect(matchInlineHeading("Summary – Data analyst with four years of experience")?.key).toBe(
      "summary",
    );
  });

  it("does not take a stack label or a link for a section", () => {
    expect(matchInlineHeading("Technologies: React, Node.js")).toBeNull();
    expect(matchInlineHeading("Profile: https://github.com/jane")).toBeNull();
    expect(matchInlineHeading("Experience: five years")).toBeNull();
  });
});
