"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HOUSE_MEANINGS } from "@/lib/charts/houseMeanings";
import { aspectsIntoHouse, type RenderedChart, type RenderedHouse } from "@/lib/charts/renderChart";
import type { Aspect } from "@/lib/schemas";

export function HouseDrawer({
  house,
  rendered,
  aspects,
  onClose,
}: {
  house: RenderedHouse | null;
  rendered: RenderedChart;
  aspects: Aspect[];
  onClose: () => void;
}) {
  if (!house) {
    return null;
  }

  const occupants = rendered.planets.filter((planet) => planet.house === house.house);
  const lordPlacement = rendered.planets.find((planet) => planet.planet === house.lord);
  const houseAspects = aspectsIntoHouse(aspects, house.house);

  return (
    <Sheet>
      <div className="fixed inset-0 z-40 bg-background/70" onClick={onClose} />
      <SheetContent>
        <SheetHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <SheetTitle>House {house.house}</SheetTitle>
            <SheetDescription>{house.sign} ruled by {house.lord}</SheetDescription>
          </div>
          <Button aria-label="Close house details" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <Detail label="Sign" value={house.sign} />
          <Detail label="Lord" value={house.lord} />
          <Detail
            label="Lord placement"
            value={lordPlacement ? `${lordPlacement.sign}, house ${lordPlacement.house}` : "Lord is not present in this chart payload."}
          />
          <Detail label="Classical significations" value={HOUSE_MEANINGS[house.house] ?? "No house meaning is defined."} />
          <ListDetail label="Occupants" values={occupants.map((planet) => `${planet.planet} in ${planet.sign}`)} />
          <ListDetail label="Aspects into house" values={houseAspects.map((aspect) => `${aspect.from} ${aspect.kind} house ${aspect.to}`)} />
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
