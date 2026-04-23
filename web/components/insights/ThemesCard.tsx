import * as React from "react";
import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ThemesCard({ themes }: { themes: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
          Dominant themes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {themes.map((theme, index) => (
            <li className="flex gap-3 text-sm" key={theme}>
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span>{theme}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
