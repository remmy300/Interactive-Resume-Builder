import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { next } = await searchParams;
  // Only allow same-origin paths as a post-login destination.
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return <LoginForm redirectTo={redirectTo} />;
}
