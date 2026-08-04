// Shared Gemini plumbing for every AI feature (resume analysis, JD
// matching, roadmap generation, mock interviews, challenge explanations,
// AI question generation). Centralized here on purpose: the production
// outage this file fixes was caused by "gemini-2.0-flash" (Google retired
// it) being hardcoded as the fallback default independently in 5 files —
// one place to update means it can't drift out of sync again.
//
// gemini-2.5-flash was tried first and also failed in production — not
// retired, but Google's API returned "no longer available to new users",
// and this project's key is on a newer account tier. Trying the current
// generation instead.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/** Turns whatever Gemini (or a network failure) throws into a message safe
 * to show the user, and — critically — logs the full raw error server-side
 * first. `context` identifies which feature/call failed (e.g.
 * "resume.analyze") so `vercel logs` actually tells you where to look
 * instead of every AI feature logging an indistinguishable "gemini error". */
export function friendlyGeminiError(err: unknown, context = "unknown"): string {
  const status = (err as { status?: number } | null)?.status;
  const statusText = (err as { statusText?: string } | null)?.statusText;
  const errorDetails = (err as { errorDetails?: unknown } | null)?.errorDetails;
  const message = err instanceof Error ? err.message : String(err);

  console.error(`[gemini:${context}] model=${GEMINI_MODEL} status=${status ?? "n/a"}`, {
    statusText,
    message,
    errorDetails,
  });

  if (status === 400 && /api key not valid/i.test(message)) {
    return "AI analysis is not configured correctly (invalid GEMINI_API_KEY).";
  }
  if (status === 403) {
    return "AI analysis is not configured correctly (invalid or unauthorized GEMINI_API_KEY).";
  }
  if (status === 404) {
    return "AI analysis is temporarily unavailable (configured model not found). Please try again shortly.";
  }
  if (status === 429) {
    return "AI analysis is busy right now. Please try again in a moment.";
  }
  if (status && status >= 500) {
    return "The AI provider is temporarily unavailable. Please try again shortly.";
  }
  return "Could not reach the AI provider. Please try again.";
}

/** Retries a Gemini call once on a transient failure (429 rate limit, 503
 * overloaded) with a short backoff before giving up. Non-transient errors
 * (bad API key, model not found, malformed request) fail immediately —
 * retrying those only adds latency to a request that can never succeed. */
export async function withGeminiRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number } | null)?.status;
      const retriable = status === 429 || status === 503;
      if (!retriable || attempt === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}
