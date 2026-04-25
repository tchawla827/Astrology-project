import React from "react";
import { AlertTriangle } from "lucide-react";

export function BirthTimeSensitivityNote({
  confidence,
  note,
}: {
  confidence: "approximate" | "unknown";
  note: string;
}) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium text-amber-50">Birth-time sensitivity: {confidence}</p>
        <p>{note} Edit your profile and recompute for tighter timing.</p>
      </div>
    </div>
  );
}
