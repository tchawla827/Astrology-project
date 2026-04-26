import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { resolvePostAuthPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

function authLink(path: string, next?: string | string[]) {
  const requestedNext = Array.isArray(next) ? next[0] : next;
  if (!requestedNext) {
    return path;
  }
  return `${path}?next=${encodeURIComponent(requestedNext)}`;
}

export default async function LoginPage({
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-primary">Astri</p>
        <h1 className="mt-2 text-3xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Continue to your chart workspace.</p>
      </div>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href={authLink("/signup", searchParams?.next)}>
          Create an account
        </Link>
      </p>
    </main>
  );
}
