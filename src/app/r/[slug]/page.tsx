import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import ResumePreview from "@/components/preview/ResumePreview";
import { prisma } from "@/lib/prisma";
import { normalizeResumeData } from "@/lib/resume-schema";

export const dynamic = "force-dynamic";

interface PublicResumePageProps {
  params: Promise<{ slug: string }>;
}

async function findResume(slug: string) {
  return prisma.resume.findFirst({
    where: { publicSlug: slug, isPublic: true, deletedAt: null },
    select: { title: true, data: true },
  });
}

export async function generateMetadata({
  params,
}: PublicResumePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resume = await findResume(slug);
  if (!resume) return { title: "Resume not found" };

  const data = normalizeResumeData(resume.data);
  return {
    title: data.personal.name ? `${data.personal.name} — Resume` : resume.title,
    robots: { index: false, follow: false },
  };
}

export default async function PublicResumePage({ params }: PublicResumePageProps) {
  const { slug } = await params;
  const resume = await findResume(slug);
  if (!resume) notFound();

  const data = normalizeResumeData(resume.data);

  return (
    <main className="public-shell min-h-screen bg-slate-100 py-6 sm:py-8">
      <div className="screen-only mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{resume.title}</p>
          <p className="text-xs text-slate-500">Shared read-only resume</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link
            href="/"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Build your own
          </Link>
        </div>
      </div>

      <div className="mx-auto w-fit max-w-full overflow-auto px-2 pb-6">
        <ResumePreview data={data} />
      </div>
    </main>
  );
}
