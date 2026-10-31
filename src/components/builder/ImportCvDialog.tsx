"use client";

import { useRef, useState } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
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
  onImported: (data: ResumeData, title: string) => void;
}

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 5 * 1024 * 1024;

export function ImportCvDialog({ open, onClose, onImported }: ImportCvDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const chooseFile = (next: File | null) => {
    setResult(null);
    setError("");
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("That file is larger than 5 MB.");
      return;
    }
    setFile(next);
  };

  const parse = async () => {
    if (!file) return;
    setIsParsing(true);
    setError("");
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
      setResult(payload);
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "We could not read that file.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  const confirmImport = () => {
    if (!result) return;
    const baseName = result.fileName.replace(/\.[^.]+$/, "");
    const title = result.data.personal.name
      ? `${result.data.personal.name} — CV`
      : `${baseName} — Imported`;
    onImported(result.data, title);
  };

  return (
    <Dialog open={open} onClose={isParsing ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import an existing CV</DialogTitle>
      <DialogContent>
        <p className="text-sm text-slate-600">
          Upload a PDF, DOCX, TXT, or Markdown file. We extract the text and map it
          into sections for you to review. Nothing is saved until you import and save.
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
            chooseFile(event.dataTransfer.files?.[0] ?? null);
          }}
          className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragging ? "border-slate-900 bg-slate-50" : "border-slate-300"
          }`}
        >
          <UploadFileIcon className="text-slate-500" />
          <p className="mt-2 text-sm text-slate-700">
            {file ? file.name : "Drag a CV here, or choose a file"}
          </p>
          <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, MD · up to 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <div className="mt-3 flex justify-center gap-2">
            <Button variant="outlined" size="small" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => void parse()}
              disabled={!file || isParsing}
            >
              {isParsing ? "Reading…" : "Extract CV"}
            </Button>
          </div>
        </div>

        {isParsing && <LinearProgress sx={{ mt: 3 }} />}

        {error && (
          <Alert severity="error" className="mt-3">
            {error}
          </Alert>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                {result.data.personal.name || "No name detected"}
              </p>
              <p className="text-sm text-slate-600">
                {result.data.personal.title || "No professional title detected"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {result.stats.experience} roles · {result.stats.education} education ·{" "}
                {result.stats.projects} projects · {result.stats.skills} skills ·{" "}
                {result.stats.characters.toLocaleString()} characters extracted
              </p>
              {result.data.experience.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {result.data.experience.slice(0, 4).map((entry) => (
                    <li key={entry.id}>
                      • {[entry.role, entry.company].filter(Boolean).join(" at ") || "Role"}
                      {entry.startDate ? ` (${entry.startDate})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {result.warnings.length > 0 && (
              <Alert severity="warning">
                <ul className="list-disc pl-4">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <p className="text-xs text-slate-500">
              Importing replaces the current draft. Your saved resumes are not changed
              until you press Save.
            </p>
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isParsing}>
          Cancel
        </Button>
        <Button variant="contained" onClick={confirmImport} disabled={!result || isParsing}>
          Use this CV
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportCvDialog;
