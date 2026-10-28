import { redirect } from "next/navigation";
import Builder from "@/components/Builder";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Builder
      user={{
        email: session.user.email ?? "",
        name: session.user.name,
      }}
    />
  );
}
