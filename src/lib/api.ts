import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

/** Returns the signed-in user or throws a 401 handled by `withApiHandler`. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "Sign in to use this feature.");
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export function enforceRateLimit(userId: string, action: string) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`${userId}:${action}`);
  if (!allowed) {
    throw new HttpError(
      429,
      "Too many requests. Please wait a moment and try again.",
      { retryAfterSeconds },
    );
  }
}

/** JSON response that is never cached by browsers or proxies. */
export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function errorResponse(
  status: number,
  message: string,
  details?: unknown,
) {
  return jsonResponse({ error: message, details }, { status });
}

/**
 * Wraps a route handler so every failure becomes a predictable JSON envelope.
 * Prisma's "record not found" is mapped to 404 instead of leaking a 500.
 */
export function withApiHandler<Context>(
  handler: (request: Request, context: Context) => Promise<Response>,
): (request: Request, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return errorResponse(error.status, error.message, error.details);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return errorResponse(404, "Resource not found.");
        }
        if (error.code === "P2002") {
          return errorResponse(409, "That value is already in use.");
        }
      }
      console.error("API route failed", error);
      return errorResponse(500, "Something went wrong. Please try again.");
    }
  };
}

/** Reads a JSON body, rejecting malformed payloads with a 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
