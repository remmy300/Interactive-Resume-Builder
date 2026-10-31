"use client";

import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import {
  COVER_LETTER_TONES,
  generateCoverLetter,
  type CoverLetterRecord,
  type CoverLetterTone,
} from "@/lib/career";
import { apiFetch, JSON_HEADERS } from "@/lib/client-api";
import ConfirmDialog from "@/components/builder/ConfirmDialog";
import PageHeader from "@/components/dashboard/PageHeader";
import ResumeSelect from "@/components/dashboard/ResumeSelect";
import { useResumeLibrary } from "@/hooks/useResumeLibrary";

interface FormState {
  title: string;
  company: string;
  role: string;
  content: string;
  manager: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  company: "",
  role: "",
  content: "",
  manager: "",
};

interface ListResponse {
  items: CoverLetterRecord[];
}

export function CoverLettersClient() {
  const library = useResumeLibrary();
  const [letters, setLetters] = useState<CoverLetterRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ severity: "success" | "error" | "info"; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ListResponse>("/api/cover-letters")
      .then((result) => {
        if (!cancelled) setLetters(result.items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({
          severity: "error",
          message:
            error instanceof Error ? error.message : "Could not load cover letters.",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectLetter = (letter: CoverLetterRecord) => {
    setSelectedId(letter.id);
    setForm({
      title: letter.title,
      company: letter.company,
      role: letter.role,
      content: letter.content,
      manager: "",
    });
    setNotice(null);
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setJobDescription("");
    setTone("professional");
    setNotice(null);
  };

  const update = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));

  const generate = () => {
    if (!library.record) {
      setNotice({
        severity: "info",
        message: "Select a resume below to generate a draft from your real experience.",
      });
      return;
    }
    if (!form.company.trim() || !form.role.trim()) {
      setNotice({
        severity: "info",
        message: "Add the company and role so the draft can be specific.",
      });
      return;
    }
    const content = generateCoverLetter({
      resume: library.record.data,
      company: form.company,
      role: form.role,
      manager: form.manager,
      jobDescription,
      tone,
    });
    setForm((current) => ({
      ...current,
      content,
      title:
        current.title.trim() ||
        `${current.role.trim() || "Role"} at ${current.company.trim() || "Company"}`,
    }));
    setNotice({
      severity: "success",
      message: "Draft generated. Review and edit it before saving.",
    });
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setNotice({
        severity: "info",
        message: "Add a title and some content before saving.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const body = JSON.stringify({
        title: form.title,
        company: form.company,
        role: form.role,
        content: form.content,
      });
      const saved = selectedId
        ? await apiFetch<CoverLetterRecord>(`/api/cover-letters/${selectedId}`, {
            method: "PATCH",
            headers: JSON_HEADERS,
            body,
          })
        : await apiFetch<CoverLetterRecord>("/api/cover-letters", {
            method: "POST",
            headers: JSON_HEADERS,
            body,
          });
      setSelectedId(saved.id);
      setLetters((current) => [
        saved,
        ...current.filter((letter) => letter.id !== saved.id),
      ]);
      setNotice({ severity: "success", message: "Cover letter saved." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not save the letter.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await apiFetch<void>(`/api/cover-letters/${selectedId}`, { method: "DELETE" });
      setLetters((current) => current.filter((letter) => letter.id !== selectedId));
      startNew();
      setNotice({ severity: "success", message: "Cover letter deleted." });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete the letter.",
      });
    } finally {
      setIsSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Cover letters"
        description="Generate a first draft from your resume, then edit and save it. You choose when to save."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={startNew}>
            New letter
          </Button>
        }
      />

      {notice && (
        <Alert severity={notice.severity} className="mb-4" onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Saved letters
          </p>
          {isLoading ? (
            <LinearProgress />
          ) : letters.length === 0 ? (
            <p className="px-1 py-4 text-sm text-slate-500">
              No letters yet. Start a new one.
            </p>
          ) : (
            <ul className="space-y-1">
              {letters.map((letter) => (
                <li key={letter.id}>
                  <button
                    type="button"
                    onClick={() => selectLetter(letter)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                      letter.id === selectedId
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block truncate font-medium">{letter.title}</span>
                    <span
                      className={`block truncate text-xs ${
                        letter.id === selectedId ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {[letter.role, letter.company].filter(Boolean).join(" · ") ||
                        "No company yet"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Title"
                value={form.title}
                onChange={(event) => update({ title: event.target.value })}
                inputProps={{ maxLength: 120 }}
              />
              <TextField
                label="Company"
                value={form.company}
                onChange={(event) => update({ company: event.target.value })}
                inputProps={{ maxLength: 120 }}
              />
              <TextField
                label="Role"
                value={form.role}
                onChange={(event) => update({ role: event.target.value })}
                inputProps={{ maxLength: 120 }}
              />
              <TextField
                label="Hiring manager (optional)"
                value={form.manager}
                onChange={(event) => update({ manager: event.target.value })}
                inputProps={{ maxLength: 120 }}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ResumeSelect
                items={library.items}
                value={library.selectedId}
                onChange={library.setSelectedId}
                disabled={library.isLoading}
                label="Use experience from"
              />
              <FormControl fullWidth size="small">
                <InputLabel id="cover-tone-label">Tone</InputLabel>
                <Select
                  labelId="cover-tone-label"
                  label="Tone"
                  value={tone}
                  onChange={(event) => setTone(event.target.value as CoverLetterTone)}
                >
                  {COVER_LETTER_TONES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <TextField
              label="Job description (optional)"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the posting so the draft references the right skills."
              multiline
              minRows={3}
              fullWidth
              sx={{ mt: 3 }}
              inputProps={{ maxLength: 12000 }}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outlined" onClick={generate} disabled={!library.record}>
                Generate draft
              </Button>
              <Button variant="contained" onClick={() => void save()} disabled={isSaving}>
                {isSaving ? "Saving…" : selectedId ? "Save changes" : "Save letter"}
              </Button>
              {selectedId && (
                <Button
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSaving}
                >
                  Delete
                </Button>
              )}
            </div>
            {!library.record && !library.isLoading && (
              <p className="mt-2 text-xs text-slate-500">
                No resume found. Create one in the builder to generate a draft, or write
                the letter manually.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <TextField
              label="Letter"
              value={form.content}
              onChange={(event) => update({ content: event.target.value })}
              multiline
              minRows={14}
              fullWidth
              placeholder="Write or generate your cover letter here…"
              helperText={`${form.content.trim().split(/\s+/).filter(Boolean).length} words`}
              inputProps={{ maxLength: 20000 }}
            />
            <p className="mt-2 text-xs text-slate-500">
              Review every generated sentence. Remove anything you cannot support with a
              real example.
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this cover letter?"
        description="This permanently removes the saved letter."
        confirmLabel="Delete"
        confirmColor="error"
        busy={isSaving}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

export default CoverLettersClient;
