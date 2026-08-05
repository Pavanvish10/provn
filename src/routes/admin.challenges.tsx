import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppNav";
import { AdminSubNav } from "@/components/AdminSubNav";
import { AdminConfirmDialog } from "@/components/AdminConfirmDialog";
import { GenerateChallengeDialog } from "@/components/GenerateChallengeDialog";
import { requireAdmin } from "@/lib/auth-guard";
import { useCurrentUser } from "@/lib/auth-client";
import {
  useAdminChallenges,
  useChallengeCategories,
  useCreateChallenge,
  useUpdateChallenge,
  useDeleteChallenge,
  useChallengeTestCases,
  useAddTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  slugify,
  type AdminChallenge,
  type Difficulty,
  type ChallengeFormValues,
  type ChallengeTestCase,
} from "@/lib/admin-challenges-client";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/challenges")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [{ title: "Manage Challenges · Admin · Provn" }] }),
  component: AdminChallenges,
});

const EMPTY_FORM: ChallengeFormValues = {
  title: "",
  slug: "",
  description: "",
  difficulty: "easy",
  category_id: null,
  estimated_minutes: 30,
  xp_reward: 20,
  tags: [],
  constraints: null,
  input_format: null,
  output_format: null,
  is_premium: false,
  is_active: true,
};

function toFormValues(c: AdminChallenge): ChallengeFormValues {
  return {
    title: c.title,
    slug: c.slug,
    description: c.description,
    difficulty: c.difficulty as Difficulty,
    category_id: c.category_id,
    estimated_minutes: c.estimated_minutes,
    xp_reward: c.xp_reward,
    tags: c.tags ?? [],
    constraints: c.constraints,
    input_format: c.input_format,
    output_format: c.output_format,
    is_premium: c.is_premium,
    is_active: c.is_active,
  };
}

function AdminChallenges() {
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [activeOnly, setActiveOnly] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminChallenge | "new" | null>(null);
  const [form, setForm] = useState<ChallengeFormValues>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminChallenge | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: categories } = useChallengeCategories();
  const [generateOpen, setGenerateOpen] = useState(false);
  const { data, isLoading, isFetching } = useAdminChallenges({
    search,
    difficulty,
    categoryId,
    activeOnly,
    page,
  });
  const createChallenge = useCreateChallenge(currentUser?.id);
  const updateChallenge = useUpdateChallenge(currentUser?.id);
  const deleteChallenge = useDeleteChallenge(currentUser?.id);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const openNew = () => {
    setSelected("new");
    setForm(EMPTY_FORM);
    setTagsInput("");
    setSlugTouched(false);
    setNotice(null);
    setError(null);
  };

  const openExisting = (c: AdminChallenge) => {
    setSelected(c);
    setForm(toFormValues(c));
    setTagsInput((c.tags ?? []).join(", "));
    setSlugTouched(true);
    setNotice(null);
    setError(null);
  };

  const setTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      setError("Title, slug, and description are required.");
      return;
    }
    const values: ChallengeFormValues = {
      ...form,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (selected === "new") {
        const id = await createChallenge.mutateAsync(values);
        setNotice("Challenge created.");
        const created = rows.find((r) => r.id === id);
        setSelected(created ?? "new");
      } else if (selected) {
        await updateChallenge.mutateAsync({ id: selected.id, values });
        setNotice("Challenge saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save challenge.");
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteChallenge.mutateAsync({ id: deleteTarget.id, title: deleteTarget.title });
      if (selected !== "new" && selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete challenge.");
    }
  };

  const saving = createChallenge.isPending || updateChallenge.isPending;

  return (
    <AppShell>
      <AdminSubNav />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Manage Challenges</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full CRUD on coding challenges and their (including hidden) test cases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="h-4 w-4" /> Generate with AI
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New challenge
          </Button>
        </div>
      </div>

      <GenerateChallengeDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        categories={categories ?? []}
        adminId={currentUser?.id}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title"
                className="pl-8"
              />
            </div>
            <Select
              value={difficulty}
              onValueChange={(v) => {
                setDifficulty(v as Difficulty | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories ?? []).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activeOnly}
              onValueChange={(v) => {
                setActiveOnly(v as typeof activeOnly);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Active + inactive</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No challenges match this search.
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
                        <Badge variant="outline" className="capitalize">
                          {c.difficulty}
                        </Badge>
                        {c.category?.name && <span>{c.category.name}</span>}
                        <span>· {c.xp_reward} XP</span>
                        {!c.is_active && <Badge variant="destructive">Inactive</Badge>}
                        {c.is_premium && <Badge variant="secondary">Premium</Badge>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(c);
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
              Select a challenge to edit, or create a new one.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 font-display text-lg">
                  {selected === "new" ? "New challenge" : "Edit challenge"}
                </div>

                {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
                {notice && <p className="mb-3 text-sm text-brand">{notice}</p>}

                <Field label="Title">
                  <Input value={form.title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Slug">
                  <Input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="min-h-[90px]"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Difficulty">
                    <Select
                      value={form.difficulty}
                      onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as Difficulty }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select
                      value={form.category_id ?? "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, category_id: v === "none" ? null : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {(categories ?? []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estimated minutes">
                    <Input
                      type="number"
                      min={1}
                      value={form.estimated_minutes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, estimated_minutes: Number(e.target.value) || 0 }))
                      }
                    />
                  </Field>
                  <Field label="XP reward">
                    <Input
                      type="number"
                      min={0}
                      value={form.xp_reward}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, xp_reward: Number(e.target.value) || 0 }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Tags (comma-separated)">
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="arrays, two-pointers"
                  />
                </Field>
                <Field label="Constraints">
                  <Textarea
                    value={form.constraints ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, constraints: e.target.value || null }))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Input format">
                    <Textarea
                      value={form.input_format ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, input_format: e.target.value || null }))
                      }
                    />
                  </Field>
                  <Field label="Output format">
                    <Textarea
                      value={form.output_format ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, output_format: e.target.value || null }))
                      }
                    />
                  </Field>
                </div>
                <div className="mb-4 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.is_premium}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_premium: v }))}
                    />
                    Premium
                  </label>
                </div>

                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : selected === "new" ? "Create challenge" : "Save changes"}
                </Button>
              </div>

              {selected !== "new" && (
                <TestCasesPanel challenge={selected} adminId={currentUser?.id} />
              )}
            </div>
          )}
        </div>
      </div>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this challenge?"
        description={`"${deleteTarget?.title}" and all of its test cases will be permanently deleted.`}
        confirmLabel="Delete challenge"
        destructive
        pending={deleteChallenge.isPending}
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

