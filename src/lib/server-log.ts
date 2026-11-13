/**
 * Sanitised server logging.
 *
 * Error objects can contain request data: Prisma validation errors include the
 * failing arguments (resume titles, cover-letter text, …), and parser errors can
 * include file internals. Logging the whole object would copy customer data into
 * local terminals and production log drains, where it is retained and readable
 * by more people than the request itself.
 *
 * Log only an error reference plus a non-sensitive name/code. Do not add request
 * bodies, file names, or raw messages here.
 */

export function createErrorReference(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logServerError(
  scope: string,
  error: unknown,
  reference = createErrorReference(),
): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;

  // No message, no stack, no request payload: references are enough to correlate
  // with a user report, and they cannot leak resume or job-description content.
  console.error(`[${scope}] ${reference} ${name}${code ? ` (${code})` : ""}`);
  return reference;
}
