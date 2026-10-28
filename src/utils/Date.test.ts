import { describe, expect, it } from "vitest";
import { formatMonth, formatRange } from "./Date";

describe("formatMonth", () => {
  it("formats a stored YYYY-MM value", () => {
    expect(formatMonth("2024-01")).toBe("Jan 2024");
    expect(formatMonth("2024-12")).toBe("Dec 2024");
  });

  it("handles legacy YYYY-MM-DD values without a timezone shift", () => {
    expect(formatMonth("2024-01-01")).toBe("Jan 2024");
    expect(formatMonth("2023-08-31")).toBe("Aug 2023");
  });

  it("returns empty text for empty input", () => {
    expect(formatMonth("")).toBe("");
    expect(formatMonth("   ")).toBe("");
  });

  it("passes through unrecognised values instead of inventing a date", () => {
    expect(formatMonth("Spring 2022")).toBe("Spring 2022");
    expect(formatMonth("2024-19")).toBe("2024");
  });
});

describe("formatRange", () => {
  it("shows Present for a current role", () => {
    expect(formatRange("2023-05", "", true)).toBe("May 2023 – Present");
  });

  it("renders a closed range", () => {
    expect(formatRange("2021-01", "2023-06")).toBe("Jan 2021 – Jun 2023");
  });

  it("degrades gracefully with only one date", () => {
    expect(formatRange("2021-01", "")).toBe("Jan 2021");
    expect(formatRange("", "2023-06")).toBe("Jun 2023");
    expect(formatRange("", "", false)).toBe("");
  });
});
