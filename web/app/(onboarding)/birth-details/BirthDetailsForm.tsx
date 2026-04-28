"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, LoaderCircle, MapPin, UserRound } from "lucide-react";

import { BirthDatePicker } from "@/components/onboarding/BirthDatePicker";
import { PlaceAutocomplete, type PlaceSelection } from "@/components/onboarding/PlaceAutocomplete";
import { TimeInput } from "@/components/onboarding/TimeInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type FieldErrors = Record<string, string[]>;

export function BirthDetailsForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00:00");
  const [confidence, setConfidence] = useState<"exact" | "approximate" | "unknown">("exact");
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [ayanamsha, setAyanamsha] = useState("lahiri");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedConfidence = window.localStorage.getItem("astri:birth_time_confidence");
    if (storedConfidence === "exact" || storedConfidence === "approximate" || storedConfidence === "unknown") {
      setConfidence(storedConfidence);
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          birth_date: birthDate,
          birth_time: confidence === "unknown" ? undefined : birthTime,
          birth_time_confidence: confidence,
          birth_place_text: place?.label ?? "",
          latitude: place?.latitude,
          longitude: place?.longitude,
          timezone: place?.timezone,
          ayanamsha,
          onboarding_intent: window.localStorage.getItem("astri:onboarding_intent") ?? "full-chart",
        }),
      });

      const body = (await response.json()) as { birth_profile_id?: string; errors?: FieldErrors; error?: string };
      if (!response.ok) {
        setErrors(body.errors ?? { form: [body.error ?? "Could not create profile."] });
        setIsSubmitting(false);
        return;
      }
      if (!body.birth_profile_id) {
        setErrors({ form: ["Profile creation did not return an id."] });
        setIsSubmitting(false);
        return;
      }

      router.push(`/generating?id=${body.birth_profile_id}`);
    } catch (caught) {
      setErrors({ form: [caught instanceof Error ? caught.message : "Could not create profile."] });
      setIsSubmitting(false);
    }
  }

  return (
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <Card className="luxury-panel relative w-full max-w-5xl overflow-hidden p-6 sm:p-8">
        <div className="celestial-grid absolute inset-0 opacity-20" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-lg border border-primary/15 bg-background/45 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Step 3</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow">Enter birth details</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              These fields become the source data for every chart, life-area report, daily timing window, and Ask answer.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              {[
                { icon: UserRound, label: "Identity", copy: "Profile label and account defaults." },
                { icon: CalendarClock, label: "Time", copy: "Birth date, time, and confidence." },
                { icon: MapPin, label: "Place", copy: "Coordinates and timezone resolution." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="flex gap-3 rounded-md border border-primary/10 bg-card/60 p-3" key={item.label}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Name
              </label>
              <Input id="name" onChange={(event) => setName(event.target.value)} required value={name} />
              {errors.name?.map((error) => <p className="text-xs text-destructive" key={error}>{error}</p>)}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="birth-date">
                  Birth date
                </label>
                <BirthDatePicker id="birth-date" onChange={setBirthDate} required value={birthDate} />
                {errors.birth_date?.map((error) => <p className="text-xs text-destructive" key={error}>{error}</p>)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Birth time</label>
                <TimeInput disabled={confidence === "unknown"} onChange={setBirthTime} value={birthTime} />
                {confidence === "unknown" ? <p className="text-xs text-muted-foreground">Noon will be used for calculation.</p> : null}
                {errors.birth_time?.map((error) => <p className="text-xs text-destructive" key={error}>{error}</p>)}
              </div>
            </div>
            <PlaceAutocomplete onSelect={setPlace} />
            {place ? <p className="text-xs text-muted-foreground">Resolved timezone: {place.timezone}</p> : null}
            {errors.birth_place_text?.map((error) => <p className="text-xs text-destructive" key={error}>{error}</p>)}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ayanamsha">
                Ayanamsha
              </label>
              <Select id="ayanamsha" onChange={(event) => setAyanamsha(event.target.value)} value={ayanamsha}>
                <option value="lahiri">Lahiri</option>
                <option value="raman">Raman</option>
                <option value="kp">KP</option>
              </Select>
            </div>
            {errors.form?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
            <Button className="gap-2" disabled={isSubmitting} type="submit">
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {isSubmitting ? "Starting calculation..." : "Generate profile"}
            </Button>
            {isSubmitting ? (
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                Creating the profile and handing chart calculation to the generator...
              </p>
            ) : null}
          </form>
        </div>
      </Card>
    </main>
  );
}
