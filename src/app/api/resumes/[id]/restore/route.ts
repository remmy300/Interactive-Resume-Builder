import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Restores a soft-deleted  */
export const POST = withApiHandler<RouteContext>(async (_request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "resume-write");
  const { id } = await context.params;

  const result = await prisma.resume.updateMany({
    where: { id, userId: user.id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (result.count === 0) throw new HttpError(404, "Resume not found.");

  const resume = await prisma.resume.findFirstOrThrow({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      isPublic: true,
      publicSlug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonResponse(resume);
});
