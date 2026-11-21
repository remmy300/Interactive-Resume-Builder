import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { auth } from "@/lib/auth";
import { preloadResumeLibrary } from "@/lib/resume-preload";

export const metadata = { title: "Profile & sharing" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/profile");
  // Loaded here, in one step, so the page opens with the resume already in it.
  const initial = await preloadResumeLibrary(session.user.id);
  return <ProfileClient initial={initial} />;
}
