import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function strengthBadgeClass(strength: "high" | "medium" | "low") {
  switch (strength) {
    case "high":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    case "low":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700";
  }
}

export function StrengthBadge({ strength, className }: { strength: "high" | "medium" | "low"; className?: string }) {
  return (
    <Badge
      aria-label={`Strength ${strength}`}
      className={cn("capitalize", strengthBadgeClass(strength), className)}
    >
      {strength}
    </Badge>
  );
}
