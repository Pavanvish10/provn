import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  generateChallengeDraftFn,
  type GeneratedChallengeDraft,
} from "@/lib/challenge-generation.server";
import { slugify, type Difficulty } from "@/lib/admin-challenges-client";
import { logAdminAction } from "@/lib/admin-shared";

export function useGenerateChallengeDraft() {
  return useMutation({
    mutationFn: (vars: {
      categoryName: string;
      difficulty: Difficulty;
      questionFormat: "coding" | "theory";
    }) => generateChallengeDraftFn({ data: vars }),
  });
}

export function useSaveGeneratedChallenge(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      draft: GeneratedChallengeDraft;
      categoryId: string | null;
      difficulty: Difficulty;
      questionFormat: "coding" | "theory";
    }) => {
      const supabase = getSupabaseBrowserClient();
      const slug = slugify(vars.draft.title);
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          title: vars.draft.title,
          slug,
          description: vars.draft.description,
          difficulty: vars.difficulty,
          category_id: vars.categoryId,
          tags: vars.draft.tags,
          company_tags: vars.draft.company_tags,
          constraints: vars.draft.constraints,
          input_format: vars.draft.input_format,
          output_format: vars.draft.output_format,
          hints: vars.draft.hints,
          editorial: vars.draft.editorial,
          starter_code: vars.draft.starter_code,
          question_format: vars.questionFormat,
          created_by: adminId ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (vars.draft.test_cases.length > 0) {
        const { error: tcError } = await supabase.from("challenge_test_cases").insert(
          vars.draft.test_cases.map((tc) => ({
            challenge_id: data.id,
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
          })),
        );
        if (tcError) throw tcError;
      }

      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "create_challenge",
          targetType: "challenge",
          targetId: data.id,
          notes: `AI-generated: "${vars.draft.title}"`,
        });
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "challenges"] }),
  });
}
