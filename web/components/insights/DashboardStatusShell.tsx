"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardProcessingShell({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [statusText, setStatusText] = useState("Building your chart snapshot...");

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/profile/${profileId}`);
      if (!response.ok) {
        setStatusText("Still waiting for profile status...");
        return;
      }
      const body = (await response.json()) as { profile?: { status?: string } };
      if (body.profile?.status === "ready") {
        window.clearInterval(interval);
        router.refresh();
      }
      if (body.profile?.status === "error") {
        window.clearInterval(interval);
        setStatusText("Profile generation failed. Use regenerate to retry.");
      }
    }, 750);

    return () => window.clearInterval(interval);
  }, [profileId, router]);

  return (
    <div className="space-y-6">
      <section className="cinematic-hero p-6 sm:p-8">
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Processing</p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-glow">{statusText}</h1>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {["summary", "dasha", "transits"].map((key) => (
          <Card key={key}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardErrorShell({ profileId, message }: { profileId: string; message?: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Needs attention</p>
        </div>
        <CardTitle className="mt-2 text-2xl">Chart generation needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message ?? "The dashboard cannot load until the chart snapshot is ready."}</p>
        <RegenerateChartButton label="Regenerate chart" profileId={profileId} variant="default" />
      </CardContent>
    </Card>
  );
}
