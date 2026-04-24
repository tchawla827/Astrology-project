"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { aspectsForPlanet, chartSupportsNatalTechnicalDetails, yogaInvolvesPlanet, type RenderedPlanet } from "@/lib/charts/renderChart";
import type { Aspect, Yoga } from "@/lib/schemas";

export function PlanetDrawer({
  chartKey,
  planet,
  aspects,
  yogas,
  onClose,
}: {
  chartKey: string;
  planet: RenderedPlanet | null;
  aspects: Aspect[];
  yogas: Yoga[];
  onClose: () => void;
}) {
  if (!planet) {
    return null;
  }

  const technicalDetails = planet.technicalDetails;
  const supportsTechnicalDetails = chartSupportsNatalTechnicalDetails(chartKey);
  const relatedAspects = aspectsForPlanet(aspects, planet.planet);
  const relatedYogas = yogas.filter((yoga) => yogaInvolvesPlanet(yoga, planet.planet));

  return (
    <Sheet>
      <div className="fixed inset-0 z-40 bg-background/70" onClick={onClose} />
      <SheetContent>
        <SheetHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <SheetTitle>{planet.planet}</SheetTitle>
            <SheetDescription>
              {planet.sign}, house {planet.house}
            </SheetDescription>
          </div>
          <Button aria-label="Close planet details" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <Detail label="Placement" value={`${planet.sign}, house ${planet.house}`} />
          <Detail label="Longitude" value={technicalDetails ? `${technicalDetails.longitude_deg.toFixed(2)} deg` : "Not available for this chart"} />
          <Detail label="Nakshatra" value={technicalDetails ? `${technicalDetails.nakshatra}, pada ${technicalDetails.pada}` : "Not available for this chart"} />
          <Detail label="Dignity" value={technicalDetails?.dignity ?? "Not available for this chart"} />
          <Detail
            label="Motion"
            value={
              technicalDetails
                ? [technicalDetails.retrograde ? "retrograde" : "direct", technicalDetails.combust ? "combust" : "not combust"].join(", ")
                : "Not available for this chart"
            }
          />
          {!supportsTechnicalDetails ? (
            <p className="rounded-md border bg-background/40 p-3 text-muted-foreground">
              Technical planetary metadata is only stored for D1, Bhava, and Moon views. Divisional charts currently expose sign and house placement only.
            </p>
          ) : null}
          <ListDetail label="Aspects cast / received" values={relatedAspects.map((aspect) => `${aspect.from} ${aspect.kind} ${aspect.to}`)} />
          <ListDetail label="Yogas involving this planet" values={relatedYogas.map((yoga) => `${yoga.name}: ${yoga.notes.join(" ")}`)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function ListDetail({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      {values.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {values.map((value) => (
            <li className="rounded-md border bg-background/40 p-3" key={value}>
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground">None flagged in this snapshot.</p>
      )}
    </div>
  );
}
