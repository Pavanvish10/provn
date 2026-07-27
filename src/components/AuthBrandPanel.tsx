import { ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function AuthBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden border-l border-border bg-gradient-to-br from-brand-soft via-background to-background lg:block">
      <div className="absolute inset-0 grid-dots opacity-60" />
      <div className="relative flex h-full flex-col items-center justify-center px-16 text-center">
        <LogoMark className="h-16 w-16" />
        <div className="mt-6 font-display text-6xl tracking-tight">Provn</div>
        <div className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Prove Your Skills. Unlock Your Career.
        </div>
        <div className="mt-16 font-display text-7xl italic text-foreground/90">Let's Prove.</div>

        <div className="mt-16 grid w-full max-w-md grid-cols-3 gap-3 text-left">
          <MiniStat icon={<ShieldCheck className="h-4 w-4" />} k="12k+" v="Skills verified" />
          <MiniStat icon={<Trophy className="h-4 w-4" />} k="2.4k" v="Hired last year" />
          <MiniStat icon={<Sparkles className="h-4 w-4" />} k="98%" v="Would refer" />
        </div>
      </div>
    </section>
  );
}

function MiniStat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
      <div className="mb-1 text-brand">{icon}</div>
      <div className="font-display text-2xl">{k}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{v}</div>
    </div>
  );
}

export function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.75 3.97 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.63-3.65 8.63-8.79 0-.59-.06-1.04-.13-1.11Z"
        fill="currentColor"
      />
    </svg>
  );
}
