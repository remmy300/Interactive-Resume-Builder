import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { coverLetterUpdateSchema } from "@/lib/career";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const item = await prisma.coverLetter.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) throw new HttpError(404, "Cover letter not found.");
  return jsonResponse(item);
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const parsed = coverLetterUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Cover letter data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const result = await prisma.coverLetter.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) throw new HttpError(404, "Cover letter not found.");

  const item = await prisma.coverLetter.findFirstOrThrow({
    where: { id, userId: user.id },
  });
  return jsonResponse(item);
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const result = await prisma.coverLetter.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new HttpError(404, "Cover letter not found.");

  return new Response(null, { status: 204 });
});
