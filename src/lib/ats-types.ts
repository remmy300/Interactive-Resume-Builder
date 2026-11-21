export type AtsStatus = "pass" | "warn" | "fail" | "info";

export const ATS_STATUSES: readonly AtsStatus[] = [
  "pass",
  "warn",
  "fail",
  "info",
];

export type AtsCategory =
  | "experience"
  | "skills"
  | "content"
  | "contact"
  | "structure"
  | "document";

export const CATEGORY_LABELS: Record<AtsCategory, string> = {
  experience: "Experience and achievements",
  skills: "Skills and technical evidence",
  content: "Content quality",
  contact: "Contact information",
  structure: "Structure and consistency",
  document: "Document compatibility",
};

export const CATEGORY_ORDER: AtsCategory[] = [
  "experience",
  "skills",
  "content",
  "contact",
  "structure",
  "document",
];

export type AtsImportance = "required" | "recommended" | "optional";

export interface AtsCheck {
  id: string;
  label: string;
  status: AtsStatus;
  detail: string;
  weight: number;
  category: AtsCategory;
  examples?: string[];
}

export interface AtsCategoryScore {
  id: AtsCategory;
  label: string;
  earned: number;
  total: number;
  percent: number;
}

export interface AtsContribution {
  id: string;
  label: string;
  status: AtsStatus;
  category: AtsCategory;
  possible: number;
  earned: number;
  lost: number;
}

export interface AtsCapDetail {
  id: string;
  max: number;
  reason: string;
}

export interface AtsAssessment {
  score: number;
  verdict: string;
}

export interface AtsDocumentAssessment {
  score: number | null;
  verdict: string;
  checks: AtsCheck[];
}

export interface AtsReport {
  score: number;
  rawScore: number;
  caps: string[];
  capDetails: AtsCapDetail[];
  verdict: string;
  checks: AtsCheck[];
  categories: AtsCategoryScore[];
  breakdown: AtsContribution[];
  quality: AtsAssessment;
  document: AtsDocumentAssessment;
  passed: number;
  warnings: number;
  failed: number;
  info: number;
}

/** Runtime guard for the contract: used by tests and by `qualityChecks`. */
export function isValidCheck(value: unknown): value is AtsCheck {
  if (!value || typeof value !== "object") return false;
  const check = value as Partial<AtsCheck>;
  return (
    typeof check.id === "string" &&
    check.id.length > 0 &&
    typeof check.label === "string" &&
    typeof check.detail === "string" &&
    typeof check.weight === "number" &&
    Number.isFinite(check.weight) &&
    check.weight >= 0 &&
    ATS_STATUSES.includes(check.status as AtsStatus) &&
    CATEGORY_ORDER.includes(check.category as AtsCategory) &&
    (check.examples === undefined || Array.isArray(check.examples))
  );
}
