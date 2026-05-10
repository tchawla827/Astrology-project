import type { Metadata } from "next";
import { Fraunces, Source_Serif_4 } from "next/font/google";

import { BRAND_NAME } from "@/components/brand/BrandLogo";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://naksha.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: "Structured Vedic astrology insights built from your birth chart, timing, and transparent reasoning.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
  openGraph: {
    title: BRAND_NAME,
    description: "Structured Vedic astrology insights built from your birth chart, timing, and transparent reasoning.",
    url: siteUrl,
    siteName: BRAND_NAME,
    images: [{ url: "/bg.png", width: 1200, height: 630, alt: "Naksha astrology workspace" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
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
      <body className={`${sourceSerif.className} ${fraunces.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
