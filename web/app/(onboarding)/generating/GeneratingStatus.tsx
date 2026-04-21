"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export function GeneratingStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("id");
  const [message, setMessage] = useState("Building your chart snapshot...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setMessage("Missing profile id.");
      setHasError(true);
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/profile/${profileId}`);
      if (!response.ok) {
        setMessage("Could not read profile status.");
        setHasError(true);
        return;
      }
      const body = (await response.json()) as { profile?: { status?: string } };
      if (body.profile?.status === "ready") {
        window.clearInterval(interval);
        router.push("/dashboard");
      }
      if (body.profile?.status === "error") {
        setMessage("Profile generation failed. Return to birth details and try again.");
        setHasError(true);
        window.clearInterval(interval);
      }
    }, 750);

    return () => window.clearInterval(interval);
  }, [profileId, router]);

  return (
    <>
      <p className="text-sm uppercase tracking-widest text-primary">Generating</p>
      <h1 className="mt-3 text-3xl font-semibold">{message}</h1>
      <div className="mx-auto mt-8 h-2 w-48 overflow-hidden rounded bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded bg-primary" />
      </div>
      {hasError ? (
        <Button className="mx-auto mt-6" onClick={() => router.push("/birth-details")} type="button">
          Retry onboarding
        </Button>
      ) : null}
    </>
  );
}
