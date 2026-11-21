import { redirect } from "next/navigation";
import InterviewClient from "./InterviewClient";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Interview prep" };

export default async function InterviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/interview");
  // Loaded here, in one step, so the page opens with the resume already in it.
  const initial = await preloadResumeLibrary(session.user.id);
  return <InterviewClient initial={initial} />;
}
