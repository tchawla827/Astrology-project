import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { AuthForm } from "@/components/auth/AuthForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePostAuthPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

function authLink(path: string, next?: string | string[]) {
  const requestedNext = Array.isArray(next) ? next[0] : next;
  if (!requestedNext) {
    return path;
  }
  return `${path}?next=${encodeURIComponent(requestedNext)}`;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: { next?: string | string[] };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestedNext = Array.isArray(searchParams?.next) ? searchParams?.next[0] : searchParams?.next;

  if (user) {
    redirect(
      await resolvePostAuthPath({
        supabase: supabase as unknown as SupabaseAccountRoutingClient,
        userId: user.id,
        requestedPath: requestedNext,
      }),
    );
  }

  return (
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_28rem] lg:items-center">
        <section className="hidden max-w-2xl lg:block">
          <Link className="font-display text-4xl font-semibold text-primary" href="/">
            Astri
          </Link>
          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-primary">Begin the observatory</p>
          <h1 className="mt-5 font-display text-6xl font-semibold leading-tight text-glow">Generate a private chart room.</h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Create the account first, then add birth details once so Astri can build your structured Vedic snapshot.
          </p>
        </section>

        <Card className="luxury-panel">
          <CardHeader className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-primary">Astri</p>
              <CardTitle className="mt-2 text-3xl">Create your account</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Start with a secure Supabase Auth profile.</p>
            </div>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signup" />
            <p className="mt-6 text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href={authLink("/login", searchParams?.next)}>
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
