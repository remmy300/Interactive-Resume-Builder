"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {
  labelForField,
  lowConfidenceFields,
  type ImportResult,
} from "@/lib/import/report";

export type ImportReview = Pick<
  ImportResult,
  "rejected" | "unassigned" | "incomplete" | "confidence"
>;

export function hasReviewItems(review: ImportReview): boolean {
  return (
    review.rejected.length > 0 ||
    review.unassigned.length > 0 ||
    review.incomplete.some(
      (item) => item.missing.length > 0 || item.issues.length > 0,
    ) ||
    lowConfidenceFields(review.confidence).length > 0
  );
}

interface ImportReviewDialogProps {
  open: boolean;
  review: ImportReview;
  onClose: () => void;
}

const SECTION_NAMES: Record<string, string> = {
  experience: "Work experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  skills: "Skills",
};

function CopyableText({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Button size="small" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{text}</p>
    </li>
  );
}

/** What the importer could not place, so nothing from the CV is lost without a word. */
export default function ImportReviewDialog({
  open,
  review,
  onClose,
}: ImportReviewDialogProps) {
  const gaps = review.incomplete.filter(
    (item) => item.missing.length > 0 || item.issues.length > 0,
  );
  const guessed = lowConfidenceFields(review.confidence);
  const notImported = review.rejected.length + review.unassigned.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="import-review-title"
    >
      <DialogTitle id="import-review-title">Check your imported CV</DialogTitle>
      <DialogContent dividers>
        <p className="text-sm text-slate-600">
          Your CV was imported and saved. These parts need a quick look so
          nothing is missing.
        </p>

        {notImported > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Not imported ({notImported})
            </h3>
            <p className="text-xs text-slate-500">
              We could not place this text. Copy it into the right section if
              you want to keep it.
            </p>
            <ul className="mt-2 space-y-2">
              {review.rejected.map((item, index) => (
                <CopyableText
                  key={`r-${index}`}
                  label={`${SECTION_NAMES[item.section] ?? item.section} — ${item.reason}`}
                  text={item.text}
                />
              ))}
              {review.unassigned.map((item, index) => (
                <CopyableText
                  key={`u-${index}`}
                  label={item.heading}
                  text={item.text}
                />
              ))}
            </ul>
          </section>
        )}

        {gaps.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">To fill in</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {gaps.map((item, index) => (
                <li key={`g-${index}`}>
                  <span className="font-medium">{item.label}</span>
                  {item.missing.length > 0 && (
                    <>: missing {item.missing.join(", ")}</>
                  )}
                  {item.issues.map((issue) => (
                    <span key={issue} className="block text-xs text-amber-700">
                      {issue}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}

        {guessed.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Hard to read, please check
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              {guessed.map(labelForField).join(", ")}
            </p>
          </section>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
