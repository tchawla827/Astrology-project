import { DashboardSummarySchema, PlanetSchema } from "@/lib/schemas";
import type { ChartSnapshot } from "@/lib/astro/client";
import { z } from "zod";

type Planet = z.infer<typeof PlanetSchema>;

export type DashboardFocusCard = {
  id: string;
  title: string;
  body: string;
  why: { charts: string[]; houses: number[]; planets: Planet[] };
};

const dashaTempo: Record<string, string> = {
  Sun: "Visibility, ego tests",
  Moon: "Emotional recalibration",
  Mars: "Pressure, speed, decisive action",
  Mercury: "Skill, trade, communication",
  Jupiter: "Growth and expansion",
  Venus: "Desire, comfort, relationship lessons",
  Saturn: "Work over recognition",
  Rahu: "Ambition, disruption, unusual openings",
  Ketu: "Detachment, refinement, spiritual pruning",
};

const signElements: Record<string, string> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

const lagnaEdges: Record<string, string> = {
  Aries: "Directness is your edge, but impatience costs you leverage",
  Taurus: "Consistency is your edge, but comfort can harden into delay",
  Gemini: "Adaptability is your edge, but scattered focus weakens follow-through",
  Cancer: "Emotional memory is your edge, but defensiveness can narrow choices",
  Leo: "Presence is your edge, but pride must serve the work",
  Virgo: "Precision is your edge, but over-analysis can stall momentum",
  Libra: "Social intelligence is your edge, but pleasing everyone dilutes intent",
  Scorpio: "Depth is your edge, but secrecy can block help",
  Sagittarius: "Conviction is your edge, but blunt certainty needs discipline",
  Capricorn: "Endurance is your edge, but self-pressure can become the cage",
  Aquarius: "Original thinking is your edge, but distance can look like indifference",
  Pisces: "Sensitivity is your edge, but porous boundaries drain clarity",
};

const planets: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

function isPlanet(value: string): value is Planet {
  return planets.includes(value as Planet);
}

function extractPlanets(text: string): Planet[] {
  return planets.filter((planet) => new RegExp(`\\b${planet}\\b`, "i").test(text));
}

function extractHouses(text: string): number[] {
  const houses = new Set<number>();
  const numericMatches = text.matchAll(/\b(1[0-2]|[1-9])(?:st|nd|rd|th)?\s+house\b/gi);
  for (const match of numericMatches) {
    const house = Number(match[1]);
    if (house >= 1 && house <= 12) {
      houses.add(house);
    }
  }
  return [...houses];
}

function uniquePlanets(values: string[]): Planet[] {
  return [...new Set(values.filter(isPlanet))];
}

export function getDashboardThemes(snapshot: ChartSnapshot): string[] {
  const mahadashaLord = snapshot.dasha.current_mahadasha.lord;
  const tempo = dashaTempo[mahadashaLord] ?? `${mahadashaLord} period: timing is the main teacher`;
  const moonElement = signElements[snapshot.summary.moon_sign] ?? "mixed";
  const moonTransit = snapshot.transits.highlights.find((highlight) => /\bmoon\b/i.test(highlight));
  const emotionalWeather = moonTransit
    ? `${snapshot.summary.moon_sign} Moon under transit pressure: ${moonTransit}`
    : `${snapshot.summary.moon_sign} Moon gives ${moonElement} emotional weather`;
  const personalityEdge = lagnaEdges[snapshot.summary.lagna] ?? `${snapshot.summary.lagna} Lagna sets the personality edge`;

  return [tempo, emotionalWeather, personalityEdge];
}

export function buildFallbackFocusCards(snapshot: ChartSnapshot): DashboardFocusCard[] {
  const transitHighlight = snapshot.transits.highlights[0];
  if (transitHighlight) {
    const highlightedPlanets = extractPlanets(transitHighlight);
    const transitPlanet = snapshot.transits.positions.find((placement) => highlightedPlanets.includes(placement.planet as Planet));
    const houses = extractHouses(transitHighlight);
    const fallbackHouse = transitPlanet?.house;

    return [
      {
        id: "transit-focus",
        title: "Current transit focus",
        body: transitHighlight,
        why: {
          charts: ["D1", "Transit"],
          houses: houses.length > 0 ? houses : fallbackHouse ? [fallbackHouse] : [],
          planets: highlightedPlanets.length > 0 ? highlightedPlanets : uniquePlanets(snapshot.transits.positions.slice(0, 1).map((item) => item.planet)),
        },
      },
    ];
  }

  const firstYoga = snapshot.yogas[0];
  if (firstYoga) {
    return [
      {
        id: "yoga-focus",
        title: firstYoga.name,
        body: firstYoga.notes[0] ?? `${firstYoga.name} is active in this snapshot.`,
        why: {
          charts: firstYoga.source_charts.length > 0 ? firstYoga.source_charts : ["D1"],
          houses: [],
          planets: uniquePlanets(snapshot.planetary_positions.slice(0, 2).map((item) => item.planet)),
        },
      },
    ];
  }

  return [
    {
      id: "dasha-focus",
      title: `${snapshot.dasha.current_mahadasha.lord} Mahadasha sets the tempo`,
      body: `${snapshot.dasha.current_antardasha.lord} Antardasha is shaping the current sub-period.`,
      why: {
        charts: ["D1"],
        houses: [],
        planets: uniquePlanets([snapshot.dasha.current_mahadasha.lord, snapshot.dasha.current_antardasha.lord]),
      },
    },
  ];
}

export function buildDashboardSummary(snapshot: ChartSnapshot, derivedPayload?: unknown) {
  const parsedDerived = DashboardSummarySchema.safeParse(
    typeof derivedPayload === "object" && derivedPayload !== null && "dashboard_summary" in derivedPayload
      ? (derivedPayload as { dashboard_summary?: unknown }).dashboard_summary
      : undefined,
  );

  if (parsedDerived.success) {
    return parsedDerived.data;
  }

  return {
    top_themes: getDashboardThemes(snapshot),
    focus_cards: buildFallbackFocusCards(snapshot),
  };
}
