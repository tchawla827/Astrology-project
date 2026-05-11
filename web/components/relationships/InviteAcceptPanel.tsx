"use client";

import { LoaderCircle, ShieldCheck, UserRoundX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RELATIONSHIP_LABEL_OPTIONS, labelText } from "@/lib/relationships/labels";
import type { RelationshipLabel } from "@/lib/schemas";

export function InviteAcceptPanel({
  token,
  requesterName,
  requesterLabel,
  recipientLabel,
}: {
  token: string;
  requesterName: string;
  requesterLabel: RelationshipLabel;
  recipientLabel: RelationshipLabel;
}) {
  const router = useRouter();
  const [draftRequesterLabel, setDraftRequesterLabel] = useState(requesterLabel);
  const [draftRecipientLabel, setDraftRecipientLabel] = useState(recipientLabel);
  const [workingAction, setWorkingAction] = useState<"accept" | "decline" | "block" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline" | "block") {
    setWorkingAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/relationships/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          requester_label: draftRequesterLabel,
          recipient_label: draftRecipientLabel,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { relationship_id?: string; error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not respond to invite.");
        return;
      }
      if (body.relationship_id) {
        router.push(`/relationships/${body.relationship_id}`);
      } else {
        router.push("/relationships");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not respond to invite.");
    } finally {
      setWorkingAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/20 bg-card/70 p-4">
        <p className="text-sm text-muted-foreground">
          {requesterName} proposed: they are your {labelText(recipientLabel).toLowerCase()}, and you are their{" "}
          {labelText(requesterLabel).toLowerCase()}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          You are their
          <Select value={draftRequesterLabel} onChange={(event) => setDraftRequesterLabel(event.target.value as RelationshipLabel)}>
            {RELATIONSHIP_LABEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          They are your
          <Select value={draftRecipientLabel} onChange={(event) => setDraftRecipientLabel(event.target.value as RelationshipLabel)}>
            {RELATIONSHIP_LABEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={workingAction !== null} onClick={() => void respond("accept")} type="button">
          {workingAction === "accept" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
          Accept relationship
        </Button>
        <Button disabled={workingAction !== null} onClick={() => void respond("decline")} type="button" variant="outline">
          Decline
        </Button>
        <Button disabled={workingAction !== null} onClick={() => void respond("block")} type="button" variant="destructive">
          <UserRoundX className="mr-2 h-4 w-4" aria-hidden="true" />
          Block
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
