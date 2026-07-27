import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminReports,
  useReportedContent,
  useUpdateReportStatus,
  useDeleteReportedPost,
  useDeleteReportedComment,
  type AdminReport,
  type ReportStatus,
} from "@/lib/admin-reports-client";
import { ADMIN_PAGE_SIZE, formatDateTime } from "@/lib/admin-shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/reports")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Reports & Moderation · Admin · Provn" }] }),
  component: AdminReports,
});

const STATUS_FILTERS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

function AdminReports() {
  const { data: currentUser } = useCurrentUser();
  const [status, setStatus] = useState<ReportStatus | "all">("open");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [deleteContentTarget, setDeleteContentTarget] = useState<{
    type: "post" | "comment";
    id: string;
    reportId: string;
  } | null>(null);

  const { data, isLoading } = useAdminReports({ status, page });
  const updateStatus = useUpdateReportStatus(currentUser?.id);
  const deletePost = useDeleteReportedPost(currentUser?.id);
  const deleteComment = useDeleteReportedComment(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const runDeleteContent = async () => {
    if (!deleteContentTarget) return;
    if (deleteContentTarget.type === "post") {
      await deletePost.mutateAsync({
        postId: deleteContentTarget.id,
        reportId: deleteContentTarget.reportId,
      });
    } else {
      await deleteComment.mutateAsync({
        commentId: deleteContentTarget.id,
        reportId: deleteContentTarget.reportId,
      });
    }
    setDeleteContentTarget(null);
    setSelected(null);
  };

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Reports & Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review reported content and take action.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(0);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              status === f.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No reports in this filter.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-muted ${selected?.id === r.id ? "bg-muted" : ""}`}
                >
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline">{r.target_type}</Badge>
                      <Badge variant="secondary">{r.status}</Badge>
                      <span>{formatDateTime(r.created_at)}</span>
                    </div>
                    <div className="mt-1 text-sm">{r.reason}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Reported by {r.reporter?.full_name || r.reporter?.email || "a user"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border p-3">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Select a report to review its content.
            </div>
          ) : (
            <ReportDetail
              report={selected}
              onMarkReviewed={() => updateStatus.mutate({ id: selected.id, status: "reviewed" })}
              onDismiss={() => updateStatus.mutate({ id: selected.id, status: "dismissed" })}
              onDeleteContent={(type, id) =>
                setDeleteContentTarget({ type, id, reportId: selected.id })
              }
              pending={updateStatus.isPending}
            />
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={!!deleteContentTarget}
        onOpenChange={(o) => !o && setDeleteContentTarget(null)}
        title={`Delete this ${deleteContentTarget?.type}?`}
        description="This permanently removes the reported content and marks the report as actioned."
        confirmLabel="Delete"
        destructive
        pending={deletePost.isPending || deleteComment.isPending}
        onConfirm={runDeleteContent}
      />
    </AppShell>
  );
}

function ReportDetail({
  report,
  onMarkReviewed,
  onDismiss,
  onDeleteContent,
  pending,
}: {
  report: AdminReport;
  onMarkReviewed: () => void;
  onDismiss: () => void;
  onDeleteContent: (type: "post" | "comment", id: string) => void;
  pending: boolean;
}) {
  const { data: content, isLoading } = useReportedContent(report.target_type, report.target_id);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg">Reported {report.target_type}</div>
        <Badge variant="secondary">{report.status}</Badge>
      </div>
      <div className="mb-4 rounded-lg border border-border bg-background p-3 text-sm">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Reason</div>
        {report.reason}
      </div>

      <div className="mb-4 rounded-lg border border-dashed border-border p-3">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Content</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !content ? (
          <div className="text-sm text-muted-foreground">Content no longer exists.</div>
        ) : "content" in content ? (
          <p className="text-sm">{(content as { content: string | null }).content}</p>
        ) : (
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(content, null, 2)}</pre>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onMarkReviewed} disabled={pending}>
          Mark reviewed
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss} disabled={pending}>
          Dismiss
        </Button>
        {(report.target_type === "post" || report.target_type === "comment") && content && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              onDeleteContent(report.target_type as "post" | "comment", report.target_id)
            }
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete content
          </Button>
        )}
      </div>
    </div>
  );
}
