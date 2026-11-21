import { redirect } from "next/navigation";
import InterviewClient from "./InterviewClient";
import { auth } from "@/lib/auth";
import { preloadInterviewNotes } from "@/lib/career-preload";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Interview prep" };

export default async function InterviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/interview");
  const userId = session.user.id;
  // The resume and the saved notes are read together, in one step.
  const [initial, initialNotes] = await Promise.all([
    preloadResumeLibrary(userId),
    preloadInterviewNotes(userId),
  ]);
  return <InterviewClient initial={initial} initialNotes={initialNotes} />;
}
