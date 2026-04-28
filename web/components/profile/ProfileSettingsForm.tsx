"use client";

import { Download, LoaderCircle, Save, Trash2 } from "lucide-react";
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
  subscriptionLabel: string;
};

export function ProfileSettingsForm({
  name,
  email,
  defaultToneMode,
  ayanamsha,
  subscriptionLabel,
}: Props) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [tone, setTone] = useState<ToneMode>(defaultToneMode);
  const [draftAyanamsha, setDraftAyanamsha] = useState(ayanamsha);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workingAction, setWorkingAction] = useState<"save" | "export" | "delete" | null>(null);
  const isWorking = workingAction !== null;

  async function parseJson(response: Response) {
    return (await response.json().catch(() => ({}))) as { error?: string; url?: string; regeneration_started?: boolean };
  }

  async function saveSettings() {
    setWorkingAction("save");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, default_tone_mode: tone, ayanamsha: draftAyanamsha }),
      });
      const body = await parseJson(response);
      if (!response.ok) {
        setError(body.error ?? "Could not save profile settings.");
        return;
      }
      setStatus(body.regeneration_started ? "Settings saved. Chart recomputation has started." : "Settings saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile settings.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function exportPdf() {
    setWorkingAction("export");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "basic_report_pdf" }),
      });
      const body = await parseJson(response);
      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not export PDF.");
        return;
      }
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not export PDF.");
      setWorkingAction(null);
    }
  }

  async function deleteAccount() {
    setWorkingAction("delete");
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const body = await parseJson(response);
      if (!response.ok) {
        setError(body.error ?? "Could not delete account.");
        setWorkingAction(null);
        return;
      }
      window.location.assign("/signup");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete account.");
      setWorkingAction(null);
    }
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
          {workingAction === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {workingAction === "save" ? "Saving..." : "Save settings"}
        </Button>
        <Button className="gap-2" disabled={isWorking} onClick={exportPdf} type="button" variant="outline">
          {workingAction === "export" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {workingAction === "export" ? "Preparing PDF..." : "Export PDF"}
        </Button>
      </div>

      <section className="rounded-lg border border-primary/15 bg-background/45 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Plan</h2>
            <p className="text-sm text-muted-foreground">{subscriptionLabel}</p>
          </div>
          <p className="text-sm text-muted-foreground">All current features are included.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
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
            {workingAction === "delete" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            {workingAction === "delete" ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </section>

      {workingAction ? (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary" role="status" aria-live="polite">
          {workingAction === "save"
            ? "Saving settings and checking whether the chart needs recomputation..."
            : workingAction === "export"
              ? "Preparing the report export..."
              : "Deleting account data..."}
        </p>
      ) : null}
      {status ? <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">{status}</p> : null}
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
