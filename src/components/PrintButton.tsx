"use client";

import PrintIcon from "@mui/icons-material/Print";
import Button from "@mui/material/Button";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <Button
      variant="contained"
      size="small"
      startIcon={<PrintIcon />}
      onClick={() => window.print()}
    >
      {label}
    </Button>
  );
}

export default PrintButton;
