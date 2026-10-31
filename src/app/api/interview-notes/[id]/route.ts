import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { interviewNoteUpdateSchema } from "@/lib/career";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const parsed = interviewNoteUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Interview note data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const result = await prisma.interviewNote.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) throw new HttpError(404, "Interview note not found.");

  const item = await prisma.interviewNote.findFirstOrThrow({
    where: { id, userId: user.id },
  });
  return jsonResponse(item);
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");
  const { id } = await context.params;

  const result = await prisma.interviewNote.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) throw new HttpError(404, "Interview note not found.");

  return new Response(null, { status: 204 });
});
