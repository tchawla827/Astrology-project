"use client";

import { Link2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractRelationshipInviteToken, getRelationshipInvitePath } from "@/lib/relationships/tokens";

export function RelationshipInviteLinkForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = extractRelationshipInviteToken(value);
    if (!token) {
      setError("Paste a valid relationship invite link or token.");
      return;
    }
    setError(null);
    router.push(getRelationshipInvitePath(token));
  }

  return (
    <form className="space-y-3" onSubmit={submitInvite}>
      <label className="block text-sm font-medium" htmlFor="relationship-invite-link">
        Paste invite link
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-1">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-primary" aria-hidden="true" />
          <Input
            autoComplete="off"
            className="pl-9"
            id="relationship-invite-link"
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Paste link or token"
            value={value}
          />
        </div>
        <Button className="gap-2" type="submit" variant="outline">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Open
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Use this when someone sends you a relationship invite outside Naksha.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
