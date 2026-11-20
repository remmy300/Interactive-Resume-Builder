import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import type {
  AnswerEvaluation,
  CriterionStatus,
} from "@/lib/interview/evaluation-types";

const STATUS: Record<
  CriterionStatus,
  { label: string; className: string; Icon: typeof CheckCircleIcon }
> = {
  strong: {
    label: "Covered",
    className: "text-emerald-600",
    Icon: CheckCircleIcon,
  },
  partial: {
    label: "Partly covered",
    className: "text-amber-600",
    Icon: RemoveCircleOutlineIcon,
  },
  missing: {
    label: "Missing",
    className: "text-red-600",
    Icon: ErrorOutlineIcon,
  },
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

const FRAMEWORK_LABELS: Record<AnswerEvaluation["framework"], string> = {
  STAR: "STAR (situation, task, action, result)",
  TECHNICAL_REASONING: "Technical reasoning",
  ROLE_RELEVANCE: "Role relevance",
  COMPANY_ALIGNMENT: "Company alignment",
};

interface AnswerReviewProps {
  evaluation: AnswerEvaluation;
  isStale: boolean;
}

/** Shows how an answer scored against its rubric and which resume items back it up. */
export default function AnswerReview({
  evaluation,
  isStale,
}: AnswerReviewProps) {
  const direct = evaluation.resumeEvidence?.directMatches ?? [];
  const weak = evaluation.resumeEvidence?.weakMatches ?? [];

  return (
    <section
      aria-label="Answer review"
      className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Answer review
          </p>
          <p className="text-xs text-slate-500">
            Checked against {FRAMEWORK_LABELS[evaluation.framework]} ·{" "}
            {evaluation.answerWordCount} words
          </p>
        </div>
        <p className={`text-3xl font-bold ${scoreTone(evaluation.score)}`}>
          {evaluation.score}
          <span className="text-base font-semibold text-slate-500">/100</span>
        </p>
      </div>

      {isStale && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
          You changed the answer after this review. Review it again to update
          the score.
        </p>
      )}

      <p className="mt-2 text-sm text-slate-700">
        {evaluation.overallFeedback}
      </p>

      <ul className="mt-3 space-y-2">
        {evaluation.criteria.map((criterion) => {
          const meta = STATUS[criterion.status];
          return (
            <li key={criterion.id} className="flex gap-2">
              <meta.Icon
                className={`mt-0.5 shrink-0 ${meta.className}`}
                fontSize="small"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {criterion.name}{" "}
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </p>
                <p className="text-sm text-slate-600">{criterion.feedback}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {evaluation.resumeEvidence && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-sm font-semibold text-slate-900">
            Backed up by your resume
          </p>
          {direct.length === 0 && weak.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              Nothing in your resume clearly matches this answer. Use a real
              example from your experience or projects so the interviewer can
              verify it.
            </p>
          ) : (
            <ul className="mt-1 space-y-1">
              {[...direct, ...weak].slice(0, 5).map((match) => (
                <li key={match.evidenceId} className="text-sm text-slate-700">
                  <span className="font-medium">{match.title}</span>{" "}
                  <span className="text-xs text-slate-500">
                    (
                    {match.strength === "direct"
                      ? "strong match"
                      : "partial match"}
                    : {match.matchedTerms.slice(0, 5).join(", ")})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        This is a checklist review of structure and detail, not a judgement of
        whether the answer is true or what an interviewer will think.
      </p>
    </section>
  );
}
