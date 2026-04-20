import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-primary">Astri</p>
        <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start with a secure Supabase Auth profile.</p>
      </div>
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
