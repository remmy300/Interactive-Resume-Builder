"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { cleanLinkTitle, normalizeLinkUrl } from "@/lib/letter-links";

interface LetterLinkDialogProps {
  /** Text the user had selected in the letter, used as the suggested title. */
  initialTitle: string;
  onCancel: () => void;
  onInsert: (title: string, href: string) => void;
}

export function LetterLinkDialog({
  initialTitle,
  onCancel,
  onInsert,
}: LetterLinkDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const href = normalizeLinkUrl(url);
  const cleanTitle = cleanLinkTitle(title);
  const urlError =
    touched && !href ? "Enter a valid web address, such as github.com/you." : "";
  const titleError = touched && !cleanTitle ? "Give the link a title." : "";

  const submit = () => {
    setTouched(true);
    if (!href || !cleanTitle) return;
    onInsert(cleanTitle, href);
  };

  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Add a link</DialogTitle>
      <DialogContent>
        <p className="mb-3 text-sm text-slate-600">
          The letter shows the title, not the full address.
        </p>
        <div className="space-y-3 pt-1">
          <TextField
            autoFocus
            label="Link title"
            placeholder="My portfolio"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={Boolean(titleError)}
            helperText={titleError}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label="Web address"
            placeholder="https://yourname.dev"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            error={Boolean(urlError)}
            helperText={urlError}
            fullWidth
          />
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          Add link
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LetterLinkDialog;
