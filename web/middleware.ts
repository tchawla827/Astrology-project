import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { track } from "@/lib/analytics/events";
import { checkAskQuota, type SupabaseAskQuotaClient } from "@/lib/quotas/askQuota";
import { checkDailyQuota, type SupabaseDailyQuotaClient } from "@/lib/quotas/dailyQuota";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

const protectedRoutes = [
  "/dashboard",
  "/charts",
  "/life-areas",
  "/ask",
  "/daily",
  "/panchang",
  "/pricing",
  "/profile",
  "/welcome",
  "/intent",
  "/confidence",
  "/birth-details",
  "/generating",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const isAskApi = request.nextUrl.pathname === "/api/ask" && request.method === "POST";
  const isDailyApi = request.nextUrl.pathname === "/api/daily" && request.method === "GET";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isProtectedRoute && (!supabaseUrl || !supabaseAnonKey)) {
    return response;
  }

  if (isProtectedRoute && (!supabaseUrl || !supabaseAnonKey)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((isAskApi || isDailyApi) && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAskApi && user) {
    try {
      const quota = await checkAskQuota({ supabase: supabase as unknown as SupabaseAskQuotaClient, userId: user.id });
      if (!quota.allowed) {
        await track(supabase, "ask_quota_hit", { used: quota.used, limit: quota.limit }, user.id);
        return NextResponse.json(
          {
            error: "Free accounts include 5 Ask questions per month.",
            reason: quota.reason,
            upgrade_url: quota.upgrade_url,
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
          },
          { status: 402 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not check Ask quota." },
        { status: 500 },
      );
    }
  }

  if (isDailyApi && user) {
    const date = request.nextUrl.searchParams.get("date") ?? "today";
    try {
      const quota = await checkDailyQuota({
        supabase: supabase as unknown as SupabaseDailyQuotaClient,
        userId: user.id,
        date,
      });
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: "Free accounts include today and the next 7 days for daily predictions.",
            reason: quota.reason,
            upgrade_url: quota.upgrade_url,
            date_offset_days: quota.date_offset_days,
            max_future_days: quota.max_future_days,
          },
          { status: 402 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not check daily quota." },
        { status: 500 },
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
