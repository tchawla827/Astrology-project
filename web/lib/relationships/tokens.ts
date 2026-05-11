export function generateRelationshipToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getRelationshipInviteUrl(token: string, origin?: string | null) {
  const siteUrl =
    origin?.replace(/\/$/, "") ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
        : "http://localhost:3000");
  return `${siteUrl}/relationships/invite/${token}`;
}
