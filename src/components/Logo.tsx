import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="provnLogoGradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#provnLogoGradient)" />
      {/* Stylized P with integrated checkmark */}
      <path
        d="M18 46V18h16.5a10 10 0 0 1 0 20H26"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 34.5 28 40l12-13"
        stroke="#FFFFFF"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const iconSize =
    size === "xl" ? "h-14 w-14" : size === "lg" ? "h-10 w-10" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
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
