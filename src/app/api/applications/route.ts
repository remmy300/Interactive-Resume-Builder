import {
  enforceRateLimit,
  HttpError,
  jsonResponse,
  readJson,
  requireUser,
  withApiHandler,
} from "@/lib/api";
import { applicationInputSchema } from "@/lib/career";
import { parseOptionalDate } from "@/lib/career-server";
import { prisma } from "@/lib/prisma";

const MAX_ITEMS = 200;

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const items = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: [{ updatedAt: "desc" }],
    take: MAX_ITEMS,
  });
  return jsonResponse({ items });
});

export const POST = withApiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "career-write");

  const parsed = applicationInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Application data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { appliedAt, ...rest } = parsed.data;
  const item = await prisma.application.create({
    data: {
      ...rest,
      userId: user.id,
      appliedAt: parseOptionalDate(appliedAt) ?? null,
    },
  });
  return jsonResponse(item, { status: 201 });
});
