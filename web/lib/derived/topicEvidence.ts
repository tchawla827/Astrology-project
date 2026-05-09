import {
  TopicEvidenceSchema,
  type ChartSnapshot,
  type Planet,
  type Topic,
  type TopicBundle,
  type TopicEvidence,
  type TopicEvidenceCollection,
  type TopicEvidenceCitation,
  type TopicEvidenceFactor,
  type TopicEvidenceTimingFactor,
} from "@/lib/schemas";
import { lordOfHouse, ordinal, topicTitles } from "@/lib/derived/shared";

const careerHouses = [2, 6, 10, 11];
const frictionHouses = new Set([6, 8, 12]);
const strongDignities = new Set(["exalted", "moolatrikona", "own", "friendly"]);
const weakDignities = new Set(["enemy", "debilitated"]);

const careerHouseThemes: Record<number, string> = {
  1: "self-directed work, personal initiative, and roles where identity matters",
  2: "income, accumulated skill, speech, family values, and resource-building",
  3: "communication, courage, writing, sales, media, and self-effort",
  4: "stability, property, education, operations, and work tied to foundations",
  5: "intelligence, creativity, teaching, strategy, and advisory judgment",
  6: "service, competition, problem-solving, routines, and operational pressure",
  7: "clients, partnerships, business-facing work, and public dealing",
  8: "research, crisis management, hidden complexity, risk, and transformation",
  9: "guidance, higher knowledge, teaching, law, ethics, and long-range direction",
  10: "public role, responsibility, authority, output, and professional reputation",
  11: "networks, gains, audience, teams, and scale",
  12: "foreign links, behind-the-scenes work, isolation, institutions, and release",
};

const planetCareerLanguage: Record<Planet, string> = {
  Sun: "authority, visibility, leadership, and dealing with senior figures",
  Moon: "public responsiveness, care, adaptability, and emotional steadiness at work",
  Mars: "execution, competition, engineering, conflict handling, and decisive action",
  Mercury: "analysis, trade, writing, communication, systems, and technical skill",
  Jupiter: "guidance, teaching, counsel, judgment, and growth through knowledge",
  Venus: "design, comfort, relationship management, value creation, and refinement",
  Saturn: "discipline, delay, structure, endurance, and responsibility",
  Rahu: "unconventional growth, ambition, foreignness, technology, and appetite for scale",
  Ketu: "detachment, specialization, research, and work that requires separation from noise",
};

const topicEvidenceNouns: Record<Topic, string> = {
  personality: "identity and temperament",
  career: "career",
  wealth: "wealth and resources",
  relationships: "relationship pattern",
  marriage: "marriage and commitment",
  family: "family and home life",
  health: "health and recovery",
  education: "education and learning",
  spirituality: "spiritual direction",
  relocation: "relocation and foreign movement",
};

const topicPracticalFocus: Record<Topic, { support: string; pressure: string }> = {
  personality: {
    support: "Use the stable traits deliberately instead of scattering attention across every impulse.",
    pressure: "Reduce reactivity first; the chart reads better when identity choices are made slowly and consistently.",
  },
  career: {
    support: "Take responsibility, publish visible work, and build leverage through the strongest professional skill.",
    pressure: "Simplify commitments, strengthen daily execution, and avoid reactive job decisions made only from pressure.",
  },
  wealth: {
    support: "Favor steady earning channels, savings discipline, and practical asset-building over scattered opportunity chasing.",
    pressure: "Tighten spending, reduce financial leakage, and avoid high-risk commitments until the resource pattern is cleaner.",
  },
  relationships: {
    support: "Use the supportive relational signals through honest contact, clear expectations, and low-drama repair.",
    pressure: "Slow down assumptions, name the conflict pattern early, and avoid making one intense moment define the bond.",
  },
  marriage: {
    support: "Build commitment through reliability, shared plans, and conversations that turn attraction into structure.",
    pressure: "Delay irreversible decisions until pressure reduces, and treat conflict as data rather than a final verdict.",
  },
  family: {
    support: "Invest in routines, home stability, and practical care where the chart already shows continuity.",
    pressure: "Reduce inherited or domestic friction by keeping boundaries, responsibilities, and expectations explicit.",
  },
  health: {
    support: "Use the supportive recovery pattern through routine, sleep, food discipline, and consistent maintenance.",
    pressure: "Treat stress and irregularity as the first signal to correct; seek qualified care for symptoms or medical decisions.",
  },
  education: {
    support: "Choose a narrow learning track, repeat practice, and convert curiosity into demonstrable skill.",
    pressure: "Reduce distraction and overextension before adding new study goals; consistency matters more than intensity.",
  },
  spirituality: {
    support: "Keep the practice simple, repeatable, and grounded in guidance rather than performance.",
    pressure: "Avoid escapism; use solitude or faith as discipline, not as a way to bypass practical responsibility.",
  },
  relocation: {
    support: "Explore movement through planned steps, paperwork, savings, and realistic location comparisons.",
    pressure: "Do not relocate only to escape pressure; stabilize home, work, and financial basics before moving.",
  },
};

