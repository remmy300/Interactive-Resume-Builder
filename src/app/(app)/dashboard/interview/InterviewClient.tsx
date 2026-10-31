"use client";

import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  INTERVIEW_CATEGORIES,
  buildInterviewQuestions,
  type InterviewCategory,
  type InterviewNoteRecord,
} from "@/lib/career";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";
import { useResumeLibrary } from "@/hooks/useResumeLibrary";

interface ListResponse {
  items: InterviewNoteRecord[];
}

const CATEGORY_LABELS: Record<InterviewCategory, string> = {
  behavioral: "Behavioural",
  technical: "Technical",
  role: "Role-specific",
  company: "Company",
};

export function InterviewClient() {
  const library = useResumeLibrary();
  const [notes, setNotes] = useState<InterviewNoteRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [company, setCompany] = useState("");
  const [filter, setFilter] = useState<InterviewCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ severity: "success" | "error" | "info"; message: string } | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customCategory, setCustomCategory] = useState<InterviewCategory>("behavioral");
  const [pendingDelete, setPendingDelete] = useState<InterviewNoteRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListResponse>("/api/interview-notes")
      .then((result) => {
        if (cancelled) return;
        setNotes(result.items);
        setAnswers(
          Object.fromEntries(result.items.map((note) => [note.id, note.answer])),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({
          severity: "error",
          message:
            error instanceof Error ? error.message : "Could not load interview notes.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!library.record) return [];
    const existing = new Set(notes.map((note) => note.question.trim().toLowerCase()));
    return buildInterviewQuestions(library.record.data, company).filter(
      (item) => !existing.has(item.question.trim().toLowerCase()),
    );
  }, [library.record, notes, company]);

  const addQuestion = async (question: string, category: InterviewCategory) => {
    if (!question.trim()) return;
    setIsSaving(true);
    try {
      const saved = await apiFetch<InterviewNoteRecord>("/api/interview-notes", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ question: question.trim(), category, answer: "" }),
      });
      setNotes((current) => [saved, ...current]);
      setAnswers((current) => ({ ...current, [saved.id]: saved.answer }));
      setNotice({ severity: "success", message: "Question added." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not add the question.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAnswer = async (note: InterviewNoteRecord) => {
    setIsSaving(true);
    try {
      const saved = await apiFetch<InterviewNoteRecord>(
        `/api/interview-notes/${note.id}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ answer: answers[note.id] ?? "" }),
        },
      );
      setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setNotice({ severity: "success", message: "Answer saved." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not save the answer.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setIsSaving(true);
    try {
      await apiFetch<void>(`/api/interview-notes/${pendingDelete.id}`, {
        method: "DELETE",
      });
      setNotes((current) => current.filter((item) => item.id !== pendingDelete.id));
      setNotice({ severity: "success", message: "Question removed." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not remove the question.",
      });
    } finally {
      setIsSaving(false);
      setPendingDelete(null);
    }
  };

  const visible = filter === "all" ? notes : notes.filter((note) => note.category === filter);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Interview prep"
        description="Practise with questions grounded in your resume, and keep your best answers in one place."
      />

      {notice && (
        <Alert severity={notice.severity} className="mb-4" onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ResumeSelect
            items={library.items}
            value={library.selectedId}
            onChange={library.setSelectedId}
            disabled={library.isLoading}
            label="Questions based on"
          />
          <TextField
            label="Company (optional)"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            inputProps={{ maxLength: 120 }}
            helperText="Adds company-specific questions."
          />
        </div>

        {library.record ? (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-900">Suggested questions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add the ones you want to practise. Nothing is added automatically.
            </p>
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
              {suggestions.slice(0, 12).map((suggestion) => (
                <li
                  key={suggestion.question}
                  className="flex items-start justify-between gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm text-slate-800">{suggestion.question}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {CATEGORY_LABELS[suggestion.category]}
                    </p>
                  </div>
                  <Button
                    size="small"
                    onClick={() => void addQuestion(suggestion.question, suggestion.category)}
                    disabled={isSaving}
                  >
                    Add
                  </Button>
                </li>
              ))}
              {suggestions.length === 0 && (
                <li className="px-1 py-2 text-sm text-slate-500">
                  All suggested questions have been added.
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Create a resume to get personalised question suggestions.
          </p>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4">
          <h2 className="text-sm font-semibold text-slate-900">Add your own question</h2>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <TextField
              label="Question"
              value={customQuestion}
              onChange={(event) => setCustomQuestion(event.target.value)}
              fullWidth
              inputProps={{ maxLength: 500 }}
            />
            <TextField
              select
              label="Category"
              value={customCategory}
              onChange={(event) =>
                setCustomCategory(event.target.value as InterviewCategory)
              }
              sx={{ minWidth: 170 }}
            >
              {INTERVIEW_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                void addQuestion(customQuestion, customCategory);
                setCustomQuestion("");
              }}
              disabled={isSaving || !customQuestion.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="small"
          variant={filter === "all" ? "contained" : "outlined"}
          onClick={() => setFilter("all")}
        >
          All ({notes.length})
        </Button>
        {INTERVIEW_CATEGORIES.map((category) => (
          <Button
            key={category}
            size="small"
            variant={filter === category ? "contained" : "outlined"}
            onClick={() => setFilter(category)}
          >
            {CATEGORY_LABELS[category]} (
            {notes.filter((note) => note.category === category).length})
          </Button>
        ))}
      </div>

      <section className="mt-3 space-y-3">
        {isLoading ? (
          <LinearProgress />
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No questions yet. Add a suggestion or write your own.
          </div>
        ) : (
          visible.map((note) => (
            <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{note.question}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABELS[note.category]}
                  </p>
                </div>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setPendingDelete(note)}
                >
                  Remove
                </Button>
              </div>
              <TextField
                value={answers[note.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [note.id]: event.target.value }))
                }
                placeholder="Write your answer using a real example: situation, action, result."
                multiline
                minRows={4}
                fullWidth
                sx={{ mt: 2 }}
                inputProps={{ maxLength: 10000 }}
                helperText={`${(answers[note.id] ?? "").trim().split(/\s+/).filter(Boolean).length} words`}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => void saveAnswer(note)}
                  disabled={isSaving}
                >
                  Save answer
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this question?"
        description={pendingDelete?.question ?? ""}
        confirmLabel="Remove"
        confirmColor="error"
        busy={isSaving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

export default InterviewClient;
