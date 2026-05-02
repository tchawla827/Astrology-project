"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function TransitFactsExportButton({ date }: { date: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parseJson(response: Response) {
    return (await response.json().catch(() => ({}))) as { error?: string; url?: string };
  }

  async function exportFacts() {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "charts_transits_json", date }),
      });
      const body = await parseJson(response);
      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not export data.");
        setIsExporting(false);
        return;
      }
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not export data.");
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-primary/20 bg-background/70 p-4">
      <Button className="w-full gap-2" disabled={isExporting} onClick={exportFacts} type="button" variant="outline">
        {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {isExporting ? "Preparing..." : "Export facts"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
