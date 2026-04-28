"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
        {hasError ? <Sparkles className="h-6 w-6" aria-hidden="true" /> : <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />}
      </div>
      <p className="mt-6 text-sm uppercase tracking-[0.24em] text-primary">Generating</p>
      <h1 className="mx-auto mt-4 max-w-xl font-display text-5xl font-semibold leading-tight text-glow">{message}</h1>
      <div className="mx-auto mt-8 h-2 w-64 overflow-hidden rounded bg-background/70">
        <div className="h-full w-1/2 animate-pulse rounded bg-primary shadow-[0_0_28px_rgba(223,164,83,0.36)]" />
      </div>
      {hasError ? (
        <Button className="mx-auto mt-6" onClick={() => router.push("/birth-details")} type="button">
          Retry onboarding
        </Button>
      ) : null}
    </>
  );
}
