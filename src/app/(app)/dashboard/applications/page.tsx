import { redirect } from "next/navigation";
import ApplicationsClient from "./ApplicationsClient";
import { auth } from "@/lib/auth";
import { preloadApplications } from "@/lib/career-preload";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/applications");
  const initialItems = await preloadApplications(session.user.id);
  return <ApplicationsClient initialItems={initialItems} />;
}
