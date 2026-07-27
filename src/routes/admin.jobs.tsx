import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminJobs,
  useSetJobStatus,
  useDeleteJob,
  type AdminJob,
  type JobStatus,
} from "@/lib/admin-jobs-client";
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

export const Route = createFileRoute("/admin/jobs")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Jobs · Admin · Provn" }] }),
  component: AdminJobs,
});

const STATUS_BADGE: Record<JobStatus, "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  open: "secondary",
  paused: "outline",
  closed: "destructive",
};

function AdminJobs() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminJob | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminJobs({ search, status, page });
  const setJobStatus = useSetJobStatus(currentUser?.id);
  const deleteJob = useDeleteJob(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const changeStatus = (jobId: string, next: JobStatus) => {
    setError(null);
    setJobStatus.mutate(
      { jobId, status: next },
      {
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to update job status."),
      },
    );
  };

  const runDelete = () => {
    if (!deleteTarget) return;
    setError(null);
    deleteJob.mutate(
      { jobId: deleteTarget.id, title: deleteTarget.title },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to delete job."),
      },
    );
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every job posting across every company. Pause, reopen, close, or delete any listing.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search job title"
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as JobStatus | "all");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {count} job{count === 1 ? "" : "s"}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
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
                  No jobs match this search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title || "Untitled role"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.company?.company_name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{j.location || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[j.status as JobStatus]}>{j.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(j.posted_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {j.status !== "paused" && j.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(j.id, "paused")}
                        >
                          Pause
                        </Button>
                      )}
                      {j.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(j.id, "open")}
                        >
                          Reopen
                        </Button>
                      )}
                      {j.status !== "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(j.id, "closed")}
                        >
                          Close
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(j)}>
                        Delete
                      </Button>
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

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this job?"
        description={`"${deleteTarget?.title || "This job"}" and its applications will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete job"
        destructive
        pending={deleteJob.isPending}
        onConfirm={runDelete}
      />
    </AppShell>
  );
}
