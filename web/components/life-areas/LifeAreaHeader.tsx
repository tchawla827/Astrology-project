import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-primary">Life Area</p>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{profileName}</p>
        </div>
        <Badge className={strengthBadgeClass(confidence.level)}>{confidence.level} confidence</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-lg font-medium leading-7">{subtitle}</p>
        <p className="text-sm text-muted-foreground">{confidence.note}</p>
      </CardContent>
    </Card>
  );
}
