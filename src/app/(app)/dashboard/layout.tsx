import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <DashboardShell
      user={{
        email: session.user.email ?? "",
        name: session.user.name,
      }}
    >
      {children}
    </DashboardShell>
  );
}
