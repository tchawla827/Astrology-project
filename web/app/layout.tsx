import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astri.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Astri",
    template: "%s | Astri",
  },
  description: "Structured Vedic astrology insights built from your birth chart, timing, and transparent reasoning.",
  openGraph: {
    title: "Astri",
    description: "Structured Vedic astrology insights built from your birth chart, timing, and transparent reasoning.",
    url: siteUrl,
    siteName: "Astri",
    images: [{ url: "/bg.png", width: 1200, height: 630, alt: "Astri astrology workspace" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Astri",
    description: "Structured Vedic astrology insights built from your birth chart, timing, and transparent reasoning.",
    images: ["/bg.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
