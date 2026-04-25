"use client";

import { Download, ExternalLink, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ToneMode } from "@/lib/schemas";

type Props = {
  name: string;
  email: string;
  defaultToneMode: ToneMode;
  ayanamsha: "lahiri" | "raman" | "kp";
  hasStripeCustomer: boolean;
  subscriptionLabel: string;
};

export function ProfileSettingsForm({
  name,
  email,
  defaultToneMode,
  ayanamsha,
  hasStripeCustomer,
  subscriptionLabel,
}: Props) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [tone, setTone] = useState<ToneMode>(defaultToneMode);
  const [draftAyanamsha, setDraftAyanamsha] = useState(ayanamsha);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function parseJson(response: Response) {
    return (await response.json().catch(() => ({}))) as { error?: string; url?: string; regeneration_started?: boolean };
  }

  async function saveSettings() {
    setIsWorking(true);
    setError(null);
    setStatus(null);
    const response = await fetch("/api/profile/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftName, default_tone_mode: tone, ayanamsha: draftAyanamsha }),
    });
    const body = await parseJson(response);
    setIsWorking(false);
    if (!response.ok) {
      setError(body.error ?? "Could not save profile settings.");
      return;
    }
    setStatus(body.regeneration_started ? "Settings saved. Chart recomputation has started." : "Settings saved.");
    router.refresh();
  }

  async function openPortal() {
    setIsWorking(true);
    setError(null);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await parseJson(response);
    setIsWorking(false);
    if (!response.ok || !body.url) {
      setError(body.error ?? "Could not open billing portal.");
      return;
    }
    window.location.assign(body.url);
  }

  async function exportPdf() {
    setIsWorking(true);
    setError(null);
    setStatus(null);
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "basic_report_pdf" }),
    });
    const body = await parseJson(response);
    setIsWorking(false);
    if (!response.ok || !body.url) {
      setError(body.error ?? "Could not export PDF.");
      return;
    }
    window.location.assign(body.url);
  }

  async function deleteAccount() {
    setIsWorking(true);
    setError(null);
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: deleteConfirmation }),
    });
    const body = await parseJson(response);
    setIsWorking(false);
    if (!response.ok) {
      setError(body.error ?? "Could not delete account.");
      return;
    }
    window.location.assign("/signup");
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          Display name
          <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Email
          <Input readOnly value={email} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Default tone
          <Select value={tone} onChange={(event) => setTone(event.target.value as ToneMode)}>
            <option value="balanced">Balanced</option>
            <option value="direct">Direct</option>
            <option value="brutal">Brutal</option>
          </Select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Ayanamsha
          <Select value={draftAyanamsha} onChange={(event) => setDraftAyanamsha(event.target.value as Props["ayanamsha"])}>
            <option value="lahiri">Lahiri</option>
            <option value="raman">Raman</option>
            <option value="kp">KP</option>
          </Select>
        </label>
      </section>

      {draftAyanamsha !== ayanamsha ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          Changing ayanamsha saves the new setting and recomputes the latest chart snapshot.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button className="gap-2" disabled={isWorking} onClick={saveSettings} type="button">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save settings
        </Button>
        <Button className="gap-2" disabled={isWorking} onClick={exportPdf} type="button" variant="outline">
          <Download className="h-4 w-4" aria-hidden="true" />
          Export PDF
        </Button>
      </div>

      <section className="rounded-md border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Subscription</h2>
            <p className="text-sm text-muted-foreground">{subscriptionLabel}</p>
          </div>
          {hasStripeCustomer ? (
            <Button className="gap-2" disabled={isWorking} onClick={openPortal} type="button" variant="outline">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Manage
            </Button>
          ) : (
            <Button asChild variant="outline">
              <a href="/pricing">View pricing</a>
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-destructive/40 p-4">
        <div>
          <h2 className="font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">Hard-deletes account data, storage exports, share cards, and the auth user.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Delete confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder='Type "DELETE"'
            value={deleteConfirmation}
          />
          <Button
            className="gap-2"
            disabled={isWorking || deleteConfirmation !== "DELETE"}
            onClick={deleteAccount}
            type="button"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete account
          </Button>
        </div>
      </section>

      {status ? <p className="text-sm text-primary">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
