import { redirect } from "next/navigation";
import CoverLettersClient from "./CoverLettersClient";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Cover letters" };

export default async function CoverLettersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/cover-letters");
  // Loaded here, in one step, so the page opens with the resume already in it.
  const initial = await preloadResumeLibrary(session.user.id);
  return <CoverLettersClient initial={initial} />;
}
