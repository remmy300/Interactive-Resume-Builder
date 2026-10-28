"use client";

import { useState } from "react";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import type { SaveState } from "@/hooks/useResumeEditor";

interface TopBarProps {
  email: string;
  name?: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  saveState: SaveState;
  hasResume: boolean;
  atsScore: number;
  onSave: () => void;
  onPreview: () => void;
  onOpenAts: () => void;
  onPrint: () => void;
  onExport: () => void;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}

function statusFor({
  isDirty,
  isSaving,
  isLoading,
  saveState,
  hasResume,
}: Pick<
  TopBarProps,
  "isDirty" | "isSaving" | "isLoading" | "saveState" | "hasResume"
>): { label: string; color: "default" | "success" | "warning" | "error" } {
  if (isLoading) return { label: "Loading…", color: "default" };
  if (isSaving) return { label: "Saving…", color: "default" };
  if (saveState === "error") return { label: "Save failed", color: "error" };
  if (isDirty) {
    return hasResume
      ? { label: "Unsaved changes", color: "warning" }
      : { label: "Draft not saved", color: "warning" };
  }
  return { label: "All changes saved", color: "success" };
}

export function TopBar({
  email,
  name,
  isDirty,
  isSaving,
  isLoading,
  saveState,
  hasResume,
  atsScore,
  onSave,
  onPreview,
  onOpenAts,
  onPrint,
  onExport,
  onDeleteAccount,
  onSignOut,
}: TopBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const status = statusFor({ isDirty, isSaving, isLoading, saveState, hasResume });
  const initials = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-base font-bold text-white">
            R
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Resume Studio</p>
            <p className="hidden text-xs text-slate-500 sm:block">
              ATS-friendly resume builder
            </p>
          </div>
        </div>

        <Chip
          size="small"
          label={status.label}
          color={status.color}
          variant={status.color === "default" ? "outlined" : "filled"}
          sx={{ ml: { xs: 0, sm: 1 } }}
        />

        <div className="ml-auto flex items-center gap-2">
          <Tooltip title="Save (Ctrl/⌘ + S)">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={onSave}
                disabled={!isDirty || isSaving || isLoading}
              >
                Save
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FactCheckIcon />}
            onClick={onOpenAts}
            aria-label={`ATS check. Current score ${atsScore} out of 100.`}
          >
            ATS {atsScore}
          </Button>
          <Button size="small" variant="text" onClick={onPreview}>
            Preview
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={onPrint}
            disabled={isLoading}
          >
            PDF
          </Button>
          <IconButton
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: "#f1f5f9", color: "#334155", fontSize: 14 }}>
              {initials}
            </Avatar>
          </IconButton>
        </div>
      </div>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled>
          <ListItemText primary={name || "Signed in"} secondary={email} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport();
          }}
        >
          Export my data
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDeleteAccount();
          }}
          sx={{ color: "error.main" }}
        >
          Delete account
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onSignOut();
          }}
        >
          Sign out
        </MenuItem>
      </Menu>
    </header>
  );
}

export default TopBar;
