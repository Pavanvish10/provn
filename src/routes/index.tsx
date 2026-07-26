import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowRight, Mail, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { setState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Provn — Prove Your Skills. Unlock Your Career." },
      { name: "description", content: "Sign in to Provn: learn, verify, prove your skills, and get hired." },
      { property: "og:title", content: "Provn — Prove Your Skills. Unlock Your Career." },
      { property: "og:description", content: "The career platform where students get hired for what they can actually do." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [howItWorks, setHowItWorks] = useState(false);
  const [terms, setTerms] = useState(false);

  const signIn = (name?: string) => {
    setState({ authed: true, email: email || "you@provn.app", name: name || "You" });
    nav({ to: "/value-prop" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute right-5 top-5 z-20">
        <DarkModeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left — login */}
        <section className="relative flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 lg:py-16">
          <Link to="/" className="lg:hidden"><Wordmark /></Link>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Invite‑only beta · Cohort 04
            </span>
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Welcome to <br /> Provn Community
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Sign in to start proving what you can actually do — beyond the résumé.
            </p>

            <div className="mt-8 space-y-3">
              {!emailMode ? (
                <>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-center gap-2 border-border bg-card text-foreground hover:bg-muted"
                    onClick={() => signIn("Aarav")}
                  >
                    <GoogleGlyph /> Sign in with Google
                  </Button>
                  <Button
                    className="h-11 w-full justify-center gap-2"
                    onClick={() => setEmailMode(true)}
                  >
                    <Mail className="h-4 w-4" /> Sign in with Email
                  </Button>
                </>
              ) : (
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoFocus
                    placeholder="you@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setEmailMode(false)}>Back</Button>
                    <Button className="flex-1" onClick={() => signIn()}>
                      Continue <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <p className="pt-1 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => signIn()} className="font-medium text-foreground underline-offset-4 hover:underline">
                  Login
                </button>
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-10 space-y-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <button onClick={() => setTerms(true)} className="hover:text-foreground underline-offset-4 hover:underline">
                Terms &amp; Conditions
              </button>
              <span className="opacity-30">•</span>
              <button onClick={() => setHowItWorks(true)} className="hover:text-foreground underline-offset-4 hover:underline">
                See how it works →
              </button>
            </div>
            <p>© {new Date().getFullYear()} Provn Labs · Made for people who’d rather build than talk.</p>
          </div>
        </section>

        {/* Right — brand panel */}
        <section className="relative hidden overflow-hidden border-l border-border bg-gradient-to-br from-brand-soft via-background to-background lg:block">
          <div className="absolute inset-0 grid-dots opacity-60" />
          <div className="relative flex h-full flex-col items-center justify-center px-16 text-center">
            <LogoMark className="h-16 w-16" />
            <div className="mt-6 font-display text-6xl tracking-tight">Provn</div>
            <div className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Prove Your Skills. Unlock Your Career.
            </div>
            <div className="mt-16 font-display text-7xl italic text-foreground/90">Let’s Prove.</div>

            <div className="mt-16 grid w-full max-w-md grid-cols-3 gap-3 text-left">
              <MiniStat icon={<ShieldCheck className="h-4 w-4" />} k="12k+" v="Skills verified" />
              <MiniStat icon={<Trophy className="h-4 w-4" />} k="2.4k" v="Hired last year" />
              <MiniStat icon={<Sparkles className="h-4 w-4" />} k="98%" v="Would refer" />
            </div>
          </div>
        </section>
      </div>

      {/* How it works */}
      <Dialog open={howItWorks} onOpenChange={setHowItWorks}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">How Provn works</DialogTitle>
            <DialogDescription>Four steps. One connected journey.</DialogDescription>
          </DialogHeader>
          <ol className="mt-2 space-y-4">
            {[
              { t: "Learn", d: "Follow an AI‑personalized roadmap with structured lessons and video lectures for your role.", icon: <BookIcon /> },
              { t: "Verify", d: "Take short, adaptive skill tests. Passing adds a verified skill to your public profile.", icon: <ShieldCheck className="h-5 w-5" /> },
              { t: "Prove", d: "Ship real projects, keep a daily coding streak, and pass an AI mock interview.", icon: <Target className="h-5 w-5" /> },
              { t: "Get hired", d: "Once verified, browse roles and apply — recruiters see proof, not just a résumé.", icon: <Trophy className="h-5 w-5" /> },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4 rounded-lg border border-border p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-foreground">
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Step {i + 1}</div>
                  <div className="font-medium">{s.t}</div>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* Terms */}
      <Dialog open={terms} onOpenChange={setTerms}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">Terms &amp; Conditions</DialogTitle>
            <DialogDescription>Summary — effective on account creation.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2 text-sm leading-relaxed text-muted-foreground">
            <p><span className="text-foreground font-medium">1. Your account &amp; data.</span> Provn stores the information you share — résumé content, education, projects, and test results — to build your public profile and improve AI recommendations. You can export or delete your account at any time.</p>
            <p><span className="text-foreground font-medium">2. AI features.</span> Résumé analysis, mock interviews, coding‑test generation, and roadmap suggestions are produced by AI models. Outputs may contain errors. Treat scores as guidance, not final judgments, and never share private credentials with the AI.</p>
            <p><span className="text-foreground font-medium">3. Skill verification.</span> Verified badges are earned by passing timed, proctored‑style assessments. Cheating, sharing answers, or using unauthorized assistance results in badge removal and possible account suspension.</p>
            <p><span className="text-foreground font-medium">4. Hiring &amp; recruiters.</span> Applying to a listing shares your verified profile, résumé, and consented contact details with the employer. Provn is not the employer and does not guarantee offers, salary, or outcomes.</p>
            <p><span className="text-foreground font-medium">5. Payments.</span> Subscriptions (₹299/mo Pro) renew until cancelled. You can cancel any time; access continues until the end of the current billing cycle. Taxes may apply based on your location.</p>
            <p><span className="text-foreground font-medium">6. Conduct.</span> Feed posts, comments, and messages must be respectful and truthful about your work. Harassment, impersonation, or misrepresentation of skills leads to removal.</p>
            <p><span className="text-foreground font-medium">7. Changes.</span> We may update these terms; material changes will be notified in‑app at least 14 days before taking effect.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.75 3.97 14.6 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.63-3.65 8.63-8.79 0-.59-.06-1.04-.13-1.11Z" fill="currentColor" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M8 7h8M8 11h6" strokeLinecap="round" />
    </svg>
  );
}
