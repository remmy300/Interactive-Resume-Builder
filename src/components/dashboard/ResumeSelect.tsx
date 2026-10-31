"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import type { LibraryResume } from "@/hooks/useResumeLibrary";

interface ResumeSelectProps {
  items: LibraryResume[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
}

export function ResumeSelect({
  items,
  value,
  onChange,
  label = "Resume",
  disabled = false,
}: ResumeSelectProps) {
  return (
    <FormControl fullWidth size="small" disabled={disabled || items.length === 0}>
      <InputLabel id="resume-select-label">{label}</InputLabel>
      <Select
        labelId="resume-select-label"
        label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {items.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default ResumeSelect;
