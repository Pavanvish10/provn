import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyGeminiError } from "@/lib/ai.server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function slugify(role: string) {
  return role
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+)|(-+$)/g, "");
}

type GeneratedRoadmap = {
  title: string;
  description: string;
  steps: { title: string; description: string; estimated_hours: number }[];
};

const ROADMAP_PROMPT = (
  role: string,
) => `You are a career coach designing a learning roadmap for someone targeting the role: "${role}".

Respond with ONLY a JSON object (no markdown fences, no prose) matching this exact shape:

{
  "title": string (a clean role title, e.g. "Frontend Developer"),
  "description": string (1-2 sentence summary of what this track covers and roughly how many weeks it takes),
  "steps": [
    { "title": string (a short phase name, e.g. "Foundations"), "description": string (concrete topics/skills for this phase, semicolon-separated), "estimated_hours": number (realistic hours to complete this phase) }
  ]
}

Produce between 4 and 6 steps, ordered from fundamentals through interview preparation. Be concrete and realistic — no filler.`;

export const generateRoadmapForRoleFn = createServerFn({ method: "POST" })
  .validator(z.object({ role: z.string().trim().min(2).max(80) }))
  .handler(
    async ({ data }): Promise<{ error: string | null; roadmapId?: string; created?: boolean }> => {
      const supabase = getSupabaseServerClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: "Not signed in." };

      const slug = slugify(data.role);
      if (!slug) return { error: "Enter a valid role." };

      const { data: existing, error: existingError } = await supabase
        .from("roadmap_templates")
        .select("id")
        .eq("role", slug)
        .maybeSingle();
      if (existingError) return { error: existingError.message };
      if (existing) return { error: null, roadmapId: existing.id, created: false };

      // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable AI roadmap generation.
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          error: "AI roadmap generation is not configured yet (missing GEMINI_API_KEY).",
        };
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json" },
      });

      let text: string;
      try {
        const result = await model.generateContent(ROADMAP_PROMPT(data.role));
        text = result.response.text();
      } catch (err) {
        return { error: friendlyGeminiError(err) };
      }

      if (!text) {
        return { error: "AI roadmap generation returned no result. Try again." };
      }

      let generated: GeneratedRoadmap;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        return { error: "Could not parse the generated roadmap. Try again." };
      }
      if (!generated?.steps?.length) {
        return { error: "The generated roadmap had no steps. Try again." };
      }

      // Re-check right before insert to avoid a duplicate if two requests raced.
      const { data: raceCheck } = await supabase
        .from("roadmap_templates")
        .select("id")
        .eq("role", slug)
        .maybeSingle();
      if (raceCheck) return { error: null, roadmapId: raceCheck.id, created: false };

      const { data: inserted, error: insertError } = await supabase
        .from("roadmap_templates")
        .insert({
          role: slug,
          title: generated.title || data.role,
          description: generated.description ?? null,
          is_premium: false,
          created_by: auth.user.id,
        })
        .select("id")
        .single();
      if (insertError || !inserted)
        return { error: insertError?.message ?? "Could not save the roadmap." };

      const stepRows = generated.steps.map((step, i) => ({
        roadmap_id: inserted.id,
        title: step.title || `Phase ${i + 1}`,
        description: step.description ?? null,
        order_index: i,
        estimated_hours: Math.max(1, Math.round(step.estimated_hours) || 10),
      }));
      const { error: stepsError } = await supabase.from("roadmap_steps").insert(stepRows);
      if (stepsError) return { error: stepsError.message };

      return { error: null, roadmapId: inserted.id, created: true };
    },
  );
