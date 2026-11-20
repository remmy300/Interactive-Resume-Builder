import type { ImportResult } from "../resume-import";
import type { Expected } from "./fixtures";

export interface FieldCheck {
  field: string;
  ok: boolean;
  expected: string;
  actual: string;
}

const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Compares an import result with what a person would expect, one field at a
 * time. Only fields named in `expected` are checked, so a fixture states exactly
 * what it promises.
 */
export function checkFields(result: ImportResult, expected: Expected): FieldCheck[] {
  const checks: FieldCheck[] = [];
  const { data } = result;
  const same = (field: string, want: string | undefined, got: string) => {
    if (want === undefined) return;
    checks.push({ field, ok: norm(want) === norm(got), expected: want, actual: got });
  };

  same("personal.name", expected.name, data.personal.name);
  same("personal.title", expected.title, data.personal.title);
  same("personal.email", expected.email, data.personal.email);
  same("personal.phone", expected.phone, data.personal.phone);
  same("personal.location", expected.location, data.personal.location);

  if (expected.summaryStart !== undefined) {
    checks.push({
      field: "summary",
      ok: norm(data.summary).startsWith(norm(expected.summaryStart)),
      expected: expected.summaryStart,
      actual: data.summary.slice(0, 80),
    });
  }

  if (expected.experience) {
    same("experience.count", String(expected.experience.length), String(data.experience.length));
    expected.experience.forEach((want, index) => {
      const got = data.experience[index];
      same(`experience.${index}.company`, want.company, got?.company ?? "");
      same(`experience.${index}.role`, want.role, got?.role ?? "");
      same(`experience.${index}.startDate`, want.startDate, got?.startDate ?? "");
      same(`experience.${index}.endDate`, want.endDate, got?.endDate ?? "");
      if (want.current !== undefined) {
        same(`experience.${index}.current`, String(want.current), String(got?.current ?? false));
      }
    });
  }

  if (expected.education) {
    same("education.count", String(expected.education.length), String(data.education.length));
    expected.education.forEach((want, index) => {
      const got = data.education[index];
      same(`education.${index}.college`, want.college, got?.college ?? "");
      same(`education.${index}.degree`, want.degree, got?.degree ?? "");
    });
  }

  const includes = (field: string, wanted: string[] | undefined, haystack: string) => {
    for (const item of wanted ?? []) {
      checks.push({
        field: `${field}.${item}`,
        ok: norm(haystack).includes(norm(item)),
        expected: item,
        actual: haystack.slice(0, 80),
      });
    }
  };
  includes("skills", expected.skills, Object.values(data.skills).join(", "));
  includes("spoken", expected.spoken, data.skills.spoken);
  includes("certifications", expected.certifications, data.certifications.map((item) => item.name).join(" | "));
  includes("projects", expected.projects, data.projects.map((item) => item.title).join(" | "));

  return checks;
}

export interface AccuracyReport {
  total: number;
  correct: number;
  accuracy: number;
  /** Accuracy per kind of field, e.g. "experience.company". */
  byField: Record<string, { total: number; correct: number; accuracy: number }>;
  failures: Array<FieldCheck & { fixture: string }>;
}

/** "experience.2.company" -> "experience.company"; "skills.React" -> "skills". */
const kindOf = (field: string) =>
  field
    .replace(/\.\d+\./, ".")
    .replace(/^(skills|spoken|certifications|projects)\..+$/, "$1");

export function summarize(
  runs: Array<{ fixture: string; checks: FieldCheck[] }>,
): AccuracyReport {
  const byField: AccuracyReport["byField"] = {};
  const failures: AccuracyReport["failures"] = [];
  let total = 0;
  let correct = 0;

  for (const run of runs) {
    for (const check of run.checks) {
      total += 1;
      const kind = kindOf(check.field);
      const bucket = (byField[kind] ??= { total: 0, correct: 0, accuracy: 0 });
      bucket.total += 1;
      if (check.ok) {
        correct += 1;
        bucket.correct += 1;
      } else {
        failures.push({ ...check, fixture: run.fixture });
      }
    }
  }
  for (const bucket of Object.values(byField)) {
    bucket.accuracy = bucket.total ? bucket.correct / bucket.total : 1;
  }
  return { total, correct, accuracy: total ? correct / total : 1, byField, failures };
}
