import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { applicationUpdateSchema } from "@/lib/career";
import { parseOptionalDate } from "@/lib/career-server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const parsed = applicationUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Application data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { appliedAt, ...rest } = parsed.data;
  const result = await prisma.application.updateMany({
    where: { id, userId: user.id },
    data: {
      ...rest,
      ...(appliedAt !== undefined ? { appliedAt: parseOptionalDate(appliedAt) } : {}),
    },
  });
  if (result.count === 0) throw new HttpError(404, "Application not found.");

  const item = await prisma.application.findFirstOrThrow({
    where: { id, userId: user.id },
  });
  return jsonResponse(item);
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const result = await prisma.application.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new HttpError(404, "Application not found.");

  return new Response(null, { status: 204 });
});
