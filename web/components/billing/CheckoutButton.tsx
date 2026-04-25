"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CheckoutButton({ interval }: { interval: "monthly" | "yearly" }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !body.url) {
      setError(body.error ?? "Could not start checkout.");
      setIsLoading(false);
      return;
    }
    window.location.assign(body.url);
  }

  return (
    <div className="space-y-2">
      <Button className="w-full gap-2" disabled={isLoading} onClick={startCheckout} type="button">
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {isLoading ? "Opening checkout..." : interval === "monthly" ? "Start monthly" : "Start yearly"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
