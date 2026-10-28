"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { TEMPLATES, type TemplateId } from "@/lib/resume-schema";

interface TemplatePickerProps {
  value: TemplateId;
  onChange: (value: TemplateId) => void;
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const active = TEMPLATES.find((template) => template.id === value);

  return (
    <div>
      <FormControl fullWidth size="small">
        <InputLabel id="template-label">Template</InputLabel>
        <Select
          labelId="template-label"
          label="Template"
          value={value}
          onChange={(event) => onChange(event.target.value as TemplateId)}
        >
          {TEMPLATES.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {active && <p className="mt-1 text-xs text-slate-500">{active.description}</p>}
    </div>
  );
}

export default TemplatePicker;
