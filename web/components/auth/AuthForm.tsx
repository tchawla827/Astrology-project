"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError = query.get("error_description") ?? hash.get("error_description") ?? query.get("error");

    if (authError) {
      setMessage(authError);
    }
  }, []);

  function requestedNext() {
    const query = new URLSearchParams(window.location.search);
    return query.get("next") ?? (mode === "login" ? "/dashboard" : "/welcome");
  }

  function callbackUrl() {
    const query = new URLSearchParams(window.location.search);
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", query.get("next") ?? "/welcome");
    return url.toString();
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    const supabase = createClient();

    const redirectTo = callbackUrl();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });

    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "login") {
      window.location.assign(requestedNext());
      return;
    }

    setMessage("Check your email to confirm your account.");
  }

  async function handleGoogle() {
    setMessage(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });

    if (result.error) {
      setIsSubmitting(false);
      setMessage(result.error.message);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleEmailAuth}>
      <Input
        aria-label="Email"
        autoComplete="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />
      <Input
        aria-label="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={8}
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        required
        type="password"
        value={password}
      />
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {mode === "login" ? "Log in" : "Sign up"}
      </Button>
      {googleAuthEnabled ? (
        <Button className="w-full" disabled={isSubmitting} onClick={handleGoogle} type="button" variant="outline">
          Continue with Google
        </Button>
      ) : null}
      {message ? <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
