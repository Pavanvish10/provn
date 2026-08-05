import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";

const SYSTEM_PROMPT = (
  name: string,
  targetRole: string | null,
) => `You are the Provn AI Assistant, a friendly and practical career coach embedded in the Provn platform.

Provn helps students and job-seekers prove their skills (not just claim them) through: AI Resume Analysis, a Career Roadmap generator, Mock Interviews (technical and soft-skills), Daily Challenges (coding/SQL/aptitude with streaks and badges), and a Business Hub where companies post jobs and review verified candidates.

You're talking to ${name || "a Provn user"}${targetRole ? `, who is targeting a "${targetRole}" role` : ""}. Help with resume advice, interview prep, career direction, study plans, and questions about how to use Provn's own features — pointing them to the right page when relevant (e.g. "/resume-analyse", "/job-preparation", "/challenges").

Keep replies concise (usually 2-5 short paragraphs or a tight bullet list), warm, and specific to what they asked — never generic filler. Plain text only, no markdown headers.`;

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1),
});

export const sendChatMessageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      history: z.array(messageSchema).max(30),
      message: z.string().min(1).max(4000),
    }),
  )
  .handler(async ({ data }): Promise<{ error: string | null; reply?: string }> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI chat assistant.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "AI chat isn't configured yet (missing GEMINI_API_KEY)." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, target_role")
      .eq("id", auth.user.id)
      .maybeSingle();

    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...data.history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user" as const, parts: [{ text: data.message }] },
    ];

    let text: string | undefined;
    try {
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT(
              profile?.full_name ?? "",
              profile?.target_role ?? null,
            ),
          },
        }),
      );
      text = response.text;
    } catch (err) {
      return { error: friendlyGeminiError(err, "chat.send") };
    }

    if (!text) {
      return { error: "The assistant didn't return a response. Try again." };
    }

    return { error: null, reply: text.trim() };
  });
