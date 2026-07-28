// Shared error-mapping for Anthropic API calls. Every AI feature (resume
// analysis, JD matching, roadmap generation, mock interviews, challenge
// explanations) must degrade gracefully with a clear { error } instead of
// throwing — callers wrap their `messages.create` call in try/catch and use
// this to turn whatever Anthropic (or a network failure) throws into a
// message safe to show the user.
export function friendlyAnthropicError(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  const message = err instanceof Error ? err.message : String(err);

  if (status === 401) {
    return "AI analysis is not configured correctly (invalid ANTHROPIC_API_KEY).";
  }
  if (status === 400 && /credit balance/i.test(message)) {
    return "AI analysis is temporarily unavailable — the AI provider account has no credit balance.";
  }
  if (status === 429) {
    return "AI analysis is busy right now. Please try again in a moment.";
  }
  if (status && status >= 500) {
    return "The AI provider is temporarily unavailable. Please try again shortly.";
  }
  return "Could not reach the AI provider. Please try again.";
}
