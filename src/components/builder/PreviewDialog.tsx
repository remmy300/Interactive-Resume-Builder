"use client";

import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import { ResumePreview } from "@/components/preview/ResumePreview";
import type { ResumeData } from "@/lib/resume-schema";
import PreviewFrame from "@/components/preview/PreviewFrame";

interface PreviewDialogProps {
  open: boolean;
  data: ResumeData;
  onClose: () => void;
  onPrint: () => void;
  toolbarExtra?: ReactNode;
}

export function PreviewDialog({
  open,
  data,
  onClose,
  onPrint,
  toolbarExtra,
}: PreviewDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullScreen aria-labelledby="preview-title">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <IconButton aria-label="Close preview" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <h2 id="preview-title" className="text-base font-semibold text-slate-900">
            Resume preview
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {toolbarExtra}
          <Button variant="contained" startIcon={<PrintIcon />} onClick={onPrint}>
            Print / Save PDF
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-200 p-4 sm:p-8">
        <div className="mx-auto w-full max-w-[900px]">
          <PreviewFrame>
            <ResumePreview data={data} />
          </PreviewFrame>
        </div>
      </div>
    </Dialog>
  );
}

export default PreviewDialog;
