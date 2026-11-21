import { redirect } from "next/navigation";
import Builder from "@/components/Builder";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Resume builder" };

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const { resume } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/resume");

  // The list and the opened resume are read together, so the editor does not
  // have to ask for them after the page arrives.
  const initial = await preloadResumeLibrary(session.user.id, resume);

  return (
    <Builder
      initialResumeId={resume ?? null}
      initial={initial}
      user={{
        email: session.user.email ?? "",
        name: session.user.name,
      }}
    />
  );
}
