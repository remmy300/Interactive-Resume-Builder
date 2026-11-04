"use client";

import { useEffect, useState, type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Badge from "@mui/material/Badge";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { OPEN_SECTION_EVENT, type EditorSectionId } from "@/lib/editor-sections";

interface SectionCardProps {
  id: EditorSectionId;
  title: string;
  count?: number;
  hint?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function SectionCard({
  id,
  title,
  count,
  hint,
  defaultExpanded = false,
  children,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const domId = `section-${id}`;

  useEffect(() => {
    const handleOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) return;
      setExpanded(true);
      // Wait for the panel to expand so the scroll lands on the final position.
      window.setTimeout(() => {
        document
          .getElementById(domId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    };
    window.addEventListener(OPEN_SECTION_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SECTION_EVENT, handleOpen);
  }, [id, domId]);

  return (
    <Accordion
      id={domId}
      expanded={expanded}
      onChange={(_event, next) => setExpanded(next)}
      sx={{ scrollMarginTop: 12 }}
    >
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
