"use client";

import type { Dispatch } from "react";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import type { EditorAction } from "@/lib/resume-reducer";
import type { ResumeData } from "@/lib/resume-schema";

export const MAX_ENTRIES = 30;

export interface SectionProps {
  data: ResumeData;
  dispatch: Dispatch<EditorAction>;
}



export function MonthField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const normalized = /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
  return (
    <TextField
      type="month"
      label={label}
      value={normalized}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      fullWidth
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

export function DateRangeFields({
  startDate,
  endDate,
  current,
  currentLabel,
  onStartChange,
  onEndChange,
  onCurrentChange,
}: {
  startDate: string;
  endDate: string;
  current: boolean;
  currentLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onCurrentChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-3">
        <MonthField label="Start" value={startDate} onChange={onStartChange} />
        <MonthField
          label="End"
          value={current ? "" : endDate}
          onChange={onEndChange}
          disabled={current}
        />
      </div>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={current}
            onChange={(event) => onCurrentChange(event.target.checked)}
          />
        }
        label={<span className="text-sm text-slate-600">{currentLabel}</span>}
      />
    </div>
  );
}

export function AddEntryButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      fullWidth
      onClick={onClick}
      disabled={disabled}
      sx={{ mt: 1 }}
    >
      {label}
    </Button>
  );
}

export function EmptyList({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}

export function EntryHeading({ index, title }: { index: number; title: string }) {
  return <h3 className="text-sm font-semibold text-slate-800">{title} #{index + 1}</h3>;
}

