import { NextResponse } from "next/server";
import { enforceRateLimit, requireUser, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { normalizeResumeData } from "@/lib/resume-schema";

/** Downloads everything the app stores about the signed-in user. */
export const GET = withApiHandler(async () => {
  const user = await requireUser();
  enforceRateLimit(user.id, "account-export", 5);

  const [record, resumes, coverLetters, applications, interviewNotes] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.resume.findMany({
        where: { userId: user.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.coverLetter.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.application.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.interviewNote.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: record,
    resumes: resumes.map((resume) => ({
      ...resume,
      data: normalizeResumeData(resume.data),
    })),
    coverLetters,
    applications,
    interviewNotes,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="resume-studio-export.json"',
      "Cache-Control": "no-store",
    },
  });
});
