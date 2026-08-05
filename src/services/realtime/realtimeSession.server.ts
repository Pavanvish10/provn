// Server-only: mints a short-lived OpenAI Realtime API client secret so
// the browser never sees the real OPENAI_API_KEY. The client uses the
// returned secret to negotiate its own WebRTC connection directly with
// OpenAI (see realtimeClient.ts) — this endpoint does nothing else and
// holds no session state itself.
import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";

type MintResult = { error: string | null; clientSecret?: string; model?: string };

export const createRealtimeClientSecretFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<MintResult> => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Not signed in." };

    // TODO(API_KEY): set OPENAI_API_KEY in the environment to enable the
    // realtime AI voice interviewer.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { error: "AI voice interviews are not configured yet (missing OPENAI_API_KEY)." };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: REALTIME_MODEL,
          modalities: ["audio", "text"],
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`[realtime.session] status=${response.status}`, body);
        if (response.status === 401 || response.status === 403) {
          return {
            error: "AI voice interviews are not configured correctly (invalid OPENAI_API_KEY).",
          };
        }
        if (response.status === 404) {
          return {
            error:
              "AI voice interviews are temporarily unavailable (Realtime API not reachable). Please try again shortly.",
          };
        }
        if (response.status === 429) {
          return { error: "AI voice interviews are busy right now. Please try again in a moment." };
        }
        return { error: "Could not start the realtime session. Please try again." };
      }

      const json = (await response.json()) as { client_secret?: { value?: string } };
      const clientSecret = json.client_secret?.value;
      if (!clientSecret) return { error: "Realtime session did not return a client secret." };

      return { error: null, clientSecret, model: REALTIME_MODEL };
    } catch (err) {
      console.error("[realtime.session] network error", err);
      return { error: "Could not reach the AI provider. Please try again." };
    }
  },
);
