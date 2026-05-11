"use client";

import { Copy, Link2, LoaderCircle, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RELATIONSHIP_LABEL_OPTIONS, defaultReciprocalLabel } from "@/lib/relationships/labels";
import type { RelationshipLabel } from "@/lib/schemas";

type InviteResponse = {
  invite_url?: string;
  error?: string;
};

export function RelationshipInviteForm() {
  const [requesterLabel, setRequesterLabel] = useState<RelationshipLabel>("friend");
  const [recipientLabel, setRecipientLabel] = useState<RelationshipLabel>("friend");
  const [inviteUrl, setInviteUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function createInvite() {
    setIsCreating(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/relationships/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requester_label: requesterLabel, recipient_label: recipientLabel }),
      });
      const body = (await response.json().catch(() => ({}))) as InviteResponse;
      if (!response.ok || !body.invite_url) {
        setError(body.error ?? "Could not create invite.");
        return;
      }
      setInviteUrl(body.invite_url);
      setStatus("Invite link ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create invite.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    setStatus("Invite link copied.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          You are their
          <Select
            value={requesterLabel}
            onChange={(event) => {
              const next = event.target.value as RelationshipLabel;
              setRequesterLabel(next);
              setRecipientLabel(defaultReciprocalLabel(next));
            }}
          >
            {RELATIONSHIP_LABEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          They are your
          <Select value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value as RelationshipLabel)}>
            {RELATIONSHIP_LABEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="gap-2" disabled={isCreating} onClick={createInvite} type="button">
          {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Create invite
        </Button>
        <Button className="gap-2" disabled={!inviteUrl} onClick={copyInvite} type="button" variant="outline">
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy link
        </Button>
      </div>

      {inviteUrl ? (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-background/60 p-3 text-sm text-muted-foreground">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">{inviteUrl}</span>
        </div>
      ) : null}
      {status ? <p className="text-sm text-primary">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
