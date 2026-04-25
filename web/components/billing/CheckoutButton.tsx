"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CheckoutButton({ interval }: { interval: "monthly" | "yearly" }) {
  void interval;

  return (
    <Button className="w-full gap-2" disabled type="button">
      <Check className="h-4 w-4" aria-hidden="true" />
      Free plan active
    </Button>
  );
}
