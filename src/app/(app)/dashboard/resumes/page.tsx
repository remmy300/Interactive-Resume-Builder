import { redirect } from "next/navigation";
import ResumesClient from "./ResumesClient";
import { auth } from "@/lib/auth";
import { preloadResumeList } from "@/lib/career-preload";

export const metadata = { title: "My resumes" };

export default async function ResumesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/resumes");
  const initial = await preloadResumeList(session.user.id);
  return <ResumesClient initial={initial} />;
}
