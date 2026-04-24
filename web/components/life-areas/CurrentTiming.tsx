import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CurrentTiming({
  timing,
}: {
  timing: { mahadasha: string; antardasha: string; notes: string[] };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Current timing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Currently running: {timing.mahadasha} Mahadasha, {timing.antardasha} Antardasha
        </p>
        {timing.notes.length > 0 ? (
          <ul className="space-y-2 pl-5 text-sm text-muted-foreground">
            {timing.notes.map((note) => (
              <li className="list-disc leading-6" key={note}>
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No direct transit notes are active for this topic right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
