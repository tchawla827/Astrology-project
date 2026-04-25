import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getSiteUrl, loadPublicSharePayload, makeShareUrl, type SupabaseShareClient } from "@/lib/sharing/tokens";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SharePageProps = {
  params: { id: string };
};

async function loadShare(id: string) {
  const supabase = createClient();
  return loadPublicSharePayload({
    supabase: supabase as unknown as SupabaseShareClient,
    token: id,
  });
}

function confidenceClass(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "low":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const payload = await loadShare(params.id).catch(() => null);
  if (!payload) {
    return {
      title: "Shared Astri answer not found",
    };
  }

  const shareUrl = makeShareUrl(payload.token);
  const imageUrl = `${getSiteUrl()}/api/og/ask/${payload.token}`;

  return {
    title: `${payload.answer.verdict} | Astri`,
    description: payload.answer.timing.summary,
    alternates: { canonical: shareUrl },
    openGraph: {
      title: "Astri shared answer",
      description: payload.answer.verdict,
      url: shareUrl,
      siteName: "Astri",
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "Astri shared answer card" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Astri shared answer",
      description: payload.answer.verdict,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const payload = await loadShare(params.id).catch(() => null);
  if (!payload) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-5 border-b pb-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-primary">Astri</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge className="capitalize text-muted-foreground">{payload.topic}</Badge>
              <Badge className="capitalize text-muted-foreground">{payload.tone_mode}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Verdict</p>
            <h1 className="font-serif text-3xl leading-tight sm:text-5xl">{payload.answer.verdict}</h1>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Why</h2>
          <ul className="space-y-3">
            {payload.answer.why.map((item) => (
              <li className="flex gap-3 text-base leading-7 text-muted-foreground" key={item}>
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Timing</h2>
          <p className="text-base leading-7 text-muted-foreground">{payload.answer.timing.summary}</p>
          <div className="flex flex-wrap gap-2">
            {payload.answer.timing.type.map((type) => (
              <Badge className="capitalize text-muted-foreground" key={type}>
                {type}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Confidence</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("capitalize", confidenceClass(payload.answer.confidence.level))}>
              {payload.answer.confidence.level}
            </Badge>
            <span className="text-sm leading-6 text-muted-foreground">{payload.answer.confidence.note}</span>
          </div>
        </section>

        <footer className="border-t pt-5 text-sm text-muted-foreground">
          {payload.charts_used.length > 0 ? `Based on ${payload.charts_used.join(" / ")}` : "Based on the chart"}.
        </footer>
      </article>
    </main>
  );
}
