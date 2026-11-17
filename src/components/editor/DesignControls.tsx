"use client";

import type { Dispatch } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { PAGE_SIZES } from "@/lib/preview";
import type { EditorAction } from "@/lib/resume-reducer";
import {
  FONT_CHOICES,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  PAGE_SIZE_IDS,
  SPACING_IDS,
  type FontId,
  type ResumeStyle,
} from "@/lib/resume-schema";

interface DesignControlsProps {
  value: ResumeStyle;
  dispatch: Dispatch<EditorAction>;
}

const SPACING_LABELS: Record<ResumeStyle["spacing"], string> = {
  tight: "Tight",
  normal: "Normal",
  relaxed: "Relaxed",
};

const roundScale = (value: number) => Math.round(value * 100) / 100;

/** Font, text size, spacing and paper size for the whole resume. */
export function DesignControls({ value, dispatch }: DesignControlsProps) {
  const update = (patch: Partial<ResumeStyle>) => dispatch({ type: "style", patch });
  const percent = Math.round(value.fontScale * 100);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Text and page
      </p>

      <FormControl fullWidth size="small">
        <InputLabel id="font-label">Font</InputLabel>
        <Select
          labelId="font-label"
          label="Font"
          value={value.font}
          onChange={(event) => update({ font: event.target.value as FontId })}
        >
          {FONT_CHOICES.map((choice) => (
            <MenuItem
              key={choice.id}
              value={choice.id}
              sx={choice.stack ? { fontFamily: choice.stack } : undefined}
            >
              {choice.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-700">Text size</span>
        <div className="flex items-center gap-1">
          <IconButton
            size="small"
            aria-label="Decrease text size"
            disabled={value.fontScale <= FONT_SCALE_MIN + 0.001}
            onClick={() =>
              update({
                fontScale: Math.max(FONT_SCALE_MIN, roundScale(value.fontScale - FONT_SCALE_STEP)),
              })
            }
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <span className="w-12 text-center text-sm font-medium text-slate-900" aria-live="polite">
            {percent}%
          </span>
          <IconButton
            size="small"
            aria-label="Increase text size"
            disabled={value.fontScale >= FONT_SCALE_MAX - 0.001}
            onClick={() =>
              update({
                fontScale: Math.min(FONT_SCALE_MAX, roundScale(value.fontScale + FONT_SCALE_STEP)),
              })
            }
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormControl fullWidth size="small">
          <InputLabel id="spacing-label">Spacing</InputLabel>
          <Select
            labelId="spacing-label"
            label="Spacing"
            value={value.spacing}
            onChange={(event) =>
              update({ spacing: event.target.value as ResumeStyle["spacing"] })
            }
          >
            {SPACING_IDS.map((id) => (
              <MenuItem key={id} value={id}>
                {SPACING_LABELS[id]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="page-size-label">Page size</InputLabel>
          <Select
            labelId="page-size-label"
            label="Page size"
            value={value.pageSize}
            onChange={(event) =>
              update({ pageSize: event.target.value as ResumeStyle["pageSize"] })
            }
          >
            {PAGE_SIZE_IDS.map((id) => (
              <MenuItem key={id} value={id}>
                {PAGE_SIZES[id].label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}

export default DesignControls;
