import { ChartSnapshotSchema, DerivedFeaturePayloadSchema, type BirthProfile, type Chart, type ChartSnapshot } from "@/lib/schemas";
import { buildDashboardSummary } from "@/lib/insights/themes";

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;

type Query = {
  eq(column: string, value: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
  maybeSingle(): QueryResult;
};

export type SupabaseExportClient = {
  from(table: string): {
    select(columns: string): Query;
  };
};

type BirthProfileRow = BirthProfile & {
  user_id: string;
};

type ChartSnapshotRow = {
  id: string;
  payload: unknown;
  computed_at: string;
};

type DerivedSnapshotRow = {
  payload: unknown;
};

export type BasicReportData = {
  profile: BirthProfileRow;
  snapshot: ChartSnapshot;
  chartSnapshotId: string;
  derivedPayload?: unknown;
};

function errorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

function asProfile(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<BirthProfileRow>;
  return typeof row.id === "string" ? (row as BirthProfileRow) : null;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ChartSnapshotRow>;
  return typeof row.id === "string" ? (row as ChartSnapshotRow) : null;
}

function asDerivedRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value === "object") {
    return value as DerivedSnapshotRow;
  }
  return null;
}

function cleanText(value: string) {
  return value.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "-");
}

function pdfText(value: string) {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function lineWrap(value: string, maxLength = 92) {
  const words = cleanText(value).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

function chartLines(chart: Chart | undefined) {
  if (!chart) {
    return ["Chart unavailable."];
  }
  const byHouse = new Map<number, string[]>();
  for (const planet of chart.planets) {
    const current = byHouse.get(planet.house) ?? [];
    current.push(`${planet.planet} ${planet.sign}`);
    byHouse.set(planet.house, current);
  }
  return chart.houses.map((house) => {
    const planets = byHouse.get(house.house)?.join(", ") ?? "none";
    return `H${house.house}: ${house.sign} (${house.lord}) - ${planets}`;
  });
}

function buildReportLines(data: BasicReportData) {
  const derived = DerivedFeaturePayloadSchema.safeParse(data.derivedPayload);
  const dashboard = buildDashboardSummary(data.snapshot, derived.success ? derived.data : undefined);
  const bundles = derived.success ? derived.data.topic_bundles : undefined;
  const focus = dashboard.focus_cards[0];

  const lines: string[] = [
    "ASTRI BASIC PROFILE REPORT",
    "",
    `Name: ${data.profile.name}`,
    `Birth: ${data.profile.birth_date} ${data.profile.birth_time} (${data.profile.timezone})`,
    `Place: ${data.profile.birth_place_text}`,
    `Birth time confidence: ${data.profile.birth_time_confidence}`,
    "",
    "SUMMARY",
    `Lagna: ${data.snapshot.summary.lagna}`,
    `Moon: ${data.snapshot.summary.moon_sign}`,
    `Nakshatra: ${data.snapshot.summary.nakshatra} pada ${data.snapshot.summary.pada}`,
    `Current dasha: ${data.snapshot.dasha.current_mahadasha.lord} / ${data.snapshot.dasha.current_antardasha.lord}`,
    "",
    "TOP THEMES",
    ...dashboard.top_themes.flatMap((theme) => lineWrap(`- ${theme}`)),
    "",
    "FOCUS INSIGHT",
    ...(focus ? lineWrap(`${focus.title}: ${focus.body}`) : ["No focus insight available."]),
    "",
    "LIFE AREA HEADLINES",
    ...(["personality", "career", "wealth", "relationships"] as const).map((topic) => {
      const headline = bundles?.[topic]?.headline_signals[0] ?? "No headline available.";
      return `${topic}: ${headline}`;
    }),
    "",
    "D1 CHART",
    ...chartLines(data.snapshot.charts.D1),
    "",
    "BHAVA CHART",
    ...chartLines(data.snapshot.charts.Bhava),
    "",
    "MOON CHART",
    ...chartLines(data.snapshot.charts.Moon),
    "",
    "PLANETARY POSITIONS",
    ...data.snapshot.planetary_positions.map(
      (planet) =>
        `${planet.planet}: ${planet.sign} H${planet.house}, ${planet.nakshatra} p${planet.pada}, ${planet.dignity}${
          planet.retrograde ? ", retrograde" : ""
        }${planet.combust ? ", combust" : ""}`,
    ),
    "",
    "CURRENT PERIOD AND TRANSIT HIGHLIGHTS",
    `Mahadasha: ${data.snapshot.dasha.current_mahadasha.lord} ${data.snapshot.dasha.current_mahadasha.start} to ${data.snapshot.dasha.current_mahadasha.end}`,
    `Antardasha: ${data.snapshot.dasha.current_antardasha.lord} ${data.snapshot.dasha.current_antardasha.start} to ${data.snapshot.dasha.current_antardasha.end}`,
    ...data.snapshot.transits.highlights.flatMap((highlight) => lineWrap(`- ${highlight}`)),
  ];

  return lines.flatMap((line) => lineWrap(line));
}

function pageContent(lines: string[]) {
  const chunks: string[] = ["BT", "/F1 10 Tf", "50 760 Td", "14 TL"];
  lines.forEach((line, index) => {
    if (index > 0) {
      chunks.push("T*");
    }
    chunks.push(`(${pdfText(line)}) Tj`);
  });
  chunks.push("ET");
  return chunks.join("\n");
}

export function renderBasicReportPdf(data: BasicReportData) {
  const lines = buildReportLines(data);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) {
    pages.push(lines.slice(index, index + 48));
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageObjectNumbers: number[] = [];

  for (const pageLines of pages) {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    const content = pageContent(pageLines);
    objects.push(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.from(chunks.join(""), "utf8");
}

export async function loadBasicReportData(input: {
  supabase: SupabaseExportClient;
  userId: string;
  profileId?: string;
}): Promise<BasicReportData> {
  let profileQuery = input.supabase
    .from("birth_profiles")
    .select(
      "id,user_id,name,birth_date,birth_time,birth_time_confidence,birth_place_text,latitude,longitude,timezone,ayanamsha,engine_version,status,created_at",
    )
    .eq("user_id", input.userId);
  if (input.profileId) {
    profileQuery = profileQuery.eq("id", input.profileId);
  }
  const { data: profileData, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(errorMessage(profileError, "Could not load birth profile."));
  }
  const profile = asProfile(profileData);
  if (!profile) {
    throw new Error("No birth profile is available for export.");
  }
  if (profile.status !== "ready") {
    throw new Error("Profile generation must be complete before export.");
  }

  const [{ data: chartData, error: chartError }, { data: derivedData }] = await Promise.all([
    input.supabase
      .from("chart_snapshots")
      .select("id,payload,computed_at")
      .eq("birth_profile_id", profile.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("derived_feature_snapshots")
      .select("payload")
      .eq("birth_profile_id", profile.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (chartError) {
    throw new Error(errorMessage(chartError, "Could not load chart snapshot."));
  }
  const chartRow = asChartRow(chartData);
  if (!chartRow) {
    throw new Error("No chart snapshot is available for export.");
  }

  return {
    profile,
    snapshot: ChartSnapshotSchema.parse(chartRow.payload),
    chartSnapshotId: chartRow.id,
    derivedPayload: asDerivedRow(derivedData)?.payload,
  };
}
