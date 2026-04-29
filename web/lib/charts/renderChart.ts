import type { Aspect, Chart, ChartSnapshot, Planet, PlanetInChart, PlanetPlacement } from "@/lib/schemas";

export type ChartPoint = { x: number; y: number };
export type RenderedPlanet = PlanetInChart & {
  abbreviation: string;
  label: string;
  point: ChartPoint;
  technicalDetails?: PlanetPlacement;
};
export type RenderedHouse = {
  house: number;
  sign: string;
  lord: Planet;
  point: ChartPoint;
};
export type RenderedChart = {
  chart: Chart;
  houses: RenderedHouse[];
  planets: RenderedPlanet[];
};

const PLANET_ABBREVIATIONS: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

export const NORTH_HOUSE_POINTS: Record<number, ChartPoint> = {
  1: { x: 50, y: 19 },
  2: { x: 28, y: 28 },
  3: { x: 19, y: 50 },
  4: { x: 28, y: 72 },
  5: { x: 50, y: 82 },
  6: { x: 72, y: 72 },
  7: { x: 82, y: 50 },
  8: { x: 72, y: 28 },
  9: { x: 50, y: 40 },
  10: { x: 40, y: 50 },
  11: { x: 50, y: 60 },
  12: { x: 60, y: 50 },
};

export const SOUTH_SIGN_POINTS: Record<string, ChartPoint> = {
  Aries: { x: 12.5, y: 12.5 },
  Taurus: { x: 37.5, y: 12.5 },
  Gemini: { x: 62.5, y: 12.5 },
  Cancer: { x: 87.5, y: 12.5 },
  Leo: { x: 87.5, y: 37.5 },
  Virgo: { x: 87.5, y: 62.5 },
  Libra: { x: 87.5, y: 87.5 },
  Scorpio: { x: 62.5, y: 87.5 },
  Sagittarius: { x: 37.5, y: 87.5 },
  Capricorn: { x: 12.5, y: 87.5 },
  Aquarius: { x: 12.5, y: 62.5 },
  Pisces: { x: 12.5, y: 37.5 },
};

function pointForHouse(house: number) {
  return NORTH_HOUSE_POINTS[house] ?? { x: 50, y: 50 };
}

function pointForSign(sign: string, fallbackHouse: number) {
  return SOUTH_SIGN_POINTS[sign] ?? pointForHouse(fallbackHouse);
}

function offsetPoint(point: ChartPoint, index: number, total: number): ChartPoint {
  if (total <= 1) {
    return point;
  }
  const spread = 3.8;
  const offset = (index - (total - 1) / 2) * spread;
  return { x: point.x + offset, y: point.y + Math.abs(offset) * 0.24 };
}

function planetLabel(planet: PlanetInChart, natal?: PlanetPlacement) {
  const abbreviation = PLANET_ABBREVIATIONS[planet.planet] ?? planet.planet.slice(0, 2);
  return `${abbreviation}${planet.retrograde ?? natal?.retrograde ? "(R)" : ""}`;
}

export function chartSupportsNatalTechnicalDetails(key: string) {
  return key === "D1" || key === "Bhava" || key === "Moon";
}

export function chartHasPlanetTechnicalDetails(chart: Chart) {
  return chart.planets.some((planet) => typeof planet.longitude_deg === "number" || typeof planet.dignity === "string");
}

export function yogaInvolvesPlanet(yoga: { planets_involved?: Planet[] }, planet: Planet) {
  return yoga.planets_involved?.includes(planet) ?? false;
}

export function renderChart(snapshot: ChartSnapshot, key: string, style: "north" | "south" = "north"): RenderedChart | null {
  const chart = snapshot.charts[key];
  if (!chart) {
    return null;
  }
  const supportsTechnicalDetails = chartSupportsNatalTechnicalDetails(key);

  const planetsByHouse = new Map<number, PlanetInChart[]>();
  const planetsBySign = new Map<string, PlanetInChart[]>();
  chart.planets.forEach((planet) => {
    planetsByHouse.set(planet.house, [...(planetsByHouse.get(planet.house) ?? []), planet]);
    planetsBySign.set(planet.sign, [...(planetsBySign.get(planet.sign) ?? []), planet]);
  });

  return {
    chart,
    houses: chart.houses.map((house) => ({
      ...house,
      point: style === "south" ? pointForSign(house.sign, house.house) : pointForHouse(house.house),
    })),
    planets: chart.planets.map((planet) => {
      const group = style === "south" ? planetsBySign.get(planet.sign) ?? [] : planetsByHouse.get(planet.house) ?? [];
      const index = group.findIndex((item) => item.planet === planet.planet);
      const base = style === "south" ? pointForSign(planet.sign, planet.house) : pointForHouse(planet.house);
      const technicalDetails = supportsTechnicalDetails
        ? snapshot.planetary_positions.find((placement) => placement.planet === planet.planet && placement.sign === planet.sign)
        : undefined;
      const label = planetLabel(planet, technicalDetails);
      return {
        ...planet,
        abbreviation: PLANET_ABBREVIATIONS[planet.planet] ?? planet.planet.slice(0, 2),
        label,
        point: offsetPoint(base, index, group.length),
        technicalDetails,
      };
    }),
  };
}

export function aspectsForPlanet(aspects: Aspect[], planet: Planet) {
  return aspects.filter((aspect) => aspect.from === planet || aspect.to === planet);
}

export function aspectsIntoHouse(aspects: Aspect[], house: number) {
  return aspects.filter((aspect) => aspect.to === house);
}
