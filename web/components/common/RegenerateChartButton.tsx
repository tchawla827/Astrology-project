"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  profileId: string;
  label?: string;
  workingLabel?: string;
} & Pick<ButtonProps, "className" | "size" | "variant">;

export function RegenerateChartButton({
  profileId,
  label = "Recompute chart",
  workingLabel = "Recomputing...",
  className,
  size = "default",
  variant = "outline",
}: Props) {
  const router = useRouter();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/profile/${profileId}/regenerate`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not start regeneration.");
        setIsRegenerating(false);
        return;
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start regeneration.");
      setIsRegenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className={cn("gap-2", className)}
        disabled={isRegenerating}
        onClick={regenerate}
        size={size}
        type="button"
        variant={variant}
      >
        <RefreshCcw className={cn("h-4 w-4", isRegenerating && "animate-spin")} aria-hidden="true" />
        {isRegenerating ? workingLabel : label}
      </Button>
      {isRegenerating ? <p className="text-sm text-muted-foreground">Chart recomputation has started. This view will refresh when the server responds.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
