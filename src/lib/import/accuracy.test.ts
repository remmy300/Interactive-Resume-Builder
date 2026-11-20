import { describe, expect, it } from "vitest";
import { parseResumeText } from "../resume-import";
import { checkFields, summarize } from "./accuracy";
import { FIXTURES } from "./fixtures";

describe("import accuracy on the CV fixtures", () => {
  const runs = FIXTURES.flatMap((fixture) => [
    { fixture: fixture.id, text: fixture.text, expected: fixture.expected },
    ...Object.entries(fixture.variants ?? {}).map(([name, text]) => ({
      fixture: `${fixture.id} (${name})`,
      text,
      expected: fixture.expected,
    })),
  ]).map((run) => ({
    fixture: run.fixture,
    checks: checkFields(parseResumeText(run.text), run.expected),
  }));

  const report = summarize(runs);

  it("reads every field of every fixture", () => {
    // Printed so a failing run shows which fields are weak.
    if (report.failures.length > 0) {
      console.table(
        report.failures.map((item) => ({
          fixture: item.fixture,
          field: item.field,
          expected: item.expected,
          actual: item.actual,
        })),
      );
    }
    expect(report.failures).toEqual([]);
  });

  it("reports accuracy per kind of field", () => {
    console.table(
      Object.fromEntries(
        Object.entries(report.byField).map(([kind, value]) => [
          kind,
          { checked: value.total, correct: value.correct, accuracy: `${Math.round(value.accuracy * 100)}%` },
        ]),
      ),
    );
    console.log(`Overall: ${report.correct}/${report.total} (${Math.round(report.accuracy * 100)}%)`);
    expect(report.total).toBeGreaterThan(60);
    expect(report.accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it("imports the same CV the same way whichever extractor produced the text", () => {
    for (const fixture of FIXTURES.filter((item) => item.variants)) {
      const base = parseResumeText(fixture.text).data;
      for (const [name, text] of Object.entries(fixture.variants ?? {})) {
        const other = parseResumeText(text).data;
        expect(
          other.experience.map((item) => [item.company, item.role, item.startDate, item.endDate]),
          `${fixture.id} (${name}) experience`,
        ).toEqual(base.experience.map((item) => [item.company, item.role, item.startDate, item.endDate]));
        expect(other.personal, `${fixture.id} (${name}) personal`).toEqual(base.personal);
        expect(other.education.map((item) => item.college)).toEqual(base.education.map((item) => item.college));
      }
    }
  });
});
