import { redirect } from "next/navigation";
import Builder from "@/components/Builder";
import { auth } from "@/lib/auth";

export const metadata = { title: "Resume builder" };

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const { resume } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/resume");

  return (
    <Builder
      initialResumeId={resume ?? null}
      user={{
        email: session.user.email ?? "",
        name: session.user.name,
      }}
    />
  );
}
