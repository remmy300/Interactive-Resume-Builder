import Link from "next/link";
import { redirect } from "next/navigation";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { analyzeResume } from "@/lib/ats";
import { auth } from "@/lib/auth";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/career";
import { prisma } from "@/lib/prisma";
import { normalizeResumeData } from "@/lib/resume-schema";
import PageHeader from "@/components/dashboard/PageHeader";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/job-match",
    label: "Tailor to a job",
    description: "Compare a job description with your CV and fix gaps.",
    icon: TravelExploreIcon,
  },
  {
    href: "/dashboard/cv-check",
    label: "Improve my CV",
    description: "See missing information and actionable fixes.",
    icon: FactCheckIcon,
  },
  {
    href: "/dashboard/cover-letters",
    label: "Write a cover letter",
    description: "Draft a letter from your real experience.",
    icon: MailOutlineIcon,
  },
  {
    href: "/dashboard/applications",
    label: "Track an application",
    description: "Keep every application and its status in one place.",
    icon: AssignmentIcon,
  },
  {
    href: "/dashboard/interview",
    label: "Prep for an interview",
    description: "Practise answers to questions based on your CV.",
    icon: QuestionAnswerIcon,
  },
  {
    href: "/dashboard/resume",
    label: "Edit my resume",
    description: "Update content, design, and upload an existing CV.",
    icon: DescriptionIcon,
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard");
  const userId = session.user.id;

  const [resumeCount, latestResume, coverLetterCount, applications, notesCount] =
    await Promise.all([
      prisma.resume.count({ where: { userId, deletedAt: null } }),
      prisma.resume.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, data: true, isPublic: true },
      }),
      prisma.coverLetter.count({ where: { userId } }),
      prisma.application.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.interviewNote.count({ where: { userId } }),
    ]);

  const allApplications = await prisma.application.findMany({
    where: { userId },
    select: { status: true },
  });
  const statusCounts = allApplications.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const report = latestResume ? analyzeResume(normalizeResumeData(latestResume.data)) : null;
  const interviewCount =
    (statusCounts.interview ?? 0) + (statusCounts.offer ?? 0);

  const stats = [
    { label: "Resumes", value: resumeCount, href: "/dashboard/resume" },
    { label: "Applications", value: allApplications.length, href: "/dashboard/applications" },
    { label: "Interviews & offers", value: interviewCount, href: "/dashboard/applications" },
    { label: "Cover letters", value: coverLetterCount, href: "/dashboard/cover-letters" },
    { label: "Interview notes", value: notesCount, href: "/dashboard/interview" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title={`Welcome back${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="Your resume, applications, and interview preparation in one place."
        actions={
          <Link
            href="/dashboard/resume"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open resume builder
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Overview">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
          </Link>
        ))}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Latest resume</h2>
              <p className="mt-1 text-sm text-slate-600">
                {latestResume
                  ? latestResume.title
                  : "No resume yet. Create one or import an existing CV."}
              </p>
            </div>
            {latestResume && (
              <Link
                href="/dashboard/resume"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit
              </Link>
            )}
          </div>

          {report ? (
            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm text-slate-600">ATS readiness</p>
                <p className="text-2xl font-bold text-slate-900">
                  {report.score}
                  <span className="text-sm font-medium text-slate-500">/100</span>
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${report.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {report.passed} checks pass · {report.warnings} to polish ·{" "}
                {report.failed} to fix
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/cv-check"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  See what to fix
                </Link>
                <Link
                  href="/dashboard/job-match"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tailor to a job
                </Link>
              </div>
            </div>
          ) : (
            <Link
              href="/dashboard/resume"
              className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create your first resume
            </Link>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Recent applications</h2>
            <Link
              href="/dashboard/applications"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              View all
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Nothing tracked yet. Add your first application.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {applications.map((application) => (
                <li key={application.id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-900">
                    {application.role}
                  </p>
                  <p className="text-xs text-slate-500">{application.company}</p>
                  <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {APPLICATION_STATUS_LABELS[
                      application.status as ApplicationStatus
                    ] ?? application.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-5">
        <h2 className="text-base font-semibold text-slate-900">Career tools</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon fontSize="small" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
