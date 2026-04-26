type ProfileStatus = "processing" | "ready" | "error";

type RoutingProfileRow = {
  id: string;
  status: ProfileStatus;
};

type RoutingQuery = {
  eq(column: string, value: string): RoutingQuery;
  order(column: string, options: { ascending: boolean }): RoutingQuery;
  limit(count: number): RoutingQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type SupabaseAccountRoutingClient = {
  from(table: string): {
    select(columns: string): RoutingQuery;
  };
};

const onboardingRoutes = new Set(["/welcome", "/intent", "/confidence", "/birth-details"]);
const authRoutes = new Set(["/login", "/signup", "/auth/callback"]);

function asRoutingProfile(data: unknown): RoutingProfileRow | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Partial<RoutingProfileRow>;
  if (
    typeof row.id !== "string" ||
    (row.status !== "processing" && row.status !== "ready" && row.status !== "error")
  ) {
    return null;
  }

  return { id: row.id, status: row.status };
}

function pathnameOf(path: string) {
  return path.split("?")[0] ?? path;
}

export function isReplaceMode(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.includes("1");
  }
  return value === "1";
}

export function withReplaceMode(path: string, replaceMode: boolean) {
  return replaceMode ? `${path}?new=1` : path;
}

export function normalizeRelativePath(path: string | null | undefined) {
  if (!path || !path.startsWith("/")) {
    return null;
  }

  try {
    const url = new URL(path, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export async function resolveSignedInPath(
  supabase: SupabaseAccountRoutingClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("birth_profiles")
    .select("id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const profile = asRoutingProfile(data);
  if (!profile) {
    return "/welcome";
  }

  if (profile.status === "processing") {
    return `/generating?id=${profile.id}`;
  }

  return "/dashboard";
}

export async function resolvePostAuthPath(input: {
  supabase: SupabaseAccountRoutingClient;
  userId: string;
  requestedPath?: string | null;
}) {
  const normalizedPath = normalizeRelativePath(input.requestedPath);
  if (normalizedPath) {
    const pathname = pathnameOf(normalizedPath);
    if (!onboardingRoutes.has(pathname) && !authRoutes.has(pathname)) {
      return normalizedPath;
    }
  }

  return resolveSignedInPath(input.supabase, input.userId);
}
