import { redirect } from "next/navigation";
import CoverLettersClient from "./CoverLettersClient";
import { auth } from "@/lib/auth";
import { preloadCoverLetters } from "@/lib/career-preload";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Cover letters" };

export default async function CoverLettersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/cover-letters");
  const userId = session.user.id;
  // The resume and the saved letters are read together, in one step.
  const [initial, initialLetters] = await Promise.all([
    preloadResumeLibrary(userId),
    preloadCoverLetters(userId),
  ]);
  return (
    <CoverLettersClient initial={initial} initialLetters={initialLetters} />
  );
}
