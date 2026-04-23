"use client";

import * as React from "react";
import { useState } from "react";
import { Crosshair, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DashboardFocusCard } from "@/lib/insights/themes";

export function FocusCard({ focus }: { focus: DashboardFocusCard }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crosshair className="h-4 w-4 text-primary" aria-hidden="true" />
          Focus now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xl font-semibold">{focus.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{focus.body}</p>
        </div>
        <Button className="gap-2" onClick={() => setIsOpen(true)} type="button" variant="outline">
          <Info className="h-4 w-4" aria-hidden="true" />
          Why?
        </Button>
        {isOpen ? (
          <Dialog>
            <div className="fixed inset-0 z-40 bg-background/70" onClick={() => setIsOpen(false)} />
            <DialogContent>
              <DialogHeader className="flex flex-row items-start justify-between gap-4">
                <DialogTitle>Chart basis</DialogTitle>
                <Button aria-label="Close dialog" onClick={() => setIsOpen(false)} size="sm" type="button" variant="ghost">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogHeader>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <BasisList label="Charts" values={focus.why.charts} />
                <BasisList label="Houses" values={focus.why.houses.map((house) => `${house}`)} />
                <BasisList label="Planets" values={focus.why.planets} />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BasisList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md border bg-background/50 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{values.length > 0 ? values.join(", ") : "Not flagged"}</p>
    </div>
  );
}
