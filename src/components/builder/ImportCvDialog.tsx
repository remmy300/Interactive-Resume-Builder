"use client";

import { useEffect, useRef, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { EditorSectionId } from "@/lib/editor-sections";
import type { ResumeData } from "@/lib/resume-schema";

interface ImportResponse {
  data: ResumeData;
  warnings: string[];
  stats: {
    characters: number;
    experience: number;
    education: number;
    projects: number;
    skills: number;
  };
  fileName: string;
}

interface ImportCvDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the CV is read; the editor is filled in straight away. */
  onImported: (data: ResumeData, title: string, warnings: string[]) => void;
  /** Closes the dialog and jumps to a section of the editor. */
  onGoToSection: (section: EditorSectionId) => void;
}

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 5 * 1024 * 1024;
const STEP_DELAY_MS = 320;
// How long the final "Found N sections" line stays up before the dialog closes.
const CLOSE_DELAY_MS = 900;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How many editor sections the CV filled, and how many entries they hold. */
function summarise(data: ResumeData): { sections: number; entries: number } {
  const skills = Object.values(data.skills).reduce(
    (count, value) => count + value.split(",").filter((item) => item.trim()).length,
    0,
  );
  const counts = [
    Object.values(data.personal).filter((value) => value.trim()).length,
    data.summary.trim() ? 1 : 0,
    data.experience.length,
    data.projects.length,
    data.education.length,
    skills,
    data.certifications.length,
  ];
  return {
    sections: counts.filter((count) => count > 0).length,
    entries: counts.reduce((sum, count) => sum + count, 0),
  };
}

type Stage = 0 | 1 | 2 | 3 | 4;

function Step({
  label,
  detail,
  state,
}: {
  label: string;
  detail: string;
  state: "waiting" | "active" | "done";
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center">
        {state === "done" ? (
          <CheckCircleIcon className="text-emerald-600" fontSize="small" />
        ) : state === "active" ? (
          <CircularProgress size={18} thickness={5} />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        )}
      </span>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium ${
            state === "waiting" ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {label}
        </p>
        {state === "done" && <p className="text-xs text-slate-500">{detail}</p>}
      </div>
    </li>
  );
}

export function ImportCvDialog({
  open,
  onClose,
  onImported,
  onGoToSection,
}: ImportCvDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [stage, setStage] = useState<Stage>(0);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Uploads and reads the file as soon as it is chosen, then closes itself. */
  const importFile = async (file: File | null) => {
    if (!file || isRunning) return;
    setResult(null);
    setStage(0);
    setError("");
    if (file.size > MAX_BYTES) {
      setError("That file is larger than 5 MB.");
      return;
    }

    setFileName(file.name);
    setIsRunning(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as
        | (ImportResponse & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "We could not read that file.");
      }
      if (!mountedRef.current) return;

      setResult(payload);
      // The server answers in one go; reveal the stages one by one so it is
      // clear what was found before the editor is filled in.
      for (const next of [1, 2, 3, 4] as const) {
        setStage(next);
        await wait(STEP_DELAY_MS);
        if (!mountedRef.current) return;
      }

      const baseName = payload.fileName.replace(/\.[^.]+$/, "");
      const title = payload.data.personal.name
        ? `${payload.data.personal.name} — CV`
        : `${baseName} — Imported`;
      onImported(payload.data, title, payload.warnings);
      await wait(CLOSE_DELAY_MS);
      if (!mountedRef.current) return;
      // Extraction is done and the editor is filled: hand the screen back.
      onGoToSection("personal");
    } catch (importError) {
      if (!mountedRef.current) return;
      setFileName("");
      setError(
        importError instanceof Error
          ? importError.message
          : "We could not read that file.",
      );
    } finally {
      if (mountedRef.current) setIsRunning(false);
    }
  };

  const summary = result ? summarise(result.data) : { sections: 0, entries: 0 };
  const showProgress = Boolean(fileName) && !error;
  const stepState = (step: 1 | 2 | 3): "waiting" | "active" | "done" =>
    stage >= step ? "done" : stage === step - 1 && isRunning ? "active" : "waiting";

  return (
    <Dialog
      open={open}
      onClose={isRunning ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Import an existing CV</DialogTitle>
      <DialogContent>
        {!showProgress ? (
          <>
            <p className="text-sm text-slate-600">
              Choose a PDF, DOCX, TXT, or Markdown file. It is read as soon as you
              select it and fills in your resume for you to review.
            </p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void importFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragging ? "border-slate-900 bg-slate-50" : "border-slate-300"
              }`}
            >
              <UploadFileIcon className="text-slate-500" />
              <p className="mt-2 text-sm text-slate-700">
                Drag a CV here, or choose a file
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PDF, DOCX, TXT, MD · up to 5 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  void importFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </Button>
            </div>

            {error && (
              <Alert severity="error" icon={<ErrorOutlineIcon />} className="mt-3">
                {error}
              </Alert>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Importing replaces the current draft. Saved resumes are not changed
              until you press Save.
            </p>
          </>
        ) : (
          <div>
            <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>

            <ul className="mt-2 divide-y divide-slate-100">
              <Step label="Reading the file" detail="File read" state={stepState(1)} />
              <Step
                label="Finding sections"
                detail={`${summary.sections} sections`}
                state={stepState(2)}
              />
              <Step
                label="Filling in entries"
                detail={`${summary.entries} entries`}
                state={stepState(3)}
              />
            </ul>

            {stage === 4 && (
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Found {summary.sections} sections and {summary.entries} entries.
              </p>
            )}
          </div>
        )}
      </DialogContent>
      {!showProgress && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default ImportCvDialog;
