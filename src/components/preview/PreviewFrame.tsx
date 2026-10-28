"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// A4 at 96dpi. Used only for on-screen scaling, never for print output.
const A4_WIDTH_PX = 793.7;
const A4_HEIGHT_PX = 1122.5;

interface PreviewFrameProps {
  children: ReactNode;
}

/** Scales the A4 page down to the available width so mobile users can read it. */
export function PreviewFrame({ children }: PreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(A4_HEIGHT_PX);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const update = () => {
      const nextScale = Math.min(1, container.clientWidth / A4_WIDTH_PX);
      setScale(nextScale);
      setHeight(Math.max(content.scrollHeight, A4_HEIGHT_PX) * nextScale);
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
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
