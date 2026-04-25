import { NextResponse, type NextRequest } from "next/server";

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
      redirectTo.pathname = next.startsWith("/") ? next : "/welcome";
      redirectTo.search = "";
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
