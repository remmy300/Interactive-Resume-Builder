"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface EntryActionsProps {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function EntryActions({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: EntryActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip title="Move up">
        <span>
          <IconButton
            size="small"
            aria-label={`Move ${label} up`}
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move down">
        <span>
          <IconButton
            size="small"
            aria-label={`Move ${label} down`}
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Remove">
        <IconButton
          size="small"
          color="error"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export default EntryActions;
