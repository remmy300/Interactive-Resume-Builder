"use client";

import { useMemo, useState, type Dispatch } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import {
  analyzeResume,
  extractKeywords,
  matchKeywords,
  mergeSkillList,
  suggestSkillsField,
  type AtsCheck,
  type AtsGroup,
  type AtsStatus,
} from "@/lib/ats";
import type { EditorAction } from "@/lib/resume-reducer";
import type { ResumeData, Skills } from "@/lib/resume-schema";

interface AtsDialogProps {
  open: boolean;
  data: ResumeData;
  dispatch: Dispatch<EditorAction>;
  onClose: () => void;
}

type AtsTab = "checks" | "job";

const GROUPS: Array<{ id: AtsGroup; title: string }> = [
  { id: "contact", title: "Contact and identity" },
  { id: "content", title: "Content recruiters look for" },
  { id: "format", title: "Layout and readability" },
];

const STATUS: Record<
  AtsStatus,
  { icon: typeof CheckCircleIcon; color: string; label: string }
> = {
  pass: { icon: CheckCircleIcon, color: "text-emerald-600", label: "Pass" },
  warn: { icon: WarningAmberIcon, color: "text-amber-600", label: "Improve" },
  fail: { icon: CancelIcon, color: "text-red-600", label: "Fix" },
};

const SKILL_LABELS: Record<keyof Skills, string> = {
  languages: "Programming languages",
  technologies: "Frameworks and tools",
  databases: "Databases",
  spoken: "Spoken languages",
};

function scoreTone(
  score: number,
  failed = 0,
): { bar: string; text: string; label: string } {
  if (score >= 80 && failed === 0) {
    return { bar: "#15803d", text: "text-emerald-700", label: "Ready to apply" };
  }
  if (score >= 55) {
    return { bar: "#b45309", text: "text-amber-700", label: "Almost ready" };
  }
  return { bar: "#b91c1c", text: "text-red-700", label: "Needs work" };
}

function CheckRow({ check }: { check: AtsCheck }) {
  const meta = STATUS[check.status];
  const Icon = meta.icon;

  return (
    <li className="flex gap-3 py-2">
      <Icon className={`mt-0.5 shrink-0 ${meta.color}`} fontSize="small" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="text-sm font-medium text-slate-900">{check.label}</p>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{check.detail}</p>
      </div>
    </li>
  );
}

export function AtsDialog({ open, data, dispatch, onClose }: AtsDialogProps) {
  const [tab, setTab] = useState<AtsTab>("checks");
  const [jobDescription, setJobDescription] = useState("");

  const report = useMemo(() => analyzeResume(data), [data]);
  const keywords = useMemo(
    () => extractKeywords(jobDescription),
    [jobDescription],
  );
  const match = useMemo(() => matchKeywords(data, keywords), [data, keywords]);
  const tone = scoreTone(report.score, report.failed);

  const addKeywords = (terms: string[]) => {
    if (terms.length === 0) return;
    const grouped: Partial<Record<keyof Skills, string[]>> = {};
    for (const term of terms) {
      const field = suggestSkillsField(term);
      grouped[field] = [...(grouped[field] ?? []), term];
    }
    for (const [field, values] of Object.entries(grouped)) {
      if (!values?.length) continue;
      const key = field as keyof Skills;
      dispatch({
        type: "skills",
        field: key,
        value: mergeSkillList(data.skills[key], values),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="ats-title"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="ats-title" className="text-base font-semibold text-slate-900">
            ATS check
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            See how an applicant tracking system reads this resume, then tailor it
            to a job.
          </p>
        </div>
        <IconButton aria-label="Close ATS check" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <Tabs
        value={tab}
        onChange={(_event, value: AtsTab) => setTab(value)}
        aria-label="ATS tools"
        sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="checks" label="Resume check" />
        <Tab value="job" label="Match a job" />
      </Tabs>

      <DialogContent className="bg-slate-50" sx={{ p: { xs: 2, sm: 3 } }}>
        {tab === "checks" ? (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ATS readiness
                  </p>
                  <p className={`text-3xl font-bold ${tone.text}`}>
                    {report.score}
                    <span className="text-base font-semibold text-slate-500">
                      /100
                    </span>
                  </p>
                </div>
                <p className={`text-sm font-semibold ${tone.text}`}>{tone.label}</p>
              </div>
              <LinearProgress
                variant="determinate"
                value={report.score}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: "#e2e8f0",
                  "& .MuiLinearProgress-bar": { bgcolor: tone.bar },
                }}
              />
              <p className="mt-2 text-xs text-slate-600">
                {report.passed} checks pass · {report.warnings} to polish ·{" "}
                {report.failed} must fix
              </p>
            </section>

            {GROUPS.map((group) => {
              const checks = report.checks.filter(
                (check) => check.group === group.id,
              );
              if (checks.length === 0) return null;
              return (
                <section
                  key={group.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2"
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {checks.map((check) => (
                      <CheckRow key={check.id} check={check} />
                    ))}
                  </ul>
                  {group.id === "format" && data.template === "two-column" && (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2 }}
                      onClick={() => dispatch({ type: "template", value: "ats" })}
                    >
                      Switch to ATS safe template
                    </Button>
                  )}
                </section>
              );
            })}

            <p className="text-xs text-slate-500">
              Tip: the ATS safe template prints in a single column with plain black
              text, which is the safest format for online application forms.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <TextField
                label="Paste the job description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the posting here to compare its keywords with your resume."
                multiline
                minRows={7}
                fullWidth
                helperText="Nothing is uploaded. Matching happens in your browser."
                inputProps={{ maxLength: 12000 }}
              />
            </section>

            {keywords.length === 0 ? (
              <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Paste a job description above to see which keywords you already
                cover and which ones are missing.
              </section>
            ) : (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Keyword match
                      </p>
                      <p className={`text-3xl font-bold ${scoreTone(match.score).text}`}>
                        {match.score}
                        <span className="text-base font-semibold text-slate-500">
                          %
                        </span>
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {match.matched.length} of {keywords.length} keywords covered
                    </p>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={match.score}
                    sx={{
                      mt: 2,
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "#e2e8f0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: scoreTone(match.score).bar,
                      },
                    }}
                  />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Missing from your resume
                  </h3>
                  {match.missing.length === 0 ? (
                    <p className="mt-1 text-sm text-emerald-700">
                      Every keyword is already covered.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-slate-500">
                        Click a keyword to add it to the right skills group. Only add
                        terms that genuinely describe your experience.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {match.missing.map((keyword) => (
                          <Chip
                            key={keyword}
                            label={keyword}
                            size="small"
                            variant="outlined"
                            onClick={() => addKeywords([keyword])}
                          />
                        ))}
                      </div>
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ mt: 2 }}
                        onClick={() => addKeywords(match.missing)}
                      >
                        Add all missing to skills
                      </Button>
                    </>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Already covered
                  </h3>
                  {match.matched.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">
                      None yet. Add the missing keywords or rewrite your bullets to
                      mention them.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {match.matched.map((keyword) => (
                        <Chip
                          key={keyword}
                          label={keyword}
                          size="small"
                          icon={<CheckCircleIcon />}
                          sx={{
                            bgcolor: "#ecfdf5",
                            color: "#065f46",
                            "& .MuiChip-icon": { color: "#15803d" },
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <Divider />
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Skills groups updated
                  </h3>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    {(Object.keys(SKILL_LABELS) as Array<keyof Skills>).map((key) => (
                      <div key={key}>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          {SKILL_LABELS[key]}
                        </dt>
                        <dd className="text-slate-700">
                          {data.skills[key].trim() || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AtsDialog;
