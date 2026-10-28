import {
  createId,
  type ListSection,
  type ResumeData,
  type TemplateId,
} from "./resume-schema";

export type EditorAction =
  | { type: "replace"; data: ResumeData }
  | { type: "summary"; value: string }
  | { type: "template"; value: TemplateId }
  | { type: "personal"; field: keyof ResumeData["personal"]; value: string }
  | { type: "skills"; field: keyof ResumeData["skills"]; value: string }
  | { type: "entry-add"; section: ListSection }
  | { type: "entry-remove"; section: ListSection; id: string }
  | { type: "entry-move"; section: ListSection; id: string; direction: -1 | 1 }
  | {
      type: "entry-update";
      section: ListSection;
      id: string;
      patch: Record<string, string | boolean>;
    };

function createEntry(section: ListSection) {
  switch (section) {
    case "education":
      return {
        id: createId(),
        college: "",
        degree: "",
        startDate: "",
        endDate: "",
        current: false,
      };
    case "experience":
      return {
        id: createId(),
        company: "",
        role: "",
        description: "",
        startDate: "",
        endDate: "",
        current: false,
      };
    case "projects":
      return { id: createId(), title: "", description: "", link: "" };
    case "certifications":
      return { id: createId(), name: "", issuer: "", date: "", link: "" };
  }
}

export function resumeReducer(data: ResumeData, action: EditorAction): ResumeData {
  switch (action.type) {
    case "replace":
      return action.data;
    case "summary":
      return { ...data, summary: action.value };
    case "template":
      return { ...data, template: action.value };
    case "personal":
      return {
        ...data,
        personal: { ...data.personal, [action.field]: action.value },
      };
    case "skills":
      return {
        ...data,
        skills: { ...data.skills, [action.field]: action.value },
      };
    case "entry-add":
      return { ...data, [action.section]: [...data[action.section], createEntry(action.section)] };
    case "entry-remove":
      return {
        ...data,
        [action.section]: data[action.section].filter(
          (entry) => entry.id !== action.id,
        ),
      };
    case "entry-move": {
      const list = [...data[action.section]];
      const index = list.findIndex((entry) => entry.id === action.id);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= list.length) return data;
      const [moved] = list.splice(index, 1);
      list.splice(target, 0, moved);
      return { ...data, [action.section]: list };
    }
    case "entry-update":
      return {
        ...data,
        [action.section]: data[action.section].map((entry) =>
          entry.id === action.id ? { ...entry, ...action.patch } : entry,
        ),
      };
    default:
      return data;
  }
}
