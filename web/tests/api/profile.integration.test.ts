import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const hasIntegrationEnv = Boolean(supabaseUrl && serviceRoleKey);
const mockedCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockedCreateClient(),
}));

const describeIntegration = hasIntegrationEnv ? describe : describe.skip;

describeIntegration("/api/profile integration (Supabase test project)", () => {
  let admin: SupabaseClient | null = null;
  const userIds: string[] = [];
  const createdProfileIds: string[] = [];

  beforeAll(async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      return;
    }
    admin = createSupabaseClient(supabaseUrl, serviceRoleKey);

    const firstEmail = `phase2-owner-${Date.now()}@example.test`;
    const secondEmail = `phase2-other-${Date.now()}@example.test`;

    const ownerResult = await admin.auth.admin.createUser({
      email: firstEmail,
      email_confirm: true,
      password: "test-password-1",
    });
    if (ownerResult.error || !ownerResult.data.user) {
      throw ownerResult.error ?? new Error("Could not create owner user.");
    }

    const otherResult = await admin.auth.admin.createUser({
      email: secondEmail,
      email_confirm: true,
      password: "test-password-2",
    });
    if (otherResult.error || !otherResult.data.user) {
      throw otherResult.error ?? new Error("Could not create other user.");
    }

    userIds.push(ownerResult.data.user.id, otherResult.data.user.id);

    const inserted = await admin
      .from("birth_profiles")
      .insert({
        user_id: ownerResult.data.user.id,
        name: "Integration Owner",
        birth_date: "1995-05-16",
        birth_time: "12:00:00",
        birth_time_confidence: "exact",
        birth_place_text: "Panipat, Haryana, India",
        latitude: 29.3909,
        longitude: 76.9635,
        timezone: "Asia/Kolkata",
        ayanamsha: "lahiri",
        engine_version: "astro_engine_v1",
        status: "ready",
      })
      .select("id")
      .single();

    if (inserted.error || !inserted.data) {
      throw inserted.error ?? new Error("Could not insert birth profile.");
    }

    createdProfileIds.push(inserted.data.id);
  });

  afterAll(async () => {
    if (!admin) {
      return;
    }
    const integrationAdmin = admin;
    if (createdProfileIds.length > 0) {
      await integrationAdmin.from("birth_profiles").delete().in("id", createdProfileIds);
    }

    await Promise.all(userIds.map(async (userId) => integrationAdmin.auth.admin.deleteUser(userId)));
  });

  it("returns 404 when caller does not own the birth profile", async () => {
    if (!admin) {
      throw new Error("Missing integration Supabase client.");
    }
    const integrationAdmin = admin;
    const profileId = createdProfileIds[0];
    if (!profileId) {
      throw new Error("Missing seeded profile id.");
    }

    mockedCreateClient.mockReturnValueOnce({
      auth: {
        getUser: async () => ({ data: { user: { id: userIds[1] } } }),
      },
      from: (table: string) => integrationAdmin.from(table),
    });

    const { GET } = await import("@/app/api/profile/[id]/route");

    const response = await GET({} as never, { params: { id: profileId } });

    expect(response.status).toBe(404);
  });

  it("creates matching user_profiles rows through the auth trigger", async () => {
    if (!admin) {
      throw new Error("Missing integration Supabase client.");
    }

    const integrationAdmin = admin;
    const rows = await integrationAdmin.from("user_profiles").select("id,email").in("id", userIds);

    expect(rows.error).toBeNull();
    expect(rows.data?.map((row) => row.id).sort()).toEqual([...userIds].sort());
    expect(rows.data?.every((row) => typeof row.email === "string" && row.email.length > 0)).toBe(true);
  });

  it("returns the owned birth profile to the caller", async () => {
    if (!admin) {
      throw new Error("Missing integration Supabase client.");
    }
    const integrationAdmin = admin;
    const profileId = createdProfileIds[0];
    if (!profileId) {
      throw new Error("Missing seeded profile id.");
    }

    mockedCreateClient.mockReturnValueOnce({
      auth: {
        getUser: async () => ({ data: { user: { id: userIds[0] } } }),
      },
      from: (table: string) => integrationAdmin.from(table),
    });

    const { GET } = await import("@/app/api/profile/[id]/route");

    const response = await GET({} as never, { params: { id: profileId } });
    const body = (await response.json()) as { profile?: { id?: string; status?: string } };

    expect(response.status).toBe(200);
    expect(body.profile?.id).toBe(profileId);
    expect(body.profile?.status).toBe("ready");
  });
});
