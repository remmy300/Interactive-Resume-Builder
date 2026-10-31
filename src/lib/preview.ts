// A4 at 96dpi. Used only for on-screen scaling, never for print output.
export const A4_WIDTH_PX = 793.7;
export const A4_HEIGHT_PX = 1122.5;

// 297mm renders as 1122.52px, so ignore up to 2px of rounding when deciding
// whether content has actually overflowed onto another page.
const PAGE_TOLERANCE_PX = 2;

/** Number of A4 pages needed for a rendered document at 96dpi. */
export function countPages(
  contentHeight: number,
  pageHeight = A4_HEIGHT_PX,
): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 1;
  return Math.max(1, Math.ceil((contentHeight - PAGE_TOLERANCE_PX) / pageHeight));
}

/**
 * How full the last page is (0–1). Useful for warning when content ends just
 * past a page boundary and could look clipped in a PDF viewer.
 */
export function lastPageFill(
  contentHeight: number,
  pageHeight = A4_HEIGHT_PX,
): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 0;
  const remainder = contentHeight % pageHeight;
  if (remainder === 0) return 1;
  if (remainder <= PAGE_TOLERANCE_PX) return 0;
  return remainder / pageHeight;
}

export function describePages(count: number): string {
  if (count <= 1) return "1 page";
  return `${count} pages`;
}

export interface PreviewMetrics {
  pages: number;
  lastPageFill: number;
  contentHeight: number;
}

export function getPreviewMetrics(contentHeight: number): PreviewMetrics {
  return {
    pages: countPages(contentHeight),
    lastPageFill: lastPageFill(contentHeight),
    contentHeight,
  };
}
