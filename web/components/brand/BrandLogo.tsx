import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  label?: string;
  showText?: boolean;
};

export const BRAND_NAME = "Naksha";
export const BRAND_TAGLINE = "Vedic chart intelligence";

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/35 bg-primary/10 text-primary shadow-bronze",
        className,
      )}
    >
      <svg className="h-7 w-7" fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2.5 29.5 16 16 29.5 2.5 16 16 2.5Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M16 7.5 24.5 16 16 24.5 7.5 16 16 7.5Z" stroke="currentColor" strokeOpacity="0.68" strokeWidth="1.4" />
        <path d="M16 3.5v25M3.5 16h25" stroke="currentColor" strokeOpacity="0.42" strokeWidth="1.2" />
        <circle cx="16" cy="16" fill="currentColor" r="2.15" />
      </svg>
    </span>
  );
}

export function BrandLogo({
  href = "/",
  className,
  markClassName,
  textClassName,
  label = BRAND_NAME,
  showText = true,
}: BrandLogoProps) {
  return (
    <Link
      aria-label={`${label} home`}
      className={cn("group inline-flex items-center gap-3 text-primary", className)}
      href={href}
    >
      <LogoMark className={markClassName} />
      {showText ? (
        <span className={cn("font-display text-3xl font-semibold leading-none text-glow", textClassName)}>
          {label}
        </span>
      ) : null}
    </Link>
  );
}