const planetTopicLanguage: Record<Planet, string> = {
  Sun: "authority, visibility, confidence, father or leadership themes",
  Moon: "emotional rhythm, care, public response, comfort, and recovery",
  Mars: "drive, conflict, stamina, competition, courage, and decisive action",
  Mercury: "analysis, speech, trade, skill, study, and adaptability",
  Jupiter: "growth, judgment, counsel, teachers, faith, and protection",
  Venus: "comfort, attraction, value, pleasure, art, and relational ease",
  Saturn: "discipline, delay, duty, endurance, structure, and long-term consequences",
  Rahu: "ambition, disruption, foreignness, appetite, technology, and unusual growth",
  Ketu: "detachment, separation, specialization, research, and spiritualization",
};

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function citations(input: {
  charts?: string[];
  houses?: number[];
  planets?: Planet[];
}): TopicEvidenceCitation {
  return {
    charts: unique(input.charts ?? []),
    houses: unique(input.houses ?? []).sort((left, right) => left - right),
    planets: unique(input.planets ?? []),
  };
}

function mergeCitations(factors: Array<{ citations: TopicEvidenceCitation }>) {
  return citations({
    charts: factors.flatMap((factor) => factor.citations.charts),
    houses: factors.flatMap((factor) => factor.citations.houses),
    planets: factors.flatMap((factor) => factor.citations.planets),
  });
}

function factor(input: Omit<TopicEvidenceFactor, "citations"> & { citations: TopicEvidenceCitation }) {
  return input;
}

function timingFactor(input: TopicEvidenceTimingFactor) {
  return input;
}

function getD1House(snapshot: ChartSnapshot, house: number) {
  return snapshot.charts.D1?.houses.find((entry) => entry.house === house);
}

function d1Occupants(snapshot: ChartSnapshot, house: number) {
  return snapshot.charts.D1?.planets.filter((entry) => entry.house === house).map((entry) => entry.planet) ?? [];
}

function planetPlacement(snapshot: ChartSnapshot, planet: Planet) {
  return snapshot.planetary_positions.find((entry) => entry.planet === planet);
}

