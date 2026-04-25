import { describe, expect, it, vi } from "vitest";

import { resolvePlace } from "@/lib/server/resolvePlace";

describe("resolvePlace", () => {
  it("maps Nominatim results to resolved places and filters invalid coordinates", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify([
          {
            place_id: 1,
            display_name: "Panipat, Haryana, India",
            lat: "29.3909",
            lon: "76.9635",
            addresstype: "city",
          },
          {
            place_id: 2,
            display_name: "India",
            lat: "20.5937",
            lon: "78.9629",
            addresstype: "country",
          },
          {
            place_id: 3,
            display_name: "Broken place",
            lat: "not-a-number",
            lon: "76.9635",
          },
        ]),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const places = await resolvePlace("Panipat", {
      endpoint: "https://nominatim.test/search-resolve-place",
      fetcher,
      userAgent: "Astri test",
    });

    expect(places).toEqual([
      {
        id: "1",
        label: "Panipat, Haryana, India",
        latitude: 29.3909,
        longitude: 76.9635,
        timezone: "Asia/Kolkata",
        warning: undefined,
      },
      {
        id: "2",
        label: "India",
        latitude: 20.5937,
        longitude: 78.9629,
        timezone: "Asia/Kolkata",
        warning: "This is a broad country-level match. Choose a city when possible.",
      },
    ]);
  });
});
