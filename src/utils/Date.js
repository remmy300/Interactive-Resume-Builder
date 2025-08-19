export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short", // Jan, Feb, Mar...
    year: "numeric",
  });
}
