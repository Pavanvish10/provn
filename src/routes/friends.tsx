import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Check, X, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useProfile } from "@/lib/profile-client";
import {
  useFriendSearch,
  useIncomingRequests,
  useOutgoingRequests,
  useFriendsList,
  useSuggestedPeople,
  useSendFriendRequest,
  useAcceptRequest,
  useDeleteFriendship,
  useMutualFriendsCount,
  type ProfileLite,
} from "@/lib/friends-client";

export const Route = createFileRoute("/friends")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Friends · Provn" },
      { name: "description", content: "Find and add friends by name or username on Provn." },
      { property: "og:title", content: "Friends · Provn" },
      { property: "og:description", content: "Grow your circle of makers." },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useProfile(user?.id);
  const [q, setQ] = useState("");

  const search = useFriendSearch(user?.id, q);
  const incoming = useIncomingRequests(user?.id);
  const outgoing = useOutgoingRequests(user?.id);
  const friends = useFriendsList(user?.id);
  const suggestions = useSuggestedPeople(user?.id, profile?.target_role, 8);

  const sendRequest = useSendFriendRequest(user?.id);
  const acceptRequest = useAcceptRequest(user?.id);
  const deleteFriendship = useDeleteFriendship(user?.id);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">Find your people.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Search by name or username.</p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name or username…"
          className="h-11 pl-10"
        />
      </div>

      {q.trim().length > 0 && (
        <Section title="Search results">
          {search.isLoading ? (
            <Loading />
          ) : search.data && search.data.length > 0 ? (
            <PeopleGrid>
              {search.data.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  meId={user?.id}
                  action={
                    <Button
                      size="sm"
                      onClick={() => sendRequest.mutate(p.id)}
                      disabled={sendRequest.isPending}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  }
                />
              ))}
            </PeopleGrid>
          ) : (
            <Empty text="No one found. Try a different name or username." />
          )}
        </Section>
      )}

      <Section
        title={`Requests${incoming.data && incoming.data.length > 0 ? ` (${incoming.data.length})` : ""}`}
      >
        {incoming.isLoading ? (
          <Loading />
        ) : incoming.data && incoming.data.length > 0 ? (
          <PeopleGrid>
            {incoming.data.map((r) => (
              <PersonCard
                key={r.id}
                person={r.profile}
                meId={user?.id}
                action={
                  <div className="ml-auto flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => acceptRequest.mutate(r.id)}
                      disabled={acceptRequest.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteFriendship.mutate(r.id)}
                      disabled={deleteFriendship.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
            ))}
          </PeopleGrid>
        ) : (
          <Empty text="No incoming friend requests." />
        )}
      </Section>

      {outgoing.data && outgoing.data.length > 0 && (
        <Section title="Pending sent">
          <PeopleGrid>
            {outgoing.data.map((r) => (
              <PersonCard
                key={r.id}
                person={r.profile}
                meId={user?.id}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteFriendship.mutate(r.id)}
                    disabled={deleteFriendship.isPending}
                  >
                    Cancel
                  </Button>
                }
              />
            ))}
          </PeopleGrid>
        </Section>
      )}

      <Section
        title={`Friends${friends.data && friends.data.length > 0 ? ` (${friends.data.length})` : ""}`}
      >
        {friends.isLoading ? (
          <Loading />
        ) : friends.data && friends.data.length > 0 ? (
          <PeopleGrid>
            {friends.data.map((f) => (
              <PersonCard
                key={f.friendshipId}
                person={f.profile}
                meId={user?.id}
                showMutual
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteFriendship.mutate(f.friendshipId)}
                    disabled={deleteFriendship.isPending}
                  >
                    <UserMinus className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                }
              />
            ))}
          </PeopleGrid>
        ) : (
          <Empty text="No friends yet. Search above to connect with people." />
        )}
      </Section>

      <Section title="People you may know">
        {suggestions.data && suggestions.data.length > 0 ? (
          <PeopleGrid>
            {suggestions.data.map((p) => (
              <PersonCard
                key={p.id}
                person={p}
                meId={user?.id}
                action={
                  <Button
                    size="sm"
                    onClick={() => sendRequest.mutate(p.id)}
                    disabled={sendRequest.isPending}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                }
              />
            ))}
          </PeopleGrid>
        ) : (
          <Empty text="Not enough data yet to suggest people — add your target role or skills to your profile." />
        )}
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      {children}
    </section>
  );
}

function PeopleGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Loading() {
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function PersonCard({
  person,
  meId,
  action,
  showMutual,
}: {
  person: ProfileLite | null;
  meId: string | undefined;
  action?: React.ReactNode;
  showMutual?: boolean;
}) {
  const mutual = useMutualFriendsCount(
    showMutual ? meId : undefined,
    showMutual ? person?.id : undefined,
  );

  if (!person) return null;

  const identity = (
    <>
      {person.avatar_url ? (
        <img
          src={person.avatar_url}
          className="h-12 w-12 rounded-full bg-muted object-cover"
          alt=""
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-display text-base">
          {(person.full_name ?? "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">
          {person.full_name || person.username || "Unnamed"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {person.target_role || person.location || (person.username ? `@${person.username}` : "")}
        </div>
        {showMutual && typeof mutual.data === "number" && mutual.data > 0 && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" /> {mutual.data} mutual friend{mutual.data === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      {person.username ? (
        <Link
          to="/u/$username"
          params={{ username: person.username }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}
      {action}
    </div>
  );
}
