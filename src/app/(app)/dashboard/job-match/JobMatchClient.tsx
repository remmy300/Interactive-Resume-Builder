"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import {
  addSkillsToResume,
  applyBulletChanges,
  suggestBulletImprovements,
  type BulletChange,
} from "@/lib/career";
import {
  extractKeywords,
  matchKeywords,
} from "@/lib/ats";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import type { ResumeData } from "@/lib/resume-schema";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";
import { useResumeLibrary, type LibraryRecord } from "@/hooks/useResumeLibrary";

interface Notice {
  severity: "success" | "warning" | "error" | "info";
  message: string;
}

export function JobMatchClient() {
  const library = useResumeLibrary();
  const [jobDescription, setJobDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [review, setReview] = useState<"skills" | "bullets" | null>(null);

  const data = library.record?.data ?? null;
  const keywords = useMemo(() => extractKeywords(jobDescription), [jobDescription]);
  const match = useMemo(
    () => (data ? matchKeywords(data, keywords) : { matched: [], missing: [], score: 0 }),
    [data, keywords],
  );
  const suggestions = useMemo(
    () => (data ? suggestBulletImprovements(data, keywords) : []),
    [data, keywords],
  );

  const save = async (next: ResumeData, message: string) => {
    const record = library.record;
    if (!record) return;
    setIsSaving(true);
    try {
      const updated = await apiFetch<LibraryRecord>(`/api/resumes/${record.id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title: record.title,
          data: next,
          updatedAt: record.updatedAt,
        }),
      });
      library.setRecord(updated);
      setNotice({ severity: "success", message });
      setSelectedSkills([]);
      setSelectedSuggestions([]);
      setEdits({});
    } catch (error) {
      setNotice({
        severity: "error",
        message:
          error instanceof Error ? error.message : "Could not save your changes.",
      });
    } finally {
      setIsSaving(false);
      setReview(null);
    }
  };

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const confirmSkills = () => {
    if (!data || selectedSkills.length === 0) return;
    void save(
      addSkillsToResume(data, selectedSkills),
      `${selectedSkills.length} skill${selectedSkills.length === 1 ? "" : "s"} added. Review the resume before exporting.`,
    );
  };

  const confirmBullets = () => {
    if (!data || selectedSuggestions.length === 0) return;
    const changes: BulletChange[] = suggestions
      .filter((suggestion) => selectedSuggestions.includes(suggestion.id))
      .map((suggestion) => ({
        entryId: suggestion.entryId,
        original: suggestion.original,
        suggested: (edits[suggestion.id] ?? suggestion.suggested).trim(),
      }))
      .filter((change) => change.suggested && change.suggested !== change.original);
    if (changes.length === 0) {
      setReview(null);
      setNotice({
        severity: "info",
        message: "No selected bullet was changed. Edit a suggestion first.",
      });
      return;
    }
    void save(
      applyBulletChanges(data, changes),
      `${changes.length} bullet${changes.length === 1 ? "" : "s"} updated.`,
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Job match"
        description="Paste a job description to see missing keywords and improve your bullets. Nothing is applied until you review and confirm it."
        actions={
          <Link
            href="/dashboard/resume"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open builder
          </Link>
        }
      />

      {notice && (
        <Alert
          severity={notice.severity}
          className="mb-4"
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {library.error && (
        <Alert severity="error" className="mb-4">
          {library.error}
        </Alert>
      )}

      {library.isLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : library.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">No resume to match</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create or import a CV first, then come back with a job description.
          </p>
          <Link
            href="/dashboard/resume"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to the builder
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[280px_1fr]">
            <div>
              <ResumeSelect
                items={library.items}
                value={library.selectedId}
                onChange={library.setSelectedId}
                disabled={library.isLoadingRecord}
              />
              <p className="mt-2 text-xs text-slate-500">
                Suggestions are based on this resume only.
              </p>
            </div>
            <TextField
              label="Job description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting here…"
              multiline
              minRows={5}
              fullWidth
              helperText="Processed in your browser. Nothing is uploaded."
              inputProps={{ maxLength: 12000 }}
            />
          </section>

          {library.isLoadingRecord && <LinearProgress sx={{ borderRadius: 1 }} />}

          {data && keywords.length === 0 && (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              Paste a job description above to see the match score, missing skills, and
              bullet suggestions.
            </section>
          )}

          {data && keywords.length > 0 && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Keyword match
                    </p>
                    <p className="mt-1 text-4xl font-bold text-slate-900">
                      {match.score}
                      <span className="text-lg font-semibold text-slate-500">%</span>
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {match.matched.length} of {keywords.length} keywords covered
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${match.score}%` }}
                  />
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Missing skills
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select only the skills you genuinely have. Click review before
                    anything changes.
                  </p>
                  {match.missing.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">
                      Every keyword is already covered.
                    </p>
                  ) : (
                    <>
                      <ul className="mt-3 space-y-1">
                        {match.missing.map((skill) => (
                          <li
                            key={skill}
                            className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"
                          >
                            <Checkbox
                              size="small"
                              checked={selectedSkills.includes(skill)}
                              onChange={() =>
                                setSelectedSkills((current) => toggle(current, skill))
                              }
                              inputProps={{ "aria-label": `Add ${skill}` }}
                            />
                            <span className="text-sm text-slate-800">{skill}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ mt: 2 }}
                        disabled={selectedSkills.length === 0 || isSaving}
                        onClick={() => setReview("skills")}
                      >
                        Review selected skills ({selectedSkills.length})
                      </Button>
                    </>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Already covered
                  </h2>
                  {match.matched.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      No keywords matched yet. Rewrite bullets or add relevant skills.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.matched.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          sx={{ bgcolor: "#ecfdf5", color: "#065f46" }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Bullet improvements
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Rewrites use your own wording. Add real metrics where prompted, and
                  edit any suggestion before applying it.
                </p>

                {suggestions.length === 0 ? (
                  <p className="mt-3 text-sm text-emerald-700">
                    Your bullets already start with strong verbs and include metrics.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            size="small"
                            checked={selectedSuggestions.includes(suggestion.id)}
                            onChange={() =>
                              setSelectedSuggestions((current) =>
                                toggle(current, suggestion.id),
                              )
                            }
                            inputProps={{
                              "aria-label": `Apply suggestion for ${suggestion.entryLabel}`,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {suggestion.entryLabel}
                            </p>
                            <p className="mt-1 text-sm text-slate-500 line-through">
                              {suggestion.original}
                            </p>
                            <TextField
                              value={edits[suggestion.id] ?? suggestion.suggested}
                              onChange={(event) =>
                                setEdits((current) => ({
                                  ...current,
                                  [suggestion.id]: event.target.value,
                                }))
                              }
                              multiline
                              minRows={2}
                              fullWidth
                              size="small"
                              sx={{ mt: 1.5 }}
                              inputProps={{
                                maxLength: 500,
                                "aria-label": "Suggested bullet text",
                              }}
                            />
                            <ul className="mt-1.5 list-disc pl-4 text-xs text-slate-600">
                              {suggestion.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                            {suggestion.missingKeywords.length > 0 && (
                              <p className="mt-1.5 text-xs text-slate-500">
                                If you used them in this role, consider mentioning:{" "}
                                <span className="font-medium text-slate-700">
                                  {suggestion.missingKeywords.join(", ")}
                                </span>
                                .
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="contained"
                      size="small"
                      disabled={selectedSuggestions.length === 0 || isSaving}
                      onClick={() => setReview("bullets")}
                    >
                      Review bullet changes ({selectedSuggestions.length})
                    </Button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={review === "skills"}
        title="Add these skills?"
        description={
          <div>
            <p>These will be added to your skills section:</p>
            <ul className="mt-2 list-disc pl-5">
              {selectedSkills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-slate-600">
              Only continue if these accurately describe your experience.
            </p>
          </div>
        }
        confirmLabel="Add skills"
        busy={isSaving}
        onCancel={() => setReview(null)}
        onConfirm={confirmSkills}
      />

      <ConfirmDialog
        open={review === "bullets"}
        title="Apply bullet changes?"
        description={`${selectedSuggestions.length} bullet${selectedSuggestions.length === 1 ? "" : "s"} will be replaced in your saved resume. You can edit them again in the builder afterwards.`}
        confirmLabel="Apply changes"
        busy={isSaving}
        onCancel={() => setReview(null)}
        onConfirm={confirmBullets}
      />
    </div>
  );
}

export default JobMatchClient;
