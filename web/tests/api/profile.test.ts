import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/profile/route";
import { GET } from "@/app/api/profile/[id]/route";

const generateProfileForBirthProfile = vi.fn();
const normalizeProfileSubmission = vi.fn();
const createClient = vi.fn();

vi.mock("@/lib/server/generateProfile", () => ({
  generateProfileForBirthProfile: (...args: unknown[]) => generateProfileForBirthProfile(...args),
}));

vi.mock("@/lib/server/profileIntake", () => ({
  normalizeProfileSubmission: (...args: unknown[]) => normalizeProfileSubmission(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

describe("/api/profile routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on POST when user is missing", async () => {
    createClient.mockReturnValueOnce({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("writes analytics and returns 202 when generation fails", async () => {
    normalizeProfileSubmission.mockReturnValueOnce({
      success: true,
      data: {
        name: "Astri User",
        birth_date: "1995-06-07",
        birth_time: "23:54:00",
        birth_time_confidence: "exact",
        birth_place_text: "Panipat, Haryana, India",
        latitude: 29.3909,
        longitude: 76.9635,
        timezone: "Asia/Kolkata",
        ayanamsha: "lahiri",
        onboarding_intent: "full-chart",
      },
    });
    generateProfileForBirthProfile.mockRejectedValueOnce(new Error("engine offline"));

    const userProfilesEq = vi.fn(async () => ({ error: null }));
    const birthInsertSingle = vi.fn(async () => ({ data: { id: "profile-1" }, error: null }));
    const analyticsInsert = vi.fn(async () => ({ error: null }));

    createClient.mockReturnValueOnce({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: (table: string) => {
        if (table === "user_profiles") {
          return {
            update: () => ({ eq: userProfilesEq }),
          };
        }
        if (table === "birth_profiles") {
          return {
            insert: () => ({ select: () => ({ single: birthInsertSingle }) }),
          };
        }
        if (table === "analytics_events") {
          return {
            insert: analyticsInsert,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });
    createClient.mockReturnValueOnce({
      from: (table: string) => {
        if (table === "analytics_events") {
          return {
            insert: analyticsInsert,
          };
        }
        throw new Error(`Unexpected background table ${table}`);
      },
    });

    const response = await POST(
      new Request("http://localhost/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anything: true }),
      }),
    );
    const body = (await response.json()) as { birth_profile_id?: string };

    expect(response.status).toBe(202);
    expect(body.birth_profile_id).toBe("profile-1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(analyticsInsert).toHaveBeenCalledOnce();
  });

  it("returns 404 on GET when profile is not owned by caller", async () => {
    createClient.mockReturnValueOnce({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const response = await GET({} as never, { params: { id: "profile-1" } });

    expect(response.status).toBe(404);
  });
});
