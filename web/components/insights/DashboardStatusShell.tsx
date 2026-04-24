"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <div>
        <p className="text-sm uppercase text-primary">Processing</p>
        <h1 className="mt-2 text-3xl font-semibold">{statusText}</h1>
      </div>
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
    <Card>
      <CardHeader>
        <CardTitle>Chart generation needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message ?? "The dashboard cannot load until the chart snapshot is ready."}</p>
        <RegenerateChartButton label="Regenerate chart" profileId={profileId} variant="default" />
      </CardContent>
    </Card>
  );
}
