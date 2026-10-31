import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { coverLetterInputSchema } from "@/lib/career";
import { prisma } from "@/lib/prisma";

const MAX_ITEMS = 100;

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const items = await prisma.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_ITEMS,
  });
  return jsonResponse({ items });
});

export const POST = withApiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");

  const parsed = coverLetterInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Cover letter data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const item = await prisma.coverLetter.create({
    data: { ...parsed.data, userId: user.id },
  });
  return jsonResponse(item, { status: 201 });
});
