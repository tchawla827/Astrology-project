"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { aspectsForPlanet, type RenderedPlanet } from "@/lib/charts/renderChart";
import type { Aspect, Yoga } from "@/lib/schemas";

export function PlanetDrawer({
  planet,
  aspects,
  yogas,
  onClose,
}: {
  planet: RenderedPlanet | null;
  aspects: Aspect[];
  yogas: Yoga[];
  onClose: () => void;
}) {
  if (!planet) {
    return null;
  }

  const natal = planet.natal;
  const relatedAspects = aspectsForPlanet(aspects, planet.planet);
  const relatedYogas = yogas.filter((yoga) => yoga.notes.some((note) => note.toLowerCase().includes(planet.planet.toLowerCase())));

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
          <Detail label="Longitude" value={natal ? `${natal.longitude_deg.toFixed(2)} deg` : "Not available for this divisional chart"} />
          <Detail label="Nakshatra" value={natal ? `${natal.nakshatra}, pada ${natal.pada}` : "Not available"} />
          <Detail label="Dignity" value={natal?.dignity ?? "Not available"} />
          <Detail label="Motion" value={[natal?.retrograde ? "retrograde" : "direct", natal?.combust ? "combust" : "not combust"].join(", ")} />
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
