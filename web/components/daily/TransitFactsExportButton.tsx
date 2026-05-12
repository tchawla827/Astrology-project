"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TransitFactsExportButton({ date, maxDate, minDate }: { date: string; maxDate: string; minDate: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(date);
  const [error, setError] = useState<string | null>(null);

  async function parseJson(response: Response) {
    return (await response.json().catch(() => ({}))) as { error?: string; url?: string };
  }

  async function downloadExport(payload: Record<string, unknown>) {
    setError(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await parseJson(response);
      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not export data.");
        return;
      }
      const link = document.createElement("a");
      link.href = body.url;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not export data.");
    }
  }

  async function exportFacts() {
    setIsExporting(true);
    try {
      await downloadExport({ kind: "charts_transits_json", date });
    } finally {
      setIsExporting(false);
    }
  }

  async function exportBulkFacts() {
    if (from > to) {
      setError("From date must be on or before to date.");
      return;
    }
    setIsBulkExporting(true);
    try {
      await downloadExport({ kind: "bulk_charts_transits_json", from, to });
    } finally {
      setIsBulkExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-primary/20 bg-background/70 p-4">
      <Button className="w-full gap-2" disabled={isExporting} onClick={exportFacts} type="button" variant="outline">
        {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {isExporting ? "Preparing..." : "Export facts"}
      </Button>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          From
          <Input max={maxDate} min={minDate} onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          To
          <Input max={maxDate} min={minDate} onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </label>
      </div>
      <Button className="w-full gap-2" disabled={isBulkExporting} onClick={exportBulkFacts} type="button" variant="secondary">
        {isBulkExporting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {isBulkExporting ? "Preparing range..." : "Export range JSON"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
