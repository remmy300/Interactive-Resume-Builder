"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import type { ResumeSummary } from "@/hooks/useResumeEditor";

interface ResumeSwitcherProps {
  items: ResumeSummary[];
  currentId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: () => void;
}

export function ResumeSwitcher({
  items,
  currentId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
}: ResumeSwitcherProps) {
  return (
    <div className="flex items-end gap-2">
      <FormControl fullWidth size="small" disabled={isLoading}>
        <InputLabel id="resume-switcher-label">Saved resumes</InputLabel>
        <Select
          labelId="resume-switcher-label"
          label="Saved resumes"
          value={currentId ?? ""}
          onChange={(event) => onSelect(event.target.value)}
        >
          <MenuItem value="">
            <em>Unsaved draft</em>
          </MenuItem>
          {items.map((resume) => (
            <MenuItem key={resume.id} value={resume.id}>
              {resume.title}
              {resume.isPublic ? " · public" : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="Start a new resume">
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNew}
          disabled={isLoading}
          sx={{ height: 40, whiteSpace: "nowrap" }}
        >
          New
        </Button>
      </Tooltip>

      <Tooltip title="Delete this resume">
        <span>
          <IconButton
            aria-label="Delete current resume"
            color="error"
            onClick={onDelete}
            disabled={!currentId || isLoading}
            sx={{ height: 40, width: 40 }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </span>
      </Tooltip>
    </div>
  );
}

export default ResumeSwitcher;
