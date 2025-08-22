export function normalizeLink(type, url) {
  if (!url) return "";

  // Remove protocol (http/https) + "www."
  let clean = url.replace(/^(https?:\/\/)?(www\.)?/i, "");

  switch (type) {
    case "linkedin":
      return clean.replace(/^linkedin\.com\/(in\/)?/i, "in/");
    case "github":
      return clean.replace(/^github\.com\//, "");
    case "portfolio":
      return clean; // just strip protocol/www
    case "email":
      return clean.trim(); // plain email, no "mailto:"
    default:
      return clean;
  }
}
