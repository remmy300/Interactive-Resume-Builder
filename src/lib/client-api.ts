export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: string;
  details?: unknown;
}

/** First human-readable field message from a Zod `fieldErrors` payload. */
function firstFieldMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  for (const messages of Object.values(details as Record<string, unknown>)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") return messages[0];
  }
  return null;
}

/**
 * Fetch wrapper for client components. Keeps error handling consistent with the
 * API's `{ error, details }` envelope, preferring the specific field message
 * (for example "Use a link that starts with https://") over the generic one.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      firstFieldMessage(body?.details) ??
        body?.error ??
        `Request failed with status ${response.status}.`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const JSON_HEADERS = { "Content-Type": "application/json" } as const;
