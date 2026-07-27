import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminRoadmaps,
  useCreateRoadmap,
  useUpdateRoadmap,
  useDeleteRoadmap,
  useRoadmapSteps,
  useAddStep,
  useUpdateStep,
  useDeleteStep,
  useSwapStepOrder,
  type AdminRoadmap,
  type RoadmapFormValues,
  type RoadmapStep,
} from "@/lib/admin-roadmaps-client";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/roadmaps")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Roadmaps · Admin · Provn" }] }),
  component: AdminRoadmaps,
});

const EMPTY_FORM: RoadmapFormValues = { role: "", title: "", description: "", is_premium: false };

function toFormValues(r: AdminRoadmap): RoadmapFormValues {
  return { role: r.role, title: r.title, description: r.description, is_premium: r.is_premium };
}

function AdminRoadmaps() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminRoadmap | "new" | null>(null);
  const [form, setForm] = useState<RoadmapFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRoadmap | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminRoadmaps({ search, page });
  const createRoadmap = useCreateRoadmap(currentUser?.id);
  const updateRoadmap = useUpdateRoadmap(currentUser?.id);
  const deleteRoadmap = useDeleteRoadmap(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const openNew = () => {
    setSelected("new");
    setForm(EMPTY_FORM);
    setError(null);
    setNotice(null);
  };

  const openExisting = (r: AdminRoadmap) => {
    setSelected(r);
    setForm(toFormValues(r));
    setError(null);
    setNotice(null);
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    if (!form.role.trim() || !form.title.trim()) {
      setError("Role and title are required.");
      return;
    }
    try {
      if (selected === "new") {
        const id = await createRoadmap.mutateAsync(form);
        setNotice("Roadmap created. Add steps below.");
        const created = rows.find((r) => r.id === id);
        setSelected(created ?? "new");
      } else if (selected) {
        await updateRoadmap.mutateAsync({ id: selected.id, values: form });
        setNotice("Roadmap saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save roadmap.");
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteRoadmap.mutateAsync({ id: deleteTarget.id, title: deleteTarget.title });
      if (selected !== "new" && selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete roadmap.");
    }
  };

  const saving = createRoadmap.isPending || updateRoadmap.isPending;

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Manage Roadmaps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full CRUD on role roadmap templates and their ordered steps. Role is free-text.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> New roadmap
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="relative mb-3 w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or role"
              className="pl-8"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No roadmaps match this search.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openExisting(r)}
                    className={`flex w-full items-start justify-between gap-3 p-3 text-left transition hover:bg-muted ${
                      selected !== "new" && selected?.id === r.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline">{r.role}</Badge>
                        {r.is_premium && <Badge variant="secondary">Premium</Badge>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(r);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
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
              Select a roadmap to edit, or create a new one.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 font-display text-lg">
                  {selected === "new" ? "New roadmap" : "Edit roadmap"}
                </div>
                {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
                {notice && <p className="mb-3 text-sm text-brand">{notice}</p>}

                <Field label="Role (free text — e.g. Frontend, Backend, AI, ML, DevOps, Cloud, Cyber Security)">
                  <Input
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={form.description ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value || null }))
                    }
                    className="min-h-[80px]"
                  />
                </Field>
                <label className="mb-4 flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_premium}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_premium: v }))}
                  />
                  Premium roadmap
                </label>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : selected === "new" ? "Create roadmap" : "Save changes"}
                </Button>
              </div>

              {selected !== "new" && <StepsPanel roadmap={selected} adminId={currentUser?.id} />}
            </div>
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this roadmap?"
        description={`"${deleteTarget?.title}" and all of its steps will be permanently deleted.`}
        confirmLabel="Delete roadmap"
        destructive
        pending={deleteRoadmap.isPending}
        onConfirm={runDelete}
      />
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function StepsPanel({ roadmap, adminId }: { roadmap: AdminRoadmap; adminId: string | undefined }) {
  const { data: steps, isLoading } = useRoadmapSteps(roadmap.id);
  const addStep = useAddStep(adminId);
  const updateStep = useUpdateStep(adminId);
  const deleteStep = useDeleteStep(adminId);
  const swapOrder = useSwapStepOrder();
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    resource_url: "",
    estimated_hours: 2,
  });
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RoadmapStep | null>(null);

  const addNewStep = async () => {
    setError(null);
    if (!draft.title.trim()) {
      setError("Step title is required.");
      return;
    }
    const nextOrder = (steps ?? []).reduce((max, s) => Math.max(max, s.order_index), -1) + 1;
    try {
      await addStep.mutateAsync({
        roadmapId: roadmap.id,
        orderIndex: nextOrder,
        values: {
          title: draft.title,
          description: draft.description || null,
          resource_url: draft.resource_url || null,
          estimated_hours: draft.estimated_hours,
        },
      });
      setDraft({ title: "", description: "", resource_url: "", estimated_hours: 2 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step.");
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const list = steps ?? [];
    const other = index + direction;
    if (other < 0 || other >= list.length) return;
    swapOrder.mutate({
      roadmapId: roadmap.id,
      a: { id: list[index].id, order_index: list[index].order_index },
      b: { id: list[other].id, order_index: list[other].order_index },
    });
  };

  const runRemove = async () => {
    if (!removeTarget) return;
    await deleteStep.mutateAsync({ id: removeTarget.id, roadmapId: roadmap.id });
    setRemoveTarget(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 font-display text-lg">Steps ({steps?.length ?? 0})</div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mb-4 space-y-2">
          {(steps ?? []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No steps yet.
            </div>
          )}
          {(steps ?? []).map((s, i) => (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">
                    {i + 1}. {s.title}
                  </div>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                  )}
                  {s.resource_url && (
                    <a
                      href={s.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-brand hover:underline"
                    >
                      {s.resource_url}
                    </a>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {s.estimated_hours}h estimated
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === (steps?.length ?? 0) - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Add step
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Step title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <Textarea
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="min-h-[50px] text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Resource URL (optional)"
              value={draft.resource_url}
              onChange={(e) => setDraft((d) => ({ ...d, resource_url: e.target.value }))}
            />
            <Input
              type="number"
              min={1}
              placeholder="Estimated hours"
              value={draft.estimated_hours}
              onChange={(e) =>
                setDraft((d) => ({ ...d, estimated_hours: Number(e.target.value) || 1 }))
              }
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={addNewStep} disabled={addStep.isPending}>
            <Plus className="h-3.5 w-3.5" /> Add step
          </Button>
        </div>
      </div>

      <AdminConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Delete this step?"
        description={`"${removeTarget?.title}" will be permanently removed from the roadmap.`}
        confirmLabel="Delete"
        destructive
        pending={deleteStep.isPending}
        onConfirm={runRemove}
      />
    </div>
  );
}
