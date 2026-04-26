import { NextResponse, type NextRequest } from "next/server";

import { resolvePostAuthPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/welcome";
  const authError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  const redirectTo = new URL(requestUrl);

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const destination = user
        ? await resolvePostAuthPath({
            supabase: supabase as unknown as SupabaseAccountRoutingClient,
            userId: user.id,
            requestedPath: next,
          })
        : next.startsWith("/")
          ? next
          : "/welcome";
      const destinationUrl = new URL(destination, requestUrl.origin);
      redirectTo.pathname = destinationUrl.pathname;
      redirectTo.search = destinationUrl.search;
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.search = "";
  redirectTo.searchParams.set("error", "auth_callback_failed");
  if (authError) {
    redirectTo.searchParams.set("error_description", authError);
  }
  return NextResponse.redirect(redirectTo);
}
