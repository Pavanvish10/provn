import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, History } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/auth-guard";
import { useAdminActionLog } from "@/lib/admin-audit-client";
import { ADMIN_PAGE_SIZE, formatDateTime } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/audit")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Audit Log · Admin · Provn" }] }),
  component: AdminAudit,
});

function AdminAudit() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminActionLog({ search, page });
  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <History className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every privileged admin action across the platform — bans, role changes, verifications,
          grants, content and billing changes — in one searchable, read-only trail.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search action, target type, or notes"
            className="pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {count} action{count === 1 ? "" : "s"}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No admin actions match this search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.admin?.full_name || r.admin?.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.action.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.target_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {r.notes || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(r.created_at)}
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
