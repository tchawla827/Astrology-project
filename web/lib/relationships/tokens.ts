export function generateRelationshipToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const RELATIONSHIP_TOKEN_PATTERN = /^[a-f0-9]{36}$/i;

export function getRelationshipInvitePath(token: string) {
  return `/relationships/invite/${token}`;
}

export function getRelationshipInviteUrl(token: string, origin?: string | null) {
  const siteUrl =
    origin?.replace(/\/$/, "") ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
        : "http://localhost:3000");
  return `${siteUrl}${getRelationshipInvitePath(token)}`;
}

export function extractRelationshipInviteToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (RELATIONSHIP_TOKEN_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const pathMatch = trimmed.match(/\/relationships\/invite\/([a-f0-9]{36})(?:[/?#\s]|$)/i);
  if (pathMatch?.[1]) {
    return pathMatch[1].toLowerCase();
  }

  try {
    const url = new URL(trimmed);
    const token = url.pathname.split("/").filter(Boolean).at(-1);
    return token && RELATIONSHIP_TOKEN_PATTERN.test(token) ? token.toLowerCase() : null;
  } catch {
    return null;
  }
}
