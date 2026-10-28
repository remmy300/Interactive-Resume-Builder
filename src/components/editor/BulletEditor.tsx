"use client";

import { useEffect, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface BulletEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function toLines(value: string): string[] {
  return value.length === 0 ? [""] : value.split("\n");
}

/**
 * One input per achievement, stored as newline-separated text. Pressing Enter
 * inserts a bullet below the current line instead of requiring a hint that says
 * "one item per line".
 */
export function BulletEditor({
  label,
  value,
  onChange,
  placeholder = "Led a migration that cut page load time by 40%",
}: BulletEditorProps) {
  const lines = toLines(value);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    inputRefs.current[index]?.focus();
  }, [focusVersion]);

  const commit = (nextLines: string[], focusIndex?: number) => {
    onChange(nextLines.join("\n"));
    if (typeof focusIndex === "number") {
      pendingFocus.current = focusIndex;
      setFocusVersion((version) => version + 1);
    }
  };

  const updateLine = (index: number, text: string) => {
    const next = [...lines];
    next[index] = text;
    commit(next);
  };

  const addLine = (afterIndex: number) => {
    const next = [...lines];
    next.splice(afterIndex + 1, 0, "");
    commit(next, afterIndex + 1);
  };

  const removeLine = (index: number) => {
    const next = lines.filter((_, lineIndex) => lineIndex !== index);
    commit(next.length ? next : [""]);
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    commit(next, target);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <Tooltip title="Add bullet">
          <IconButton
            size="small"
            aria-label="Add bullet"
            onClick={() => addLine(lines.length - 1)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      {lines.map((line, index) => (
        <div className="flex items-start gap-1" key={index}>
          <span aria-hidden className="mt-2.5 text-slate-400">
            •
          </span>
          <TextField
            inputRef={(element) => {
              inputRefs.current[index] = element;
            }}
            value={line}
            onChange={(event) => updateLine(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLine(index);
              }
            }}
            placeholder={placeholder}
            fullWidth
            multiline
            maxRows={4}
            inputProps={{ maxLength: 500 }}
            aria-label={`${label} bullet ${index + 1}`}
          />
          <div className="flex shrink-0 items-center">
            <IconButton
              size="small"
              aria-label={`Move bullet ${index + 1} up`}
              disabled={index === 0}
              onClick={() => moveLine(index, -1)}
            >
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Move bullet ${index + 1} down`}
              disabled={index === lines.length - 1}
              onClick={() => moveLine(index, 1)}
            >
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label={`Remove bullet ${index + 1}`}
              onClick={() => removeLine(index)}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </div>
        </div>
      ))}

      <Button size="small" startIcon={<AddIcon />} onClick={() => addLine(lines.length - 1)}>
        Add bullet
      </Button>
    </div>
  );
}

export default BulletEditor;
