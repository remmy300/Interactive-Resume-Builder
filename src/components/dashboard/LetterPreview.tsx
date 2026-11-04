import { parseLetter } from "@/lib/letter-links";

/** Read-only view of a letter where links appear as their titles. */
export function LetterPreview({ content }: { content: string }) {
  const segments = parseLetter(content);
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-900 underline underline-offset-2"
            title={segment.href}
          >
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}

export default LetterPreview;