function d10PlacementSummary(snapshot: ChartSnapshot, planets: Planet[]) {
  const d10 = snapshot.charts.D10;
  if (!d10) {
    return "D10 is unavailable in this snapshot, so the career evidence leans more heavily on D1 and timing.";
  }

  return planets
    .map((planet) => {
      const placement = d10.planets.find((entry) => entry.planet === planet);
      return placement ? `${planet} in ${placement.sign}/${ordinal(placement.house)}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function periodLabel(period: { lord: Planet; start: string; end: string }) {
  return `${period.lord} (${formatDate(period.start)} to ${formatDate(period.end)})`;
}

function confidenceFor(input: {
  birthTimeConfidence: "exact" | "approximate" | "unknown";
  highCount: number;
  lowCount: number;
  supportCount: number;
  frictionCount: number;
}): TopicEvidence["confidence"] {
  const reasons: string[] = [];
  if (input.highCount > 0) {
    reasons.push(`${input.highCount} career house signal(s) are supportive.`);
  }
  if (input.lowCount > 0) {
    reasons.push(`${input.lowCount} career house signal(s) are under strain.`);
  }
  if (input.frictionCount > 0) {
    reasons.push(`${input.frictionCount} friction factor(s) need caveats.`);
  }
  reasons.push(`Birth time confidence is ${input.birthTimeConfidence}.`);

  if (input.birthTimeConfidence === "unknown") {
    return { level: "low", reasons };
  }

  if (input.birthTimeConfidence === "exact" && input.highCount > input.lowCount && input.supportCount >= input.frictionCount) {
    return { level: "high", reasons };
  }

  if (input.lowCount > input.highCount && input.frictionCount > input.supportCount) {
    return { level: "low", reasons };
  }

  return { level: "medium", reasons };
}

function birthTimeSensitivity(birthTimeConfidence: "exact" | "approximate" | "unknown") {
  if (birthTimeConfidence === "exact") {
    return {
      level: "low" as const,
      note: "Birth time is exact, so Lagna, houses, and D10 career factors are usable with normal confidence.",
    };
  }

  if (birthTimeConfidence === "approximate") {
    return {
      level: "medium" as const,
      note: "Birth time is approximate, so house cusps and D10 emphasis can shift. Treat precise timing and divisional detail as directional.",
    };
  }

  return {
    level: "high" as const,
    note: "Birth time is unknown, so Lagna, houses, and D10-dependent career conclusions should stay low confidence.",
  };
}

function buildCareerVerdict(input: {
  highCount: number;
  lowCount: number;
  frictionCount: number;
  currentAntardasha: Planet;
}) {
  if (input.highCount > input.lowCount && input.frictionCount > 0) {
    return `Career growth is supported, but the current ${input.currentAntardasha} Antardasha asks for disciplined execution rather than quick validation.`;
  }

  if (input.highCount > input.lowCount) {
    return `Career growth is structurally supported, with timing that rewards visible work and steady skill-building.`;
  }

  if (input.lowCount > input.highCount) {
    return `Career is under real pressure now; the chart points to correction and cleanup before clean expansion.`;
  }

  return `Career shows a mixed but workable pattern: the path is active, but progress depends on choosing structure over impatience.`;
}

function buildCareerOverview(input: {
  snapshot: ChartSnapshot;
  tenthLord: Planet;
  tenthLordHouse: number | undefined;
  highCount: number;
  lowCount: number;
  frictionCount: number;
  currentMahadasha: Planet;
  currentAntardasha: Planet;
  transitNotes: string[];
}) {
  const tenthLordTheme = input.tenthLordHouse ? careerHouseThemes[input.tenthLordHouse] : "the 10th lord's placement";
  const lifelongPattern =
    input.lowCount > input.highCount
      ? `The whole-life career pattern is not a smooth climb. The 10th lord ${input.tenthLord} pulls career toward ${tenthLordTheme}, so work improves when the person becomes useful in complex situations instead of chasing quick public approval.`
      : `The whole-life career pattern has workable professional support. The 10th lord ${input.tenthLord} connects career with ${tenthLordTheme}, so the strongest path is built by repeating that skill until it becomes visible authority.`;

  const currentPhase =
    input.frictionCount > 0
      ? `Right now the person is in a ${input.currentMahadasha} Mahadasha with ${input.currentAntardasha} Antardasha influence, so career can feel heavier than the effort being rewarded. The current phase is asking for cleanup, discipline, and practical consistency before expansion feels clean.`
      : `Right now the person is in a ${input.currentMahadasha} Mahadasha with ${input.currentAntardasha} Antardasha influence, so career activity is live rather than dormant. The current phase supports steady output, skill-building, and visible responsibility.`;

  const transitLine = input.transitNotes[0] ? ` Current transit note: ${input.transitNotes[0]}` : "";
  const practicalFocus =
    input.lowCount > 0
      ? `The practical focus should be to reduce career friction: simplify commitments, strengthen daily execution, and avoid reactive job decisions made only from pressure.${transitLine}`
      : `The practical focus should be to use the supportive window: take responsibility, publish visible work, and build leverage through the strongest career skill.${transitLine}`;

  return {
    lifelong_pattern: lifelongPattern,
    current_phase: currentPhase,
    practical_focus: practicalFocus,
  };
}

export function buildCareerEvidence(snapshot: ChartSnapshot, bundle: TopicBundle): TopicEvidence {
  const birthTimeConfidence = snapshot.birth_time_confidence ?? "unknown";
  const tenthLord = lordOfHouse(snapshot, 10);
  const tenthLordPlacement = planetPlacement(snapshot, tenthLord);
  const tenthHouse = getD1House(snapshot, 10);
  const tenthOccupants = d1Occupants(snapshot, 10);
  const careerPlanets = unique<Planet>([tenthLord, "Saturn", "Sun", "Mercury", "Jupiter"]);
  const d10 = snapshot.charts.D10;
  const d10Tenth = d10?.houses.find((entry) => entry.house === 10);
  const d10TenthOccupants = d10?.planets.filter((entry) => entry.house === 10).map((entry) => entry.planet) ?? [];

  const primaryFactors: TopicEvidenceFactor[] = [
    factor({
      kind: "house",
      label: "Whole-life career structure",
      summary:
        bundle.houses[10]?.summary ??
        `The 10th house is the main career structure; ${tenthHouse ? `${tenthHouse.sign} is ruled by ${tenthHouse.lord}.` : "its placement is unavailable."}`,
      citations: citations({ charts: ["D1", "Bhava"], houses: [10], planets: unique([tenthLord, ...tenthOccupants]) }),
    }),
    factor({
      kind: "chart",
      label: "D10 professional confirmation",
      summary: d10
        ? `D10 reinforces professional detail: ${d10TenthOccupants.length > 0 ? `${d10TenthOccupants.join(", ")} occupy the 10th` : `the 10th is ${d10Tenth?.sign ?? "available"} and ruled by ${d10Tenth?.lord ?? "its lord"}`}; career planets show ${d10PlacementSummary(snapshot, careerPlanets)}.`
        : "D10 is missing, so career detail should be treated as less complete.",
      citations: citations({
        charts: d10 ? ["D10"] : [],
        houses: [10],
        planets: unique([...(d10TenthOccupants.length > 0 ? d10TenthOccupants : []), ...(d10Tenth?.lord ? [d10Tenth.lord] : [])]),
      }),
    }),
  ];

  const supportingFactors: TopicEvidenceFactor[] = [];
  const frictionFactors: TopicEvidenceFactor[] = [];

  for (const house of careerHouses) {
    const entry = bundle.houses[house];
    if (!entry) {
      continue;
    }
    const housePlacement = getD1House(snapshot, house);
    const houseLord = housePlacement?.lord;
    const houseOccupants = d1Occupants(snapshot, house);
    const target = entry.strength === "low" ? frictionFactors : entry.strength === "high" ? supportingFactors : null;
    if (target) {
      target.push(
        factor({
          kind: "house",
          label: `${ordinal(house)} house ${entry.strength === "high" ? "support" : "pressure"}`,
          summary: entry.summary,
          citations: citations({
            charts: ["D1", "Bhava"],
            houses: [house],
            planets: unique([...(houseLord ? [houseLord] : []), ...houseOccupants]),
          }),
        }),
      );
    }
  }

  for (const planet of careerPlanets) {
    const placement = planetPlacement(snapshot, planet);
    const bundlePlanet = bundle.planets[planet];
    if (!placement || !bundlePlanet) {
      continue;
    }

    if (strongDignities.has(placement.dignity) && !placement.combust) {
      supportingFactors.push(
        factor({
          kind: "planet",
          label: `${planet} supports career function`,
          summary: `${bundlePlanet.summary} In career terms this points to ${planetCareerLanguage[planet]}.`,
          citations: citations({ charts: ["D1", "D10"], houses: [placement.house], planets: [planet] }),
        }),
      );
    }

    if (weakDignities.has(placement.dignity) || placement.combust || frictionHouses.has(placement.house)) {
      const modifiers = [
        weakDignities.has(placement.dignity) ? placement.dignity : "",
        placement.combust ? "combust" : "",
        placement.retrograde ? "retrograde" : "",
        frictionHouses.has(placement.house) ? `${ordinal(placement.house)} house` : "",
      ].filter(Boolean);

      frictionFactors.push(
        factor({
          kind: "planet",
          label: `${planet} needs correction`,
          summary: `${bundlePlanet.summary} In career terms this affects ${planetCareerLanguage[planet]}. This reads as friction because of ${modifiers.join(", ")}.`,
          citations: citations({ charts: ["D1", "D10"], houses: [placement.house], planets: [planet] }),
        }),
      );
    }
  }

  for (const planet of d10TenthOccupants) {
    supportingFactors.push(
      factor({
        kind: "chart",
        label: `${planet} in D10 10th`,
        summary: `${planet} directly occupies the D10 10th house, making professional visibility a key part of the career reading.`,
        citations: citations({ charts: ["D10"], houses: [10], planets: [planet] }),
      }),
    );
  }

  const matchingYogas = snapshot.yogas
    .filter(
      (yoga) =>
        yoga.source_charts.some((chart) => chart === "D1" || chart === "D10") ||
        yoga.planets_involved.some((planet) => careerPlanets.includes(planet)),
    )
    .slice(0, 2);

  for (const yoga of matchingYogas) {
    supportingFactors.push(
      factor({
        kind: "yoga",
        label: yoga.name,
        summary: `${yoga.name} is detected with ${yoga.confidence} confidence. ${yoga.notes[0] ?? "It reinforces the career evidence when read with the cited planets."}`,
        citations: citations({
          charts: yoga.source_charts,
          houses: [10],
          planets: yoga.planets_involved,
        }),
      }),
    );
  }

  const currentLords = [snapshot.dasha.current_mahadasha.lord, snapshot.dasha.current_antardasha.lord];
  const timingFactors: TopicEvidenceTimingFactor[] = [
    timingFactor({
      type: "dasha",
      label: "Current Mahadasha",
      summary: `${periodLabel(snapshot.dasha.current_mahadasha)} sets the broad career background.`,
      citations: citations({ charts: ["D1"], houses: careerHouses, planets: [snapshot.dasha.current_mahadasha.lord] }),
    }),
    timingFactor({
      type: "dasha",
      label: "Current Antardasha",
      summary: `${periodLabel(snapshot.dasha.current_antardasha)} is the sharper current timing layer.`,
      citations: citations({ charts: ["D1"], houses: careerHouses, planets: [snapshot.dasha.current_antardasha.lord] }),
    }),
  ];

  const upcoming = snapshot.dasha.upcoming[0];
  if (upcoming) {
    timingFactors.push(
      timingFactor({
        type: "upcoming",
        label: "Next dasha shift",
        summary: `${periodLabel(upcoming)} is the next timing transition to watch.`,
        citations: citations({ charts: ["D1"], houses: careerHouses, planets: [upcoming.lord] }),
      }),
    );
  }

  for (const note of bundle.timing.current_trigger_notes.slice(0, 2)) {
    timingFactors.push(
      timingFactor({
        type: "transit",
        label: "Current transit trigger",
        summary: note,
        citations: citations({ charts: ["Transit"], houses: careerHouses, planets: currentLords }),
      }),
    );
  }

  const highCount = Object.values(bundle.houses).filter((entry) => entry.strength === "high").length;
  const lowCount = Object.values(bundle.houses).filter((entry) => entry.strength === "low").length;
  const allFactors = [...primaryFactors, ...supportingFactors, ...frictionFactors, ...timingFactors];
  const overview = buildCareerOverview({
    snapshot,
    tenthLord,
    tenthLordHouse: tenthLordPlacement?.house,
    highCount,
    lowCount,
    frictionCount: frictionFactors.length,
    currentMahadasha: snapshot.dasha.current_mahadasha.lord,
    currentAntardasha: snapshot.dasha.current_antardasha.lord,
    transitNotes: bundle.timing.current_trigger_notes,
  });

  return TopicEvidenceSchema.parse({
    version: "topic_evidence_v1",
    topic: "career",
    verdict: buildCareerVerdict({
      highCount,
      lowCount,
      frictionCount: frictionFactors.length,
      currentAntardasha: snapshot.dasha.current_antardasha.lord,
    }),
    overview,
    primary_factors: primaryFactors,
    timing_factors: timingFactors,
    supporting_factors: supportingFactors.slice(0, 6),
    friction_factors: frictionFactors.slice(0, 6),
    confidence: confidenceFor({
      birthTimeConfidence,
      highCount,
      lowCount,
      supportCount: supportingFactors.length,
      frictionCount: frictionFactors.length,
    }),
    birth_time_sensitivity: birthTimeSensitivity(birthTimeConfidence),
    citations: mergeCitations(allFactors),
  });
}

function primaryHouseFor(bundle: TopicBundle) {
  return Number(Object.keys(bundle.houses)[0] ?? 1);
}

function genericConfidenceFor(input: {
  topic: Topic;
  birthTimeConfidence: "exact" | "approximate" | "unknown";
  highCount: number;
  lowCount: number;
  supportCount: number;
  frictionCount: number;
}): TopicEvidence["confidence"] {
  const noun = topicEvidenceNouns[input.topic];
  const reasons: string[] = [];

  if (input.highCount > 0) {
    reasons.push(`${input.highCount} ${noun} house signal(s) are supportive.`);
  }
  if (input.lowCount > 0) {
    reasons.push(`${input.lowCount} ${noun} house signal(s) are under strain.`);
  }
  if (input.frictionCount > 0) {
    reasons.push(`${input.frictionCount} correction factor(s) need caveats.`);
  }
  reasons.push(`Birth time confidence is ${input.birthTimeConfidence}.`);

  if (input.birthTimeConfidence === "unknown") {
    return { level: "low", reasons };
  }
  if (input.birthTimeConfidence === "exact" && input.supportCount > input.frictionCount && input.highCount >= input.lowCount) {
    return { level: "high", reasons };
  }
  if (input.lowCount > input.highCount && input.frictionCount > input.supportCount) {
    return { level: "low", reasons };
  }
  return { level: "medium", reasons };
}

function genericBirthTimeSensitivity(
  topic: Topic,
  birthTimeConfidence: "exact" | "approximate" | "unknown",
): TopicEvidence["birth_time_sensitivity"] {
  const title = topicTitles[topic].toLowerCase();

  if (birthTimeConfidence === "exact") {
    return {
      level: "low",
      note: `Birth time is exact, so Lagna, house weighting, and divisional chart detail are usable for ${title} with normal confidence.`,
    };
  }
  if (birthTimeConfidence === "approximate") {
    return {
      level: "medium",
      note: `Birth time is approximate, so house boundaries and divisional emphasis can shift. Treat precise ${title} timing as directional.`,
    };
  }
  return {
    level: "high",
    note: `Birth time is unknown, so Lagna-dependent houses and divisional chart detail should stay low confidence for ${title}.`,
  };
}

function buildGenericOverview(input: {
  topic: Topic;
  primaryHouse: number;
  primaryLord: Planet | undefined;
  highCount: number;
  lowCount: number;
  frictionCount: number;
  currentMahadasha: Planet;
  currentAntardasha: Planet;
  transitNotes: string[];
}) {
  const noun = topicEvidenceNouns[input.topic];
  const primaryLordText = input.primaryLord ? `, ruled by ${input.primaryLord},` : "";
  const houseText = `${ordinal(input.primaryHouse)} house${primaryLordText}`;
  const title = topicTitles[input.topic].toLowerCase();
  const lifelongPattern =
    input.lowCount > input.highCount
      ? `The whole-life ${title} pattern is not simple or effortless. The ${houseText} carries visible pressure, so this area improves when the person works with structure, boundaries, and repeated correction instead of expecting instant ease.`
      : `The whole-life ${title} pattern has workable support. The ${houseText} gives the main foundation, so this area improves when the person repeats the strongest chart-supported behavior until it becomes stable.`;

  const currentPhase =
    input.frictionCount > 0
      ? `Right now the person is in a ${input.currentMahadasha} Mahadasha with ${input.currentAntardasha} Antardasha influence, so ${noun} can feel heavier or more conditional than usual. The current phase is asking for cleanup, patience, and practical consistency before expansion feels clean.`
      : `Right now the person is in a ${input.currentMahadasha} Mahadasha with ${input.currentAntardasha} Antardasha influence, so ${noun} is active rather than dormant. The current phase supports steady choices and visible effort in this area.`;

  const transitLine = input.transitNotes[0] ? ` Current transit note: ${input.transitNotes[0]}` : "";
  const focus = input.lowCount > 0 ? topicPracticalFocus[input.topic].pressure : topicPracticalFocus[input.topic].support;

  return {
    lifelong_pattern: lifelongPattern,
    current_phase: currentPhase,
    practical_focus: `${focus}${transitLine}`,
  };
}

function buildGenericVerdict(input: {
  topic: Topic;
  highCount: number;
  lowCount: number;
  frictionCount: number;
  currentAntardasha: Planet;
}) {
  const title = topicTitles[input.topic];
  const noun = topicEvidenceNouns[input.topic];

  if (input.highCount > input.lowCount && input.frictionCount > 0) {
    return `${title} is supported, but the current ${input.currentAntardasha} Antardasha asks for disciplined handling rather than quick validation.`;
  }
  if (input.highCount > input.lowCount) {
    return `${title} has structural support, with timing that rewards steady, repeatable action.`;
  }
  if (input.lowCount > input.highCount) {
    return `${title} is under real pressure now; the chart points to correction and cleanup before the area feels easy.`;
  }
  return `${title} shows a mixed but workable ${noun} pattern: progress depends on choosing structure over reaction.`;
}

function buildGenericTopicEvidence(snapshot: ChartSnapshot, bundle: TopicBundle, topic: Topic): TopicEvidence {
  const birthTimeConfidence = snapshot.birth_time_confidence ?? "unknown";
  const primaryHouse = primaryHouseFor(bundle);
  const primaryHouseEntry = getD1House(snapshot, primaryHouse);
  const primaryLord = primaryHouseEntry?.lord;
  const primaryOccupants = d1Occupants(snapshot, primaryHouse);
  const title = topicTitles[topic];
  const noun = topicEvidenceNouns[topic];
  const chartsUsed = unique(bundle.charts_used.length > 0 ? bundle.charts_used : ["D1"]);
  const relevantHouses = Object.keys(bundle.houses).map(Number);
  const relevantPlanets = unique([
    ...(Object.keys(bundle.planets) as Planet[]),
    ...(primaryLord ? [primaryLord] : []),
    ...primaryOccupants,
  ]);
  const vargaCharts = chartsUsed.filter((chart) => !["D1", "Bhava", "Moon"].includes(chart));
  const primaryVarga = vargaCharts[0];
  const primaryVargaChart = primaryVarga ? snapshot.charts[primaryVarga] : undefined;
  const primaryVargaHouse = primaryVargaChart?.houses.find((entry) => entry.house === primaryHouse);
  const primaryVargaOccupants =
    primaryVargaChart?.planets.filter((entry) => entry.house === primaryHouse).map((entry) => entry.planet) ?? [];

  const primaryFactors: TopicEvidenceFactor[] = [
    factor({
      kind: "house",
      label: `Whole-life ${title.toLowerCase()} structure`,
      summary:
        bundle.houses[primaryHouse]?.summary ??
        `${title} is read first from the ${ordinal(primaryHouse)} house; ${primaryHouseEntry ? `${primaryHouseEntry.sign} is ruled by ${primaryHouseEntry.lord}.` : "its D1 placement is unavailable."}`,
      citations: citations({
        charts: ["D1", "Bhava"],
        houses: [primaryHouse],
        planets: unique([...(primaryLord ? [primaryLord] : []), ...primaryOccupants]),
      }),
    }),
    factor({
      kind: "chart",
      label: `${primaryVarga ?? "D1"} confirmation`,
      summary: primaryVargaChart
        ? `${primaryVarga} adds topic detail: ${primaryVargaOccupants.length > 0 ? `${primaryVargaOccupants.join(", ")} occupy the ${ordinal(primaryHouse)}` : `the ${ordinal(primaryHouse)} is ${primaryVargaHouse?.sign ?? "available"} and ruled by ${primaryVargaHouse?.lord ?? "its lord"}`}.`
        : `${title} is currently read from D1/Bhava because a dedicated divisional chart is unavailable in this snapshot.`,
      citations: citations({
        charts: primaryVargaChart ? [primaryVarga ?? "D1"] : ["D1"],
        houses: [primaryHouse],
        planets: unique([
          ...primaryVargaOccupants,
          ...(primaryVargaHouse?.lord ? [primaryVargaHouse.lord] : []),
        ]),
      }),
    }),
  ];

  const supportingFactors: TopicEvidenceFactor[] = [];
  const frictionFactors: TopicEvidenceFactor[] = [];

  for (const house of relevantHouses) {
    const entry = bundle.houses[house];
    if (!entry) {
      continue;
    }
    const housePlacement = getD1House(snapshot, house);
    const houseLord = housePlacement?.lord;
    const occupants = d1Occupants(snapshot, house);
    const target = entry.strength === "high" ? supportingFactors : entry.strength === "low" ? frictionFactors : null;
    if (!target) {
      continue;
    }
    target.push(
      factor({
        kind: "house",
        label: `${ordinal(house)} house ${entry.strength === "high" ? "support" : "pressure"}`,
        summary: entry.summary,
        citations: citations({
          charts: ["D1", "Bhava"],
          houses: [house],
          planets: unique([...(houseLord ? [houseLord] : []), ...occupants]),
        }),
      }),
    );
  }

  for (const planet of relevantPlanets) {
    const placement = planetPlacement(snapshot, planet);
    const bundlePlanet = bundle.planets[planet];
    if (!placement || !bundlePlanet) {
      continue;
    }

    if (strongDignities.has(placement.dignity) && !placement.combust) {
      supportingFactors.push(
        factor({
          kind: "planet",
          label: `${planet} supports ${noun}`,
          summary: `${bundlePlanet.summary} For ${title.toLowerCase()}, this points to ${planetTopicLanguage[planet]}.`,
          citations: citations({ charts: chartsUsed, houses: [placement.house], planets: [planet] }),
        }),
      );
    }

    if (weakDignities.has(placement.dignity) || placement.combust || frictionHouses.has(placement.house)) {
      const modifiers = [
        weakDignities.has(placement.dignity) ? placement.dignity : "",
        placement.combust ? "combust" : "",
        placement.retrograde ? "retrograde" : "",
        frictionHouses.has(placement.house) ? `${ordinal(placement.house)} house` : "",
      ].filter(Boolean);

      frictionFactors.push(
        factor({
          kind: "planet",
          label: `${planet} needs correction`,
          summary: `${bundlePlanet.summary} For ${title.toLowerCase()}, this affects ${planetTopicLanguage[planet]}. This reads as friction because of ${modifiers.join(", ")}.`,
          citations: citations({ charts: chartsUsed, houses: [placement.house], planets: [planet] }),
        }),
      );
    }
  }

  const matchingYogas = snapshot.yogas
    .filter(
      (yoga) =>
        yoga.source_charts.some((chart) => chartsUsed.includes(chart)) ||
        yoga.planets_involved.some((planet) => relevantPlanets.includes(planet)),
    )
    .slice(0, 2);

  for (const yoga of matchingYogas) {
    supportingFactors.push(
      factor({
        kind: "yoga",
        label: yoga.name,
        summary: `${yoga.name} is detected with ${yoga.confidence} confidence. ${yoga.notes[0] ?? `It reinforces ${title.toLowerCase()} when read with the cited planets.`}`,
        citations: citations({
          charts: yoga.source_charts,
          houses: relevantHouses,
          planets: yoga.planets_involved,
        }),
      }),
    );
  }

  const currentLords = [snapshot.dasha.current_mahadasha.lord, snapshot.dasha.current_antardasha.lord];
  const timingFactors: TopicEvidenceTimingFactor[] = [
    timingFactor({
      type: "dasha",
      label: "Current Mahadasha",
      summary: `${periodLabel(snapshot.dasha.current_mahadasha)} sets the broad ${title.toLowerCase()} background.`,
      citations: citations({ charts: ["D1"], houses: relevantHouses, planets: [snapshot.dasha.current_mahadasha.lord] }),
    }),
    timingFactor({
      type: "dasha",
      label: "Current Antardasha",
      summary: `${periodLabel(snapshot.dasha.current_antardasha)} is the sharper current timing layer for ${title.toLowerCase()}.`,
      citations: citations({ charts: ["D1"], houses: relevantHouses, planets: [snapshot.dasha.current_antardasha.lord] }),
    }),
  ];

  const upcoming = snapshot.dasha.upcoming[0];
  if (upcoming) {
    timingFactors.push(
      timingFactor({
        type: "upcoming",
        label: "Next dasha shift",
        summary: `${periodLabel(upcoming)} is the next timing transition to watch.`,
        citations: citations({ charts: ["D1"], houses: relevantHouses, planets: [upcoming.lord] }),
      }),
    );
  }

  for (const note of bundle.timing.current_trigger_notes.slice(0, 2)) {
    timingFactors.push(
      timingFactor({
        type: "transit",
        label: "Current transit trigger",
        summary: note,
        citations: citations({ charts: ["Transit"], houses: relevantHouses, planets: currentLords }),
      }),
    );
  }

  const highCount = Object.values(bundle.houses).filter((entry) => entry.strength === "high").length;
  const lowCount = Object.values(bundle.houses).filter((entry) => entry.strength === "low").length;
  const allFactors = [...primaryFactors, ...supportingFactors, ...frictionFactors, ...timingFactors];
  const overview = buildGenericOverview({
    topic,
    primaryHouse,
    primaryLord,
    highCount,
    lowCount,
    frictionCount: frictionFactors.length,
    currentMahadasha: snapshot.dasha.current_mahadasha.lord,
    currentAntardasha: snapshot.dasha.current_antardasha.lord,
    transitNotes: bundle.timing.current_trigger_notes,
  });

  return TopicEvidenceSchema.parse({
    version: "topic_evidence_v1",
    topic,
    verdict: buildGenericVerdict({
      topic,
      highCount,
      lowCount,
      frictionCount: frictionFactors.length,
      currentAntardasha: snapshot.dasha.current_antardasha.lord,
    }),
    overview,
    primary_factors: primaryFactors,
    timing_factors: timingFactors,
    supporting_factors: supportingFactors.slice(0, 6),
    friction_factors: frictionFactors.slice(0, 6),
    confidence: genericConfidenceFor({
      topic,
      birthTimeConfidence,
      highCount,
      lowCount,
      supportCount: supportingFactors.length,
      frictionCount: frictionFactors.length,
    }),
    birth_time_sensitivity: genericBirthTimeSensitivity(topic, birthTimeConfidence),
    citations: mergeCitations(allFactors),
  });
}

export function buildTopicEvidence(snapshot: ChartSnapshot, bundle: TopicBundle, topic: Topic): TopicEvidence {
  if (topic === "career") {
    return buildCareerEvidence(snapshot, bundle);
  }
  return buildGenericTopicEvidence(snapshot, bundle, topic);
}

export function buildTopicEvidenceCollection(
  snapshot: ChartSnapshot,
  topicBundles: { [K in Topic]?: TopicBundle },
): TopicEvidenceCollection {
  return Object.entries(topicBundles).reduce<TopicEvidenceCollection>((result, [topic, bundle]) => {
    if (!bundle) {
      return result;
    }
    result[topic as Topic] = buildTopicEvidence(snapshot, bundle, topic as Topic);
    return result;
  }, {} as TopicEvidenceCollection);
}
