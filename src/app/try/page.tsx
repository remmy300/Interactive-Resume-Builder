import { redirect } from "next/navigation";
import Builder from "@/components/Builder";
import { auth } from "@/lib/auth";

export const metadata = { title: "Resume builder" };

/**
 * The builder without an account. The draft stays in this browser; saving, the
 * PDF, the quality check and import ask for a sign-in.
 */
export default async function TryPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard/resume");
  return <Builder user={null} />;
}
