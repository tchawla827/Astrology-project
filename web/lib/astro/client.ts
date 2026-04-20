type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AstroRequest = Record<string, JsonValue>;
export type AstroResponse = Record<string, JsonValue>;

export class AstroEngineError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AstroEngineError";
  }
}

async function callAstroEngine<TResponse extends AstroResponse>(
  path: string,
  body: AstroRequest
): Promise<TResponse> {
  const baseUrl = process.env.ASTRO_ENGINE_URL;
  const secret = process.env.ASTRO_ENGINE_SECRET;

  if (!baseUrl || !secret) {
    throw new AstroEngineError("Astro engine environment is not configured.", 500);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Astro-Secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AstroEngineError(`Astro engine request failed: ${response.status}`, response.status);
  }

  return (await response.json()) as TResponse;
}

export async function generateProfile(body: AstroRequest) {
  return callAstroEngine("/profile", body);
}

export async function getChart(body: AstroRequest) {
  return callAstroEngine("/charts", body);
}

export async function getDasha(body: AstroRequest) {
  return callAstroEngine("/dasha", body);
}

export async function getTransits(body: AstroRequest) {
  return callAstroEngine("/transits", body);
}

export async function getPanchang(body: AstroRequest) {
  return callAstroEngine("/panchang", body);
}
