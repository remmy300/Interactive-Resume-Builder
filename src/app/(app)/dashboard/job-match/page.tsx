import { redirect } from "next/navigation";
import JobMatchClient from "./JobMatchClient";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Job match" };

export default async function JobMatchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/job-match");
  // Loaded here, in one step, so the page opens with the resume already in it.
  const initial = await preloadResumeLibrary(session.user.id);
  return <JobMatchClient initial={initial} />;
}
