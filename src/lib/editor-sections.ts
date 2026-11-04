/** Lets any part of the app open and scroll to a section card in the editor. */
export const OPEN_SECTION_EVENT = "resume-studio:open-section";

export type EditorSectionId =
  | "personal"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certifications";

export function openEditorSection(id: EditorSectionId) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_SECTION_EVENT, { detail: id }));
}
