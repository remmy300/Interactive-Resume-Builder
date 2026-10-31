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
import { normalizeResumeData, updateResumeSchema } from "@/lib/resume-schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler<RouteContext>(
  async (_request, context) => {
    const user = await requireUser();
    const { id } = await context.params;

    const resume = await prisma.resume.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!resume) throw new HttpError(404, "Resume not found.");

    return jsonResponse({
      ...resume,
      data: normalizeResumeData(resume.data),
    });
  },
);

export const PATCH = withApiHandler<RouteContext>(
  async (request, context) => {
    const user = await requireUser();
    enforceRateLimit(user.id, "resume-write");
    const { id } = await context.params;

    const parsed = updateResumeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(
        400,
        "Resume data is invalid.",
        parsed.error.flatten().fieldErrors,
      );
    }

    const expectedUpdatedAt = parsed.data.updatedAt
      ? new Date(parsed.data.updatedAt)
      : null;
    if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
      throw new HttpError(400, "The updatedAt value is not a valid date.");
    }
    const hasValidExpectedDate = expectedUpdatedAt !== null;

    const result = await prisma.resume.updateMany({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
        // Optimistic concurrency: reject the write if another tab saved first.
        ...(hasValidExpectedDate ? { updatedAt: expectedUpdatedAt } : {}),
      },
      data: {
        title: parsed.data.title,
        data: parsed.data.data as Prisma.InputJsonValue,
        schemaVersion: 1,
      },
    });

    if (result.count === 0) {
      const existing = await prisma.resume.findFirst({
        where: { id, userId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw new HttpError(404, "Resume not found.");
      throw new HttpError(
        409,
        "This resume changed somewhere else. Reload it before saving again.",
      );
    }

    const resume = await prisma.resume.findFirstOrThrow({
      where: { id, userId: user.id, deletedAt: null },
    });

    return jsonResponse({
      ...resume,
      data: normalizeResumeData(resume.data),
    });
  },
);

export const DELETE = withApiHandler<RouteContext>(
  async (_request, context) => {
    const user = await requireUser();
    enforceRateLimit(user.id, "resume-write");
    const { id } = await context.params;

    const result = await prisma.resume.updateMany({
      where: { id, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date(), isPublic: false, publicSlug: null },
    });
    if (result.count === 0) throw new HttpError(404, "Resume not found.");

    return new Response(null, { status: 204 });
  },
);
