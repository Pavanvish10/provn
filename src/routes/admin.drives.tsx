import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import { useAdminDrives, useSetDriveStatus, type DriveStatus } from "@/lib/admin-drives-client";
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

export const Route = createFileRoute("/admin/drives")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Placement Drives · Admin · Provn" }] }),
  component: AdminDrives,
});

const STATUS_BADGE: Record<DriveStatus, "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  published: "secondary",
  paused: "outline",
  closed: "destructive",
};

function AdminDrives() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DriveStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminDrives({ search, status, page });
  const setDriveStatus = useSetDriveStatus(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const changeStatus = (driveId: string, next: DriveStatus) => {
    setError(null);
    setDriveStatus.mutate(
      { driveId, status: next },
      {
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to update drive status."),
      },
    );
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Placement Drives</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every campus placement drive across every college. Pause, reopen, or close any drive.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search role"
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as DriveStatus | "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {count} drive{count === 1 ? "" : "s"}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No placement drives match this search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.role}</TableCell>
                  <TableCell className="text-muted-foreground">{d.college?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.package_min || d.package_max
                      ? `${d.currency} ${((d.package_min ?? d.package_max)! / 100000).toFixed(1)}L${d.package_max && d.package_min ? `–${(d.package_max / 100000).toFixed(1)}L` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[d.status as DriveStatus]}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(d.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {d.status !== "paused" && d.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(d.id, "paused")}
                        >
                          Pause
                        </Button>
                      )}
                      {d.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(d.id, "published")}
                        >
                          Resume
                        </Button>
                      )}
                      {d.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(d.id, "closed")}
                        >
                          Close
                        </Button>
                      )}
                    </div>
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
    </AppShell>
  );
}
