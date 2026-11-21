import { prisma } from "@/lib/prisma";
import type {
  ApplicationRecord,
  ApplicationStatus,
  CoverLetterRecord,
  InterviewCategory,
  InterviewNoteRecord,
} from "@/lib/career";
import type { PreloadedResume } from "@/lib/resume-preload";

/**
 * The lists the career pages show. They are read on the server so each page
 * opens with its list already filled in, instead of asking for it afterwards.
 * Limits and ordering match the matching API routes, so a page looks the same
 * whether it was preloaded or fetched.
 */

const APPLICATION_LIMIT = 200;
const COVER_LETTER_LIMIT = 100;
const INTERVIEW_NOTE_LIMIT = 200;
const RESUME_LIST_LIMIT = 100;

const iso = (value: Date) => value.toISOString();

export async function preloadApplications(
  userId: string,
): Promise<ApplicationRecord[]> {
  const rows = await prisma.application.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    take: APPLICATION_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationStatus,
    url: row.url,
    notes: row.notes,
    appliedAt: row.appliedAt ? iso(row.appliedAt) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }));
}

export async function preloadCoverLetters(
  userId: string,
): Promise<CoverLetterRecord[]> {
  const rows = await prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: COVER_LETTER_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    role: row.role,
    content: row.content,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }));
}

export async function preloadInterviewNotes(
  userId: string,
): Promise<InterviewNoteRecord[]> {
  const rows = await prisma.interviewNote.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: INTERVIEW_NOTE_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category as InterviewCategory,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }));
}

export interface PreloadedResumeList {
  items: PreloadedResume[];
  total: number;
}

/** The "My resumes" page: the first page of live resumes and how many there are. */
export async function preloadResumeList(
  userId: string,
): Promise<PreloadedResumeList> {
  const where = { userId, deletedAt: null } as const;
  const [rows, total] = await Promise.all([
    prisma.resume.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: RESUME_LIST_LIMIT,
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
  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      isPublic: row.isPublic,
      publicSlug: row.publicSlug,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
  };
}
