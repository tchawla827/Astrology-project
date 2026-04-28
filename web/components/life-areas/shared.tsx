import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function strengthBadgeClass(strength: "high" | "medium" | "low") {
  switch (strength) {
    case "high":
      return "border-emerald-400/45 bg-emerald-500/10 text-emerald-200";
    case "medium":
      return "border-amber-400/45 bg-amber-500/10 text-amber-200";
    case "low":
      return "border-rose-400/45 bg-rose-500/10 text-rose-200";
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
