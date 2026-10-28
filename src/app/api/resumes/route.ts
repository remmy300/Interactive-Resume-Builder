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
import {
  normalizeResumeData,
  saveResumeSchema,
  type ResumeData,
} from "@/lib/resume-schema";

const LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

export const GET = withApiHandler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const take = Math.min(
    MAX_LIST_LIMIT,
    Math.max(1, Number(url.searchParams.get("take") ?? LIST_LIMIT) || LIST_LIMIT),
  );
  const skip = Math.max(0, Number(url.searchParams.get("skip") ?? 0) || 0);

  const where: Prisma.ResumeWhereInput = {
    userId: user.id,
    deletedAt: null,
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.resume.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        title: true,
        isPublic: true,
        publicSlug: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.resume.count({ where }),
  ]);

  return jsonResponse({
    items,
    total,
    nextSkip: skip + items.length < total ? skip + items.length : null,
  });
});

export const POST = withApiHandler(async (request) => {
  const user = await requireUser();
  enforceRateLimit(user.id, "resume-write");

  const parsed = saveResumeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Resume data is invalid.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      data: parsed.data.data as Prisma.InputJsonValue,
      schemaVersion: 1,
    },
  });

  return jsonResponse(
    {
      ...resume,
      data: normalizeResumeData(resume.data) satisfies ResumeData,
    },
    { status: 201 },
  );
});
