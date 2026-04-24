import type { ChartKey } from "@/lib/schemas";

export const SUPPORTED_CHART_KEYS = [
  "D1",
  "Bhava",
  "Moon",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "D16",
  "D20",
  "D24",
  "D27",
  "D30",
  "D40",
  "D45",
  "D60",
] as const;

export type SupportedChartKey = (typeof SUPPORTED_CHART_KEYS)[number];

export const CHART_GROUPS: Array<{ title: string; description: string; keys: SupportedChartKey[] }> = [
  {
    title: "Base views",
    description: "Natal, house-adjusted, and Moon-lagna perspectives.",
    keys: ["D1", "Bhava", "Moon"],
  },
  {
    title: "Classical divisional charts",
    description: "The main varga catalog for detailed life-area inspection.",
    keys: ["D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"],
  },
  {
    title: "Common extras",
    description: "Useful supplemental divisions included in this snapshot.",
    keys: ["D5", "D6", "D8", "D11"],
  },
];

export const CHART_LABELS: Record<SupportedChartKey, string> = {
  D1: "Rashi",
  Bhava: "Bhava",
  Moon: "Moon",
  D2: "Hora",
  D3: "Drekkana",
  D4: "Chaturthamsha",
  D5: "Panchamsha",
  D6: "Shashthamsha",
  D7: "Saptamsha",
  D8: "Ashtamsha",
  D9: "Navamsha",
  D10: "Dashamsha",
  D11: "Rudramsha",
  D12: "Dwadashamsha",
  D16: "Shodashamsha",
  D20: "Vimshamsha",
  D24: "Chaturvimshamsha",
  D27: "Bhamsha",
  D30: "Trimshamsha",
  D40: "Khavedamsha",
  D45: "Akshavedamsha",
  D60: "Shashtiamsha",
};

export function isSupportedChartKey(value: string): value is SupportedChartKey {
  return (SUPPORTED_CHART_KEYS as readonly string[]).includes(value);
}

export function chartTitle(key: ChartKey | SupportedChartKey) {
  return `${key} ${CHART_LABELS[key as SupportedChartKey] ?? "Chart"}`;
}
