"use client";

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmColor?: "primary" | "error";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmColor = "primary",
  busy = false,
  onCancel,
  onConfirm,
  secondaryAction,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      aria-labelledby="confirm-dialog-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} disabled={busy}>
            {secondaryAction.label}
          </Button>
        )}
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;
