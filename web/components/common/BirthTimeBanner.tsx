import * as React from "react";
import { AlertTriangle } from "lucide-react";

export function BirthTimeBanner({ confidence }: { confidence: "exact" | "approximate" | "unknown" }) {
  if (confidence === "exact") {
    return null;
  }

  return (
    <div className="ritual-panel flex gap-3 rounded-lg p-4 text-sm text-primary">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <p>
        Time-sensitive insights (Lagna, Navamsa, dasha) use your stated confidence. Edit your birth details to
        recompute.
      </p>
    </div>
  );
}
