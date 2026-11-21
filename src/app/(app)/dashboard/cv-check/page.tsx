import { redirect } from "next/navigation";
import CvCheckClient from "./CvCheckClient";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "CV check" };

export default async function CvCheckPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/cv-check");
  // Loaded here, in one step, so the page opens with the resume already in it.
  const initial = await preloadResumeLibrary(session.user.id);
  return <CvCheckClient initial={initial} />;
}
