import type { AtsReport } from "@/lib/ats";

/** The exact resume lines or items that caused a check to flag. */
export function CheckExamples({ examples }: { examples?: string[] }) {
  if (!examples || examples.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {examples.map((example) => (
        <li
          key={example}
          className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700"
        >
          {example}
        </li>
      ))}
    </ul>
  );
}

/** Explains why the score is lower than the raw check results suggest. */
export function ScoreCaps({ report }: { report: AtsReport }) {
  if (report.caps.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-semibold">
        Score held at {report.score} (checks alone would give {report.rawScore})
      </p>
      <ul className="mt-1 list-disc pl-4">
        {report.caps.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

export const SCORE_NOTE =
  "This is Resume Studio's own resume-content estimate, not an employer ATS ranking. It evaluates the saved resume data; PDF/DOCX parsing and reading-order compatibility are not yet verified.";
