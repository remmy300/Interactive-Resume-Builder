"use client";

import { useState } from "react";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Button from "@mui/material/Button";
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
  atsScore: number;
  canSave: boolean;
  canExport: boolean;
  blockedReason: string;
  onSave: () => void;
  onPreview: () => void;
  onOpenAts: () => void;
  onPrint: () => void;
  onExport: () => void;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}

export function TopBar({
  email,
  name,
  isDirty,
  isSaving,
  isLoading,
  saveState,
  atsScore,
  canSave,
  canExport,
  blockedReason,
  onSave,
  onOpenAts,
  onPrint,
  onExport,
  onDeleteAccount,
  onSignOut,
}: TopBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const initials = (name || email || "?").trim().charAt(0).toUpperCase();

  // The one Save button also tells you where the resume stands.
  const saveLabel = isSaving
    ? "Saving…"
    : saveState === "error"
      ? "Retry save"
      : isDirty
        ? "Save"
        : "Saved";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-base font-bold text-white">
            R
          </div>
          <div className="leading-tight">
            <p className="hidden text-xs text-slate-500 sm:block">
              ATS-friendly resume builder
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Tooltip title={blockedReason || "Save (Ctrl/⌘ + S)"}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={onSave}
                disabled={
                  isSaving ||
                  isLoading ||
                  !canSave ||
                  (!isDirty && saveState !== "error")
                }
              >
                {saveLabel}
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FactCheckIcon />}
            onClick={onOpenAts}
            aria-label={`Resume quality check. Current score ${atsScore} out of 100.`}
          >
            Quality {atsScore}
          </Button>

          <Tooltip title={blockedReason || "Download a text-based PDF"}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={onPrint}
                disabled={isLoading || !canExport}
              >
                PDF
              </Button>
            </span>
          </Tooltip>
          <IconButton
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: "#f1f5f9",
                color: "#334155",
                fontSize: 14,
              }}
            >
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
