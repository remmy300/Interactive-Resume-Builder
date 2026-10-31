"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  getPreviewMetrics,
  type PreviewMetrics,
} from "@/lib/preview";

interface PreviewFrameProps {
  children: ReactNode;
  onMetrics?: (metrics: PreviewMetrics) => void;
}

/**
 * Scales the A4 page down to the available width, measures how many pages the
 * document needs, and draws page-break guides on screen. Print output is still
 * produced by the browser from the real, unscaled document.
 */
export function PreviewFrame({ children, onMetrics }: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onMetricsRef = useRef(onMetrics);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(A4_HEIGHT_PX);
  const [metrics, setMetrics] = useState<PreviewMetrics>(() =>
    getPreviewMetrics(A4_HEIGHT_PX),
  );

  useEffect(() => {
    onMetricsRef.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const update = () => {
      const nextScale = Math.min(1, container.clientWidth / A4_WIDTH_PX);
      const contentHeight = Math.max(content.scrollHeight, A4_HEIGHT_PX);
      const nextMetrics = getPreviewMetrics(contentHeight);
      setScale(nextScale);
      setHeight(contentHeight * nextScale);
      setMetrics(nextMetrics);
      onMetricsRef.current?.(nextMetrics);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ height }} className="relative">
        <div
          ref={contentRef}
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {children}
          {Array.from({ length: Math.max(0, metrics.pages - 1) }).map((_, index) => (
            <div
              key={index}
              aria-hidden
              className="screen-only pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-slate-300"
              style={{ top: (index + 1) * A4_HEIGHT_PX }}
            >
              <span className="absolute right-3 top-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Page {index + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
