import { normalizeResumeData, type ResumeData } from "./resume-schema";

const KEY = "resume-studio:guest-draft";

export interface GuestDraft {
  title: string;
  data: ResumeData;
}

/** The unsigned-in visitor's resume. It lives only in this browser. */
export function loadGuestDraft(): GuestDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { title?: unknown; data?: unknown };
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return {
      title:
        typeof parsed.title === "string" ? parsed.title : "Untitled resume",
      data: normalizeResumeData(parsed.data as ResumeData),
    };
  } catch {
    return null;
  }
}

export function saveGuestDraft(draft: GuestDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Stored guests resume
  }
}

export function clearGuestDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
