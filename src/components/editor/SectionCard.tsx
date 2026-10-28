"use client";

import type { ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Badge from "@mui/material/Badge";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface SectionCardProps {
  title: string;
  count?: number;
  hint?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function SectionCard({
  title,
  count,
  hint,
  defaultExpanded = false,
  children,
}: SectionCardProps) {
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-label={`${title} section`}
      >
        <div className="flex w-full items-center justify-between gap-3 pr-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
          </div>
          {typeof count === "number" && count > 0 && (
            <Badge
              badgeContent={count}
              color="primary"
              sx={{ "& .MuiBadge-badge": { position: "static", transform: "none" } }}
            />
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default SectionCard;
