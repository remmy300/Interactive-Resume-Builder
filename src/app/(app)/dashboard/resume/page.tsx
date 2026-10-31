import { redirect } from "next/navigation";
import Builder from "@/components/Builder";
import { auth } from "@/lib/auth";

export const metadata = { title: "Resume builder" };

export default async function ResumeBuilderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard/resume");

  return (
    <Builder
      user={{
        email: session.user.email ?? "",
        name: session.user.name,
      }}
    />
  );
}
