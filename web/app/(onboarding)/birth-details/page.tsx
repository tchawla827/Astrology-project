"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BirthDatePicker } from "@/components/onboarding/BirthDatePicker";
import { PlaceAutocomplete, type PlaceSelection } from "@/components/onboarding/PlaceAutocomplete";
import { TimeInput } from "@/components/onboarding/TimeInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type FieldErrors = Record<string, string[]>;

export default function BirthDetailsPage() {
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

    setIsSubmitting(false);
    const body = (await response.json()) as { birth_profile_id?: string; errors?: FieldErrors; error?: string };
    if (!response.ok) {
      setErrors(body.errors ?? { form: [body.error ?? "Could not create profile."] });
      return;
    }

    router.push(`/generating?id=${body.birth_profile_id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-10">
      <p className="text-sm uppercase tracking-widest text-primary">Step 3</p>
      <h1 className="mt-3 text-3xl font-semibold">Enter birth details</h1>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input id="name" onChange={(event) => setName(event.target.value)} required value={name} />
          {errors.name?.map((error) => <p className="text-xs text-destructive" key={error}>{error}</p>)}
        </div>
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
        <Button disabled={isSubmitting} type="submit">
          Generate profile
        </Button>
      </form>
    </main>
  );
}
