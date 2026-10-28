export function normalizeLink(
  type: "linkedin" | "github" | "portfolio" | "email" | "url",
  url: string,
): string {
  if (!url) return "";

  const clean = url.trim().replace(/^(https?:\/\/)?(www\.)?/i, "");

  switch (type) {
    case "linkedin":
      return clean.replace(/^linkedin\.com\/(in\/)?/i, "in/");
    case "github":
      return clean.replace(/^github\.com\//, "");
    case "portfolio":
      return clean;
    case "email":
      return clean;
    case "url":
      return /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${clean}`;
    default:
      return clean;
  }
}

/** Safe file name for exported PDFs; strips characters Windows rejects. */
export function safeFileName(value: string, fallback = "resume"): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}
