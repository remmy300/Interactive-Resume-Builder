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

// Empty space shown between pages on screen. It is not part of the document.
const PAGE_GAP_PX = 24;

/**
 * Scales the A4 page down to the available width, measures how many pages the
 * document needs, and shows each page as its own sheet with empty space between
 * them. Every sheet shows exactly the slice of the document that the browser
 * will put on that page when printing, so no content is hidden by the gap.
 */
export function PreviewFrame({ children, onMetrics }: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onMetricsRef = useRef(onMetrics);
  const [scale, setScale] = useState(1);
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
      setMetrics(nextMetrics);
      onMetricsRef.current?.(nextMetrics);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const pages = metrics.pages;
  const totalHeight = pages * A4_HEIGHT_PX + (pages - 1) * PAGE_GAP_PX;

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ height: totalHeight * scale }} className="relative">
        <div
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="absolute left-0 top-0"
        >
          {Array.from({ length: pages }).map((_, index) => (
            <div
              key={index}
              aria-hidden={index > 0 || undefined}
              className="relative overflow-hidden bg-white shadow-sm"
              style={{
                height: A4_HEIGHT_PX,
                marginTop: index === 0 ? 0 : PAGE_GAP_PX,
              }}
            >
              <div
                ref={index === 0 ? contentRef : undefined}
                className="absolute left-0"
                style={{ width: A4_WIDTH_PX, top: -index * A4_HEIGHT_PX }}
              >
                {children}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
