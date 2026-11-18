export function parseOptionalDate(value?: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value.trim()) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T12:00:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
