import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: some pages (e.g. login, which renders both
  // <Wordmark /> and <AuthBrandPanel />) mount more than one LogoMark at
  // once. A hardcoded gradient id would collide as a duplicate DOM id,
  // which breaks the fill="url(#...)" reference on at least one instance.
  const gradientId = `provnLogoGradient-${useId()}`;
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      {/* Shield: a verified-credential silhouette, not just a rounded square —
          reads distinctly as "proof/trust" at both 16px favicon and hero size. */}
      <path
        d="M18 10h28q4 0 4 4v14q0 18-18 32Q14 46 14 28V14q0-4 4-4Z"
        fill={`url(#${gradientId})`}
      />
      {/* Checkmark whose long stroke resolves into an upward arrow tip —
          "proven, then growing" in one continuous glyph. */}
      <path
        d="M21 33l6 8 17-22"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 19v8M44 19h-8"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const iconSize =
    size === "xl"
      ? "h-14 w-14"
      : size === "lg"
        ? "h-10 w-10"
        : size === "sm"
          ? "h-6 w-6"
          : "h-8 w-8";
  const text =
    size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={iconSize} />
      <span
        className={cn(
          "font-display font-bold tracking-[0.14em] text-[#0B1E4A] dark:text-white",
          text,
        )}
      >
        PROVN
      </span>
    </div>
  );
}
