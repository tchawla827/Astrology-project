import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HeadlineSignals({ signals }: { signals: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Headline signals</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 pl-5 text-sm text-muted-foreground">
          {signals.map((signal, index) => (
            <li className="list-decimal pl-1 leading-6" key={`${index}-${signal}`}>
              {signal}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
