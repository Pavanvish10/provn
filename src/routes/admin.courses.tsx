import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminCourses,
  useCreateCourse,
  useUpdateCourse,
  useToggleCourseActive,
  type AdminCourse,
  type CourseFormValues,
} from "@/lib/admin-courses-client";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/courses")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Courses · Admin · Provn" }] }),
  component: AdminCourses,
});

const EMPTY_FORM: CourseFormValues = {
  title: "",
  description: "",
  price_cents: 0,
  currency: "INR",
  video_url: "",
  thumbnail_url: "",
  sort_order: 0,
};

function toFormValues(c: AdminCourse): CourseFormValues {
  return {
    title: c.title,
    description: c.description,
    price_cents: c.price_cents,
    currency: c.currency,
    video_url: c.video_url,
    thumbnail_url: c.thumbnail_url,
    sort_order: c.sort_order,
  };
}

function AdminCourses() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminCourse | "new" | null>(null);
  const [form, setForm] = useState<CourseFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminCourse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminCourses({ search, page });
  const createCourse = useCreateCourse(currentUser?.id);
  const updateCourse = useUpdateCourse(currentUser?.id);
  const toggleActive = useToggleCourseActive(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const openNew = () => {
    setSelected("new");
    setForm(EMPTY_FORM);
    setError(null);
    setNotice(null);
  };

  const openExisting = (c: AdminCourse) => {
    setSelected(c);
    setForm(toFormValues(c));
    setError(null);
    setNotice(null);
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.price_cents < 0) {
      setError("Price cannot be negative.");
      return;
    }
    const values: CourseFormValues = {
      ...form,
      description: form.description?.trim() || null,
      video_url: form.video_url?.trim() || null,
      thumbnail_url: form.thumbnail_url?.trim() || null,
    };
    try {
      if (selected === "new") {
        const id = await createCourse.mutateAsync(values);
        setNotice("Course created.");
        const created = rows.find((c) => c.id === id);
        setSelected(created ?? "new");
      } else if (selected) {
        await updateCourse.mutateAsync({ id: selected.id, values });
        setNotice("Course saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save course.");
    }
  };

  const runToggle = async () => {
    if (!toggleTarget) return;
    setError(null);
    try {
      await toggleActive.mutateAsync({
        id: toggleTarget.id,
        isActive: !toggleTarget.is_active,
        title: toggleTarget.title,
      });
      setToggleTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update course.");
    }
  };

  const saving = createCourse.isPending || updateCourse.isPending;

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Manage Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, and list/delist courses in the student-facing catalog. Real purchases
            reference courses, so removing one delists it rather than deleting purchase history.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> New course
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="relative mb-3 w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title"
              className="pl-8"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No courses match this search.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openExisting(c)}
                    className={`flex w-full items-start justify-between gap-3 p-3 text-left transition hover:bg-muted ${
                      selected !== "new" && selected?.id === c.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {c.currency} {(c.price_cents / 100).toFixed(0)}
                        </Badge>
                        {c.is_active ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="outline">Delisted</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToggleTarget(c);
                      }}
                    >
                      {c.is_active ? "Delist" : "Activate"}
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
              Select a course to edit, or create a new one.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 font-display text-lg">
                {selected === "new" ? "New course" : "Edit course"}
              </div>
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
              {notice && <p className="mb-3 text-sm text-brand">{notice}</p>}

              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[80px]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (in smallest currency unit, e.g. paise)">
                  <Input
                    type="number"
                    min={0}
                    value={form.price_cents}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price_cents: Number(e.target.value) || 0 }))
                    }
                  />
                </Field>
                <Field label="Currency">
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                    }
                  />
                </Field>
              </div>
              <Field label="Video URL (external — shown to buyers once purchased)">
                <Input
                  value={form.video_url ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Thumbnail URL (optional)">
                <Input
                  value={form.thumbnail_url ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Sort order">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : selected === "new" ? "Create course" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.is_active ? "Delist this course?" : "Activate this course?"}
        description={
          toggleTarget?.is_active
            ? `"${toggleTarget?.title}" will be hidden from the student catalog. Existing buyers keep access.`
            : `"${toggleTarget?.title}" will become visible and purchasable in the student catalog again.`
        }
        confirmLabel={toggleTarget?.is_active ? "Delist" : "Activate"}
        destructive={!!toggleTarget?.is_active}
        pending={toggleActive.isPending}
        onConfirm={runToggle}
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
