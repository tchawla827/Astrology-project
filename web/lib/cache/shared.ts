export type DbError = { message: string } | Error;

export type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;
export type MutationResult = PromiseLike<{ error: DbError | null }>;

export type SupabaseCacheQuery = {
  eq(column: string, value: string | number): SupabaseCacheQuery;
  gt(column: string, value: string): SupabaseCacheQuery;
  order(column: string, options: { ascending: boolean }): SupabaseCacheQuery;
  limit(count: number): SupabaseCacheQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseCacheClient = {
  from(table: string): {
    select(columns: string): SupabaseCacheQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): MutationResult;
  };
};

export type ComputedPayloadRow = {
  payload: unknown;
  computed_at: string;
};

export function asComputedPayloadRow<T extends ComputedPayloadRow = ComputedPayloadRow>(
  value: unknown,
): T | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<T>;
  return typeof row.computed_at === "string" ? (row as T) : null;
}

export function cacheErrorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

export function roundedCacheCoordinate(value: number) {
  return Number(value.toFixed(2));
}
