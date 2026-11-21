import { prisma } from "@/lib/prisma";
import { normalizeResumeData, type ResumeData } from "@/lib/resume-schema";

/**
 * Data a page needs to paint on its first render. The pages load it on the
 * server, in one database round trip, so the browser does not have to download
 * the page, then ask for the resume list, then ask for the selected resume.
 */

export interface PreloadedResume {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreloadedRecord extends PreloadedResume {
  data: ResumeData;
}

export interface PreloadedLibrary {
  items: PreloadedResume[];
  /** The resume the page opens with, or null when the user has none (or asked for a new one). */
  record: PreloadedRecord | null;
}

const LIST_LIMIT = 50;

const listSelect = {
  id: true,
  title: true,
  isPublic: true,
  publicSlug: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ListRow = {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toSummary = (row: ListRow): PreloadedResume => ({
  id: row.id,
  title: row.title,
  isPublic: row.isPublic,
  publicSlug: row.publicSlug,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * The signed-in user's resume list and the resume to open first: the requested
 * one if it exists, otherwise the most recently updated. Both queries run at
 * the same time. Pass "new" to open no resume.
 */
export async function preloadResumeLibrary(
  userId: string,
  requestedId?: string | null,
): Promise<PreloadedLibrary> {
  const wantsNone = requestedId === "new";
  const where = { userId, deletedAt: null } as const;

  const [rows, requested, latest] = await Promise.all([
    prisma.resume.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
      select: listSelect,
    }),
    requestedId && !wantsNone
      ? prisma.resume.findFirst({ where: { ...where, id: requestedId } })
      : Promise.resolve(null),
    // The most recent resume is also the first item of the list, so this is
    // the record the client would otherwise have fetched second.
    wantsNone
      ? Promise.resolve(null)
      : prisma.resume.findFirst({ where, orderBy: { updatedAt: "desc" } }),
  ]);

  const target = wantsNone ? null : (requested ?? latest);
  return {
    items: rows.map(toSummary),
    record: target
      ? { ...toSummary(target), data: normalizeResumeData(target.data) }
      : null,
  };
}
