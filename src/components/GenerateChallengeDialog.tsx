import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChallengeCategory, Difficulty } from "@/lib/admin-challenges-client";
import {
  useGenerateChallengeDraft,
  useSaveGeneratedChallenge,
} from "@/lib/challenge-generation-client";
import type { GeneratedChallengeDraft } from "@/lib/challenge-generation.server";

/** Admin tool: drafts a new question with Gemini for review before saving —
 * the scalable path to growing the question bank beyond the hand-written
 * seed set (100/category by hand isn't realistic; this is). Nothing is
 * written to the database until the admin clicks "Save to question bank". */
export function GenerateChallengeDialog({
  open,
  onOpenChange,
  categories,
  adminId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ChallengeCategory[];
  adminId: string | undefined;
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionFormat, setQuestionFormat] = useState<"coding" | "theory">("coding");
  const [draft, setDraft] = useState<GeneratedChallengeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useGenerateChallengeDraft();
  const save = useSaveGeneratedChallenge(adminId);

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";

  const reset = () => {
    setDraft(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!categoryName) return;
    setError(null);
    setDraft(null);
    try {
      const res = await generate.mutateAsync({ categoryName, difficulty, questionFormat });
      if (res.error || !res.draft) {
        setError(res.error ?? "Could not generate a question.");
        return;
      }
      setDraft(res.draft);
    } catch {
      setError("Something went wrong generating the question.");
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({ draft, categoryId: categoryId || null, difficulty, questionFormat });
      reset();
      onOpenChange(false);
    } catch {
      setError("Could not save this question. Try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" /> Generate a question with AI
          </DialogTitle>
          <DialogDescription>
            Pick a category, difficulty, and format — review the draft before it's saved.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={questionFormat}
            onValueChange={(v) => setQuestionFormat(v as "coding" | "theory")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coding">Coding</SelectItem>
              <SelectItem value="theory">Theory / conceptual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!categoryId || generate.isPending}
          className="w-full"
        >
          {generate.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          Generate draft
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {draft && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {difficulty}
              </Badge>
              <h3 className="font-display text-lg">{draft.title}</h3>
            </div>
            <p className="whitespace-pre-wrap text-muted-foreground">{draft.description}</p>
            {draft.constraints && (
              <p className="text-xs text-muted-foreground">
                <b>Constraints:</b> {draft.constraints}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {draft.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
            {draft.company_tags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Companies: {draft.company_tags.join(", ")}
              </p>
            )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                Hints & editorial
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {draft.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <p className="mt-2 whitespace-pre-wrap">{draft.editorial}</p>
            </details>
            {questionFormat === "coding" && (
              <p className="text-xs text-muted-foreground">
                {draft.test_cases.length} test cases · starter code for{" "}
                {Object.keys(draft.starter_code).join(", ") || "none"}
              </p>
            )}

            <Button onClick={handleSave} disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save to question bank
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
