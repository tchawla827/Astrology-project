import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-primary">Astri</p>
        <h1 className="mt-2 text-3xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Continue to your chart workspace.</p>
      </div>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/signup">
          Create an account
        </Link>
      </p>
    </main>
  );
}
