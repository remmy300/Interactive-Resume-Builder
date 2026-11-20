"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PAGE_MARGIN_PX,
  PAGE_SIZES,
  metricsFromStarts,
  type PageSizeId,
  type PreviewMetrics,
} from "@/lib/preview";
import { measurePageStarts, sameStarts } from "./measure";

interface PreviewFrameProps {
  children: ReactNode;
  pageSize?: PageSizeId;
  onMetrics?: (metrics: PreviewMetrics) => void;
}

const PAGE_GAP_PX = 28;

/**
 * Scales the page down to the available width and lays the resume out on
 * separate sheets with the same top and bottom margin, like a printed document.
 * Each sheet ends before a line that does not fit, so text is never sliced, and
 * a heading is never left alone at the bottom. Printing is done separately by
 * the browser from the unscaled document.
 */
export function PreviewFrame({
  children,
  pageSize = "a4",
  onMetrics,
}: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onMetricsRef = useRef(onMetrics);
  const [scale, setScale] = useState(1);
  const [starts, setStarts] = useState<number[]>([0]);

  const size = PAGE_SIZES[pageSize];
  const windowHeight = size.heightPx - 2 * PAGE_MARGIN_PX;

  useEffect(() => {
    onMetricsRef.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const update = () => {
      const nextScale = Math.min(1, container.clientWidth / size.widthPx);
      const nextStarts = measurePageStarts(content, nextScale, windowHeight);
      setScale(nextScale);
      setStarts((current) =>
        sameStarts(current, nextStarts) ? current : nextStarts,
      );
      onMetricsRef.current?.(
        metricsFromStarts(nextStarts, content.scrollHeight, windowHeight),
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [size.widthPx, windowHeight]);

  const pages = starts.length;
  const totalHeight = pages * size.heightPx + (pages - 1) * PAGE_GAP_PX;

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ height: totalHeight * scale }} className="relative">
        <div
          style={{
            width: size.widthPx,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {starts.map((start, index) => {
            const next = starts[index + 1];

            const visible =
              next === undefined
                ? windowHeight
                : Math.min(windowHeight, next - start);
            return (
              <div
                key={index}
                aria-hidden={index > 0 || undefined}
                className="relative overflow-hidden bg-white"
                style={{
                  width: size.widthPx,
                  height: size.heightPx,
                  marginTop: index === 0 ? 0 : PAGE_GAP_PX,
                  boxShadow:
                    "0 1px 2px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  className="absolute left-0 overflow-hidden"
                  style={{
                    top: PAGE_MARGIN_PX,
                    width: size.widthPx,
                    height: visible,
                  }}
                >
                  <div
                    ref={index === 0 ? contentRef : undefined}
                    className="absolute left-0"
                    style={{ top: -start, width: size.widthPx }}
                  >
                    {children}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
