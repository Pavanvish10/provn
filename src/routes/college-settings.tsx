import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Users2, UserPlus, X } from "lucide-react";

import { CollegeShell } from "@/components/CollegeNav";
import { requireCollegeAccount } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useMyCollege,
  useCollegeAdmins,
  useAddCollegeAdmin,
  useRemoveCollegeAdmin,
} from "@/lib/college-client";
import { findProfileByEmail } from "@/lib/company-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/college-settings")({
  beforeLoad: requireCollegeAccount,
  head: () => ({ meta: [{ title: "Settings · Provn College" }] }),
  component: CollegeSettings,
});

function CollegeSettings() {
  const { data: user } = useCurrentUser();
  const { data: membership, isLoading } = useMyCollege(user?.id);
  const canManageTeam = membership?.role === "owner" || membership?.role === "admin";

  return (
    <CollegeShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has placement-office access to this dashboard.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !membership ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No college yet.
        </div>
      ) : canManageTeam ? (
        <TeamPanel collegeId={membership.college.id} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Only college owners and admins can manage the team. Your role is{" "}
          <span className="text-foreground">{membership.role}</span>.
        </div>
      )}
    </CollegeShell>
  );
}

function TeamPanel({ collegeId }: { collegeId: string }) {
  const { data: members = [], isLoading } = useCollegeAdmins(collegeId);
  const addMember = useAddCollegeAdmin(collegeId);
  const removeMember = useRemoveCollegeAdmin(collegeId);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const addByEmail = async () => {
    setError(null);
    if (!email.trim()) return;
    setSearching(true);
    try {
      const profile = await findProfileByEmail(email);
      if (!profile) {
        setError("No Provn account found with that email.");
        return;
      }
      if (members.some((m) => m.profile_id === profile.id)) {
        setError("Already on the team.");
        return;
      }
      await addMember.mutateAsync({ profileId: profile.id });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 font-display text-lg">
        <Users2 className="h-4 w-4 text-brand" /> Placement office team
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Teammate's Provn email"
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addByEmail();
            }
          }}
        />
        <Button onClick={addByEmail} disabled={searching || !email.trim()}>
          {searching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-1.5 h-4 w-4" />
          )}{" "}
          Add
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-4 space-y-1.5">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : members.length === 0 ? (
          <p className="text-xs text-muted-foreground">Just you so far.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">
                  {m.profile?.full_name ?? m.profile?.email ?? "Unknown"}
                </span>
                <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {m.role}
                </span>
              </div>
              {m.role !== "owner" && (
                <button
                  onClick={() => removeMember.mutate(m.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
