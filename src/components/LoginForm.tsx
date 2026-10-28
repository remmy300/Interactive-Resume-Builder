"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import GoogleIcon from "@mui/icons-material/Google";

interface LoginFormProps {
  redirectTo?: string;
}

const highlights = [
  "Live A4 preview with three templates",
  "Autosaved, private resumes tied to your account",
  "Text-based PDFs that applicant tracking systems can read",
];

export default function LoginForm({ redirectTo = "/" }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await signIn("google", { redirectTo });
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between gap-8 bg-slate-900 p-8 text-white md:flex">
          <div>
            <p className="text-lg font-bold">Resume Studio</p>
            <h1 className="mt-6 text-3xl font-bold leading-tight">
              Build a resume that gets past the robots.
            </h1>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            Your data stays private to your account. Export or delete it whenever
            you want.
          </p>
        </section>

        <section className="space-y-5 p-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-600">
              Continue with Google to create and save private resumes.
            </p>
          </div>

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            disabled={isSubmitting}
            fullWidth
            onClick={() => void handleGoogleSignIn()}
          >
            {isSubmitting ? "Redirecting to Google…" : "Continue with Google"}
          </Button>

          <p className="text-xs text-slate-500">
            We only store your name, email, and the resumes you create.
          </p>
        </section>
      </div>
    </main>
  );
}
