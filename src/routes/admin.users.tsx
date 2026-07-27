import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminUsers,
  useToggleUserBan,
  useChangeUserRole,
  type AdminProfile,
  type ProfileRole,
} from "@/lib/admin-users-client";
import { ADMIN_PAGE_SIZE, formatDate } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Users · Admin · Provn" }] }),
  component: AdminUsers,
});

const ROLE_OPTIONS: { value: ProfileRole | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "user", label: "User" },
  { value: "recruiter", label: "Recruiter" },
  { value: "company_admin", label: "Company admin" },
  { value: "admin", label: "Admin" },
];

function AdminUsers() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ProfileRole | "all">("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminProfile | null>(null);
  const [roleChange, setRoleChange] = useState<{ profile: AdminProfile; role: ProfileRole } | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminUsers({ search, role, page });
  const toggleBan = useToggleUserBan(currentUser?.id);
  const changeRole = useChangeUserRole(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const runBanToggle = () => {
    if (!banTarget) return;
    setError(null);
    toggleBan.mutate(
      { profileId: banTarget.id, ban: !banTarget.is_banned },
      {
        onSuccess: () => setBanTarget(null),
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to update ban status."),
      },
    );
  };

  const runRoleChange = () => {
    if (!roleChange) return;
    setError(null);
    changeRole.mutate(
      {
        profileId: roleChange.profile.id,
        role: roleChange.role,
        previousRole: roleChange.profile.role,
      },
      {
        onSuccess: () => setRoleChange(null),
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to change role."),
      },
    );
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search profiles, ban or unban accounts, and change roles.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, or username"
            className="pl-8"
          />
        </div>
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as ProfileRole | "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {count} user{count === 1 ? "" : "s"}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  No users match this search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.username || "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={p.role}
                      onValueChange={(v) => setRoleChange({ profile: p, role: v as ProfileRole })}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="company_admin">Company admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">{p.xp}</TableCell>
                  <TableCell className="text-right">{p.streak}</TableCell>
                  <TableCell>
                    {p.is_banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={p.is_banned ? "outline" : "destructive"}
                      onClick={() => setBanTarget(p)}
                    >
                      {p.is_banned ? "Unban" : "Ban"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page + 1} of {totalPages} {isFetching && "· refreshing…"}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AdminConfirmDialog
        open={!!banTarget}
        onOpenChange={(o) => !o && setBanTarget(null)}
        title={banTarget?.is_banned ? "Unban this user?" : "Ban this user?"}
        description={
          banTarget?.is_banned
            ? `${banTarget?.full_name || banTarget?.email} will regain access to Provn.`
            : `${banTarget?.full_name || banTarget?.email} will be blocked from using Provn.`
        }
        confirmLabel={banTarget?.is_banned ? "Unban" : "Ban user"}
        destructive={!banTarget?.is_banned}
        pending={toggleBan.isPending}
        onConfirm={runBanToggle}
      />

      <AdminConfirmDialog
        open={!!roleChange}
        onOpenChange={(o) => !o && setRoleChange(null)}
        title={roleChange?.role === "admin" ? "Grant admin access?" : "Change this user's role?"}
        description={
          roleChange?.role === "admin"
            ? `${roleChange?.profile.full_name || roleChange?.profile.email} will get full admin privileges, including the ability to manage other admins. This is a highly privileged action.`
            : `${roleChange?.profile.full_name || roleChange?.profile.email}'s role will change from "${roleChange?.profile.role}" to "${roleChange?.role}".`
        }
        confirmLabel="Confirm change"
        destructive={roleChange?.role === "admin"}
        pending={changeRole.isPending}
        onConfirm={runRoleChange}
      />
    </AppShell>
  );
}
