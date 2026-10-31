import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { shareResumeSchema } from "@/lib/resume-schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function createSlug(): string {
  return randomBytes(7).toString("base64url").toLowerCase();
}

/** Turns the private share link for a resume on or off. */
export const POST = withApiHandler<RouteContext>(
  async (request, context) => {
    const user = await requireUser();
    enforceRateLimit(user.id, "share");
    const { id } = await context.params;

    const parsed = shareResumeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(400, "Invalid share request.");
    }

    const owned = await prisma.resume.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { id: true, isPublic: true, publicSlug: true },
    });
    if (!owned) throw new HttpError(404, "Resume not found.");

    if (!parsed.data.enabled) {
      await prisma.resume.update({
        where: { id: owned.id },
        data: { isPublic: false, publicSlug: null },
      });
      return jsonResponse({ isPublic: false, publicSlug: null });
    }

    if (owned.isPublic && owned.publicSlug) {
      return jsonResponse({
        isPublic: true,
        publicSlug: owned.publicSlug,
      });
    }

    // Collide-proof slug: retry a few times before giving up.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const updated = await prisma.resume.update({
          where: { id: owned.id },
          data: { isPublic: true, publicSlug: createSlug() },
          select: { isPublic: true, publicSlug: true },
        });
        return jsonResponse(updated);
      } catch (error) {
        // Only a slug collision is worth retrying; surface anything else.
        const isCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!isCollision) throw error;
      }
    }

    throw new HttpError(500, "Could not create a share link. Try again.");
  },
);