function TestCasesPanel({
  challenge,
  adminId,
}: {
  challenge: AdminChallenge;
  adminId: string | undefined;
}) {
  const { data: testCases, isLoading } = useChallengeTestCases(challenge.id);
  const addTestCase = useAddTestCase(adminId);
  const updateTestCase = useUpdateTestCase(adminId);
  const deleteTestCase = useDeleteTestCase(adminId);
  const [draft, setDraft] = useState({ input: "", expected_output: "", is_hidden: true });
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ChallengeTestCase | null>(null);

  const hiddenCount = useMemo(
    () => (testCases ?? []).filter((t) => t.is_hidden).length,
    [testCases],
  );

  const addCase = async () => {
    setError(null);
    if (!draft.expected_output.trim()) {
      setError("Expected output is required.");
      return;
    }
    try {
      await addTestCase.mutateAsync({
        challenge_id: challenge.id,
        input: draft.input,
        expected_output: draft.expected_output,
        is_hidden: draft.is_hidden,
      });
      setDraft({ input: "", expected_output: "", is_hidden: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add test case.");
    }
  };

  const toggleHidden = (tc: ChallengeTestCase) => {
    updateTestCase.mutate({
      id: tc.id,
      challengeId: challenge.id,
      patch: { is_hidden: !tc.is_hidden },
    });
  };

  const runRemove = async () => {
    if (!removeTarget) return;
    await deleteTestCase.mutateAsync({ id: removeTarget.id, challengeId: challenge.id });
    setRemoveTarget(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg">Test cases</div>
        <div className="text-xs text-muted-foreground">
          {testCases?.length ?? 0} total · {hiddenCount} hidden
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mb-4 space-y-2">
          {(testCases ?? []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No test cases yet.
            </div>
          )}
          {(testCases ?? []).map((tc) => (
            <div key={tc.id} className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Input
                  </div>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                    {tc.input || "(empty)"}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Expected output
                  </div>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                    {tc.expected_output}
                  </pre>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => toggleHidden(tc)}>
                  {tc.is_hidden ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {tc.is_hidden ? "Hidden" : "Visible"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(tc)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Add test case
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Textarea
            placeholder="Input (stdin)"
            value={draft.input}
            onChange={(e) => setDraft((d) => ({ ...d, input: e.target.value }))}
            className="min-h-[60px] text-xs"
          />
          <Textarea
            placeholder="Expected output"
            value={draft.expected_output}
            onChange={(e) => setDraft((d) => ({ ...d, expected_output: e.target.value }))}
            className="min-h-[60px] text-xs"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={draft.is_hidden}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, is_hidden: v }))}
            />
            Hidden from users
          </label>
          <Button size="sm" onClick={addCase} disabled={addTestCase.isPending}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      <AdminConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Delete this test case?"
        description="This test case will be permanently removed from the challenge."
        confirmLabel="Delete"
        destructive
        pending={deleteTestCase.isPending}
        onConfirm={runRemove}
      />
    </div>
  );
}
