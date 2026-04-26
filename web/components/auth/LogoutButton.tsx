"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    setError(null);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setIsSigningOut(false);
      return;
    }

    window.location.assign("/login");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button className="gap-2" disabled={isSigningOut} onClick={signOut} size="sm" type="button" variant="outline">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? "Signing out..." : "Log out"}
      </Button>
      {error ? <p className="max-w-48 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
