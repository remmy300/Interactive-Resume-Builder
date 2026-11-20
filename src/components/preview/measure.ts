import { paginate, type LayoutBlock } from "@/lib/preview";

const BLOCKS = [
  ".cv-header",
  ".cv-bullets li",
  ".cv-section__title",
  ".cv-entry__row",
  ".cv-entry__sub",
  ".cv-project-line",
  ".cv-section > p",
  ".cv-skill-flat",
  ".cv-skill-row",
  ".cv-tags",
].join(",");

const KEEP_WITH_NEXT =
  ".cv-header, .cv-section__title, .cv-entry__row, .cv-entry__sub, .cv-project-line";

export const sameStarts = (a: number[], b: number[]) =>
  a.length === b.length &&
  a.every((value, index) => Math.abs(value - b[index]) < 0.5);

/**
 * Measures a rendered resume and returns where each page starts
 */
export function measurePageStarts(
  content: HTMLElement,
  scale: number,
  windowHeight: number,
): number[] {
  const origin = content.getBoundingClientRect().top;
  const blocks: LayoutBlock[] = Array.from(
    content.querySelectorAll<HTMLElement>(BLOCKS),
  ).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: (rect.top - origin) / scale,
      bottom: (rect.bottom - origin) / scale,
      keepWithNext: element.matches(KEEP_WITH_NEXT),
    };
  });
  return paginate(blocks, windowHeight);
}
