"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PAGE_MARGIN_PX, PAGE_SIZES } from "@/lib/preview";
import type { ResumeData } from "@/lib/resume-schema";
import { measurePageStarts, sameStarts } from "./measure";
import { ResumePreview } from "./ResumePreview";

const subscribe = () => () => {};

/**
 * What gets printed or saved as PDF. The resume is laid out on whole pages with
 * the same margins and page breaks as the on-screen preview, so the PDF matches
 * what you see. It lives directly under <body>, and the print styles in
 * globals.css hide everything else, so no app header or button ends up in the
 * file. On screen it is laid out off-canvas so it can be measured.
 */
export function PrintPages({ data }: { data: ResumeData }) {
  // The portal needs `document`; this is false on the server and true in the browser.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [starts, setStarts] = useState<number[]>([0]);

  const size = PAGE_SIZES[data.style.pageSize];
  const windowHeight = size.heightPx - 2 * PAGE_MARGIN_PX;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const update = () => {
      const next = measurePageStarts(content, 1, windowHeight);
      setStarts((current) => (sameStarts(current, next) ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => observer.disconnect();
  }, [mounted, windowHeight, size.widthPx]);

  if (!mounted) return null;

  return createPortal(
    <div className="print-root" aria-hidden="true">
      {starts.map((start, index) => {
        const next = starts[index + 1];
        const visible =
          next === undefined ? windowHeight : Math.min(windowHeight, next - start);
        return (
          <div
            key={index}
            className="print-page"
            style={{
              position: "relative",
              width: size.width,
              // A hair under the paper height, so rounding never adds a blank page.
              height: `calc(${size.height} - 0.5mm)`,
              overflow: "hidden",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: PAGE_MARGIN_PX,
                width: size.widthPx,
                height: visible,
                overflow: "hidden",
              }}
            >
              <div
                ref={index === 0 ? contentRef : undefined}
                style={{ position: "absolute", left: 0, top: -start, width: size.widthPx }}
              >
                <ResumePreview data={data} isPrint />
              </div>
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export default PrintPages;
