import { Badge } from "@/components/ui/badge";
import { strengthBadgeClass } from "@/components/life-areas/shared";

export function LifeAreaHeader({
  title,
  subtitle,
  confidence,
  profileName,
}: {
  title: string;
  subtitle: string;
  confidence: { level: "high" | "medium" | "low"; note: string };
  profileName: string;
}) {
  return (
    <section className="cinematic-hero p-6 sm:p-8 lg:p-10">
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Life area report</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">{title}</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">{profileName}</p>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-8">{subtitle}</p>
        </div>
        <div className="luxury-panel rounded-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Report confidence</p>
            <Badge className={strengthBadgeClass(confidence.level)}>{confidence.level}</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{confidence.note}</p>
        </div>
      </div>
    </section>
  );
}
