import { describe, expect, it } from "vitest";

import { generateDerivedFeatures } from "@/lib/server/generateDerivedFeatures";
import { DerivedFeaturePayloadSchema } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

describe("generateDerivedFeatures", () => {
  it("stores a derived snapshot for the selected chart snapshot id", async () => {
    const inserts: Array<{ table: string; payload: unknown }> = [];

    const supabase = {
      from(table: string) {
        if (table === "chart_snapshots") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: "snapshot-1", birth_profile_id: "profile-1", payload: goldenSnapshot },
                      error: null,
                    }),
                  };
                },
              };
            },
            insert() {
              throw new Error("chart_snapshots insert should not be called");
            },
          };
        }

        if (table === "birth_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { user_id: "user-1" }, error: null }),
                  };
                },
              };
            },
            insert() {
              throw new Error("birth_profiles insert should not be called");
            },
          };
        }

        if (table === "user_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { onboarding_intent: "career" }, error: null }),
                  };
                },
              };
            },
            insert() {
              throw new Error("user_profiles insert should not be called");
            },
          };
        }

        if (table === "derived_feature_snapshots") {
          return {
            select() {
              throw new Error("derived_feature_snapshots select should not be called");
            },
            insert(payload: unknown) {
              inserts.push({ table, payload });
              return { error: null };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    const payload = await generateDerivedFeatures({
      supabase,
      chartSnapshotId: "snapshot-1",
    });

    expect(DerivedFeaturePayloadSchema.parse(payload)).toBeTruthy();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      table: "derived_feature_snapshots",
      payload: {
        birth_profile_id: "profile-1",
        chart_snapshot_id: "snapshot-1",
        schema_version: "derived_v1",
      },
    });

    const insertedPayload =
      inserts[0] &&
      typeof inserts[0].payload === "object" &&
      inserts[0].payload !== null &&
      "payload" in inserts[0].payload
        ? (inserts[0].payload as { payload: unknown }).payload
        : null;

    expect(insertedPayload).not.toBeNull();
    expect(DerivedFeaturePayloadSchema.parse(insertedPayload)).toBeTruthy();
  });
});
