import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GEMINI_MODEL, friendlyGeminiError, withGeminiRetry } from "@/lib/ai.server";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit.server";

const SYSTEM_PROMPT = (
  name: string,
  targetRole: string | null,
) => `You are the Provn AI Assistant, a friendly and practical career coach embedded in the Provn platform.

Provn helps students and job-seekers prove their skills (not just claim them) through: AI Resume Analysis, a Career Roadmap generator, Mock Interviews (technical and soft-skills), Daily Challenges (coding/SQL/aptitude with streaks and badges), and a Business Hub where companies post jobs and review verified candidates.

You're talking to ${name || "a Provn user"}${targetRole ? `, who is targeting a "${targetRole}" role` : ""}. Help with resume advice, interview prep, career direction, study plans, and questions about how to use Provn's own features — pointing them to the right page when relevant (e.g. "/resume-analyse", "/job-preparation", "/challenges").

Keep replies concise (usually 2-5 short paragraphs or a tight bullet list), warm, and specific to what they asked — never generic filler. Plain text only, no markdown headers.`;

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
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
    if (!(await checkRateLimit(`ai:chat:${auth.user.id}`, 20, 600))) {
      return { error: RATE_LIMIT_MESSAGE };
    }

    // TODO(API_KEY): set GEMINI_API_KEY in the environment to enable the AI chat assistant.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: "AI chat isn't configured yet (missing GEMINI_API_KEY)." };
    }

    // Sprint 27: premium accounts get unlimited messages; everyone else
    // spends 1 AI credit per message. This is the reference integration
    // for the AI-credits system — see .claude/project-history.md for why
    // it's wired here first (simplest single-call AI feature) rather than
    // into every AI feature at once.
    const { data: premium } = await supabase
      .from("premium_subscriptions")
      .select("plan, status, current_period_end")
      .eq("profile_id", auth.user.id)
      .maybeSingle();
    const isPremium =
      !!premium &&
      premium.plan === "premium" &&
      premium.status === "active" &&
      (!premium.current_period_end || new Date(premium.current_period_end) > new Date());

    if (!isPremium) {
      const { data: spent, error: creditError } = await supabase.rpc("consume_ai_credits", {
        p_profile_id: auth.user.id,
        p_amount: 1,
        p_reason: "ai_chat_message",
      });
      if (creditError) return { error: creditError.message };
      if (!spent) {
        return {
          error:
            "You're out of AI credits. Buy more or upgrade to Pro for unlimited chat — see /credits or /plan.",
        };
      }
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
