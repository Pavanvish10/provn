import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Wordmark } from "@/components/Logo";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useUpdateProfile } from "@/lib/profile-client";

const CITIES = [
  "Bengaluru, India",
  "Hyderabad, India",
  "Mumbai, India",
  "Delhi NCR, India",
  "Pune, India",
  "Chennai, India",
  "Kolkata, India",
  "Ahmedabad, India",
  "Remote · India",
  "London, UK",
  "New York, USA",
  "San Francisco, USA",
  "Berlin, Germany",
  "Singapore",
  "Dubai, UAE",
  "Toronto, Canada",
];

export const Route = createFileRoute("/location")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Where are you based? · Provn" },
      {
        name: "description",
        content: "Tell Provn where you are so we can tailor roles and roadmaps.",
      },
      { property: "og:title", content: "Where are you based? · Provn" },
      { property: "og:description", content: "Location keeps your recommendations relevant." },
    ],
  }),
  component: LocationPage,
});

function LocationPage() {
  const nav = useNavigate();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile(user?.id);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      (q ? CITIES.filter((c) => c.toLowerCase().includes(q.toLowerCase())) : CITIES).slice(0, 8),
    [q],
  );

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProfile.mutateAsync({ location: selected });
      nav({ to: "/profession" });
    } catch {
      setSubmitError("Couldn't save your location. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Wordmark />
        </Link>
        <DarkModeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl grid-cols-1 gap-16 px-6 pb-16 lg:grid-cols-2 lg:items-center">
        {/* Brand column continuing the theme */}
        <div className="order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft via-background to-background p-10">
            <div className="absolute inset-0 grid-dots opacity-60" />
            <div className="relative">
              <div className="text-xs uppercase tracking-[0.3em] text-brand">Why Provn</div>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Local roles.
                <br /> Global standards.
              </h2>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                We use your city to match you with hybrid, on‑site, and remote roles nearby — and to
                calibrate salary bands honestly.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Curated roles within commute range",
                  "Cost‑of‑living aware salary ranges",
                  "Chapters &amp; meetups near you",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                    <span
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: t }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Step 2 of 6 · Location
          </span>
          <h1 className="mt-5 font-display text-5xl leading-tight tracking-tight sm:text-6xl">
            Where are you based?
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Pick your city — we’ll tune roles, meetups, and salary ranges accordingly.
          </p>

          <div className="relative mt-8">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSelected(null);
              }}
              placeholder="Search city or country…"
              className="h-12 pl-10"
            />
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-card">
            {filtered.map((c) => (
              <button
                key={c}
                onClick={() => setSelected(c)}
                className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-muted ${
                  selected === c ? "bg-muted" : ""
                }`}
              >
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{c}</span>
                {selected === c && <span className="ml-auto text-xs text-brand">Selected</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No matches — try another name.
              </div>
            )}
          </div>

          {submitError && <p className="mt-4 text-sm text-destructive">{submitError}</p>}
          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => nav({ to: "/value-prop" })}>
              Back
            </Button>
            <Button
              size="lg"
              disabled={!selected || submitting}
              onClick={submit}
              className="ml-auto"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
