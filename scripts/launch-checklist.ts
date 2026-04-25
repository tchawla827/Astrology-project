type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const requiredEnv = [
  "NEXT_PUBLIC_SITE_URL",
  "ASTRO_ENGINE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

async function checkHttp(name: string, url: string): Promise<CheckResult> {
  try {
    const response = await fetch(url, { method: "GET" });
    return {
      name,
      ok: response.ok,
      detail: `${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : "request failed",
    };
  }
}

async function main() {
  const envResults: CheckResult[] = requiredEnv.map((key) => ({
    name: `env:${key}`,
    ok: Boolean(process.env[key]),
    detail: process.env[key] ? "set" : "missing",
  }));

  const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const astroBaseUrl = process.env.ASTRO_ENGINE_URL;
  const httpResults = await Promise.all([
    publicBaseUrl ? checkHttp("web:/", publicBaseUrl) : Promise.resolve({ name: "web:/", ok: false, detail: "NEXT_PUBLIC_SITE_URL missing" }),
    astroBaseUrl
      ? checkHttp("astro:/health", `${astroBaseUrl.replace(/\/$/, "")}/health`)
      : Promise.resolve({ name: "astro:/health", ok: false, detail: "ASTRO_ENGINE_URL missing" }),
  ]);

  const results = [...envResults, ...httpResults];
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status} ${result.name} - ${result.detail}`);
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
