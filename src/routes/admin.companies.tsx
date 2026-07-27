import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminCompanies,
  useToggleCompanyVerified,
  useSuspendCompanyJobs,
  type AdminCompany,
} from "@/lib/admin-companies-client";
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

export const Route = createFileRoute("/admin/companies")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Companies · Admin · Provn" }] }),
  component: AdminCompanies,
});

function AdminCompanies() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState<"all" | "verified" | "unverified">("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<AdminCompany | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminCompany | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminCompanies({ search, verifiedOnly, page });
  const toggleVerified = useToggleCompanyVerified(currentUser?.id);
  const suspendJobs = useSuspendCompanyJobs(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const runVerifyToggle = () => {
    if (!verifyTarget) return;
    setError(null);
    toggleVerified.mutate(
      { companyId: verifyTarget.id, verified: !verifyTarget.verified },
      {
        onSuccess: () => setVerifyTarget(null),
        onError: (e) => setError(e instanceof Error ? e.message : "Failed to update verification."),
      },
    );
  };

  const runSuspend = () => {
    if (!suspendTarget) return;
    setError(null);
    suspendJobs.mutate(
      { companyId: suspendTarget.id },
      {
        onSuccess: (closedCount) => {
          setSuspendTarget(null);
          setNotice(
            `Closed ${closedCount} open job(s) for ${suspendTarget.company_name || "this company"}.`,
          );
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Failed to suspend company jobs."),
      },
    );
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Manage Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify companies, or suspend a company by closing all of its open job postings — there's
          no separate "suspended" flag in the schema, so this is the real lever available.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search company name"
            className="pl-8"
          />
        </div>
        <Select
          value={verifiedOnly}
          onValueChange={(v) => {
            setVerifiedOnly(v as typeof verifiedOnly);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {count} compan{count === 1 ? "y" : "ies"}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="mb-3 text-sm text-brand">{notice}</p>}

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No companies match this search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {c.company_name || "—"}
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.location || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.creator?.full_name || c.creator?.email || "—"}
                  </TableCell>
                  <TableCell>
                    {c.verified ? (
                      <Badge variant="secondary">Verified</Badge>
                    ) : (
                      <Badge variant="outline">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setVerifyTarget(c)}>
                        {c.verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setSuspendTarget(c)}>
                        Suspend jobs
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
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        title={verifyTarget?.verified ? "Unverify this company?" : "Verify this company?"}
        description={`${verifyTarget?.company_name || "This company"} will be marked as ${verifyTarget?.verified ? "unverified" : "verified"}.`}
        confirmLabel={verifyTarget?.verified ? "Unverify" : "Verify"}
        pending={toggleVerified.isPending}
        onConfirm={runVerifyToggle}
      />

      <AdminConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
        title="Suspend this company?"
        description={`This will close every draft, open, or paused job posted by ${suspendTarget?.company_name || "this company"}. This cannot be undone automatically.`}
        confirmLabel="Suspend (close jobs)"
        destructive
        pending={suspendJobs.isPending}
        onConfirm={runSuspend}
      />
    </AppShell>
  );
}
