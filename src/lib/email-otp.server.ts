// Passwordless "sign in with a code" — a self-contained alternative to
// Supabase's built-in email OTP/magic-link flow. We generate and hash the
// code ourselves, store it in email_otps, and send it via Resend
// (email.server.ts) so the email is styled like the rest of Provn's mail.
// Once the code is verified, we hand off to Supabase's admin.generateLink +
// verifyOtp so a *real* Supabase session gets established (and the
// on_auth_user_created trigger provisions a profile row for brand-new
// emails, same as any other sign-up path).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomInt, createHash, timingSafeEqual } from "node:crypto";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { sendOtpEmail } from "@/lib/email.server";

const CODE_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address");

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export const requestEmailOtpFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: emailSchema }))
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const email = data.email;
    const admin = getSupabaseAdminClient();

    const { data: recent } = await admin
      .from("email_otps")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent && Date.now() - new Date(recent.created_at).getTime() < REQUEST_COOLDOWN_MS) {
      return { error: "Please wait a moment before requesting another code." };
    }

    const code = generateCode();
    const { error: insertError } = await admin.from("email_otps").insert({
      email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (insertError) return { error: "Could not generate a code. Please try again." };

    // Best-effort tidy-up of this email's old rows; failure here shouldn't block the request.
    await admin
      .from("email_otps")
      .delete()
      .eq("email", email)
      .lt("expires_at", new Date(Date.now() - CODE_TTL_MS).toISOString());

    const sent = await sendOtpEmail({ to: email, code });
    if (!sent.sent) {
      return { error: sent.error ?? "Could not send the code. Please try again." };
    }
    return { error: null };
  });

export const verifyEmailOtpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ email: emailSchema, code: z.string().trim().length(6, "Enter the 6-digit code") }),
  )
  .handler(async ({ data }): Promise<{ error: string | null }> => {
    const email = data.email;
    const admin = getSupabaseAdminClient();

    const { data: row } = await admin
      .from("email_otps")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      return { error: "That code has expired. Request a new one." };
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return { error: "Too many incorrect attempts. Request a new code." };
    }

    if (!safeEqualHex(hashCode(data.code), row.code_hash)) {
      await admin
        .from("email_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      const remaining = MAX_ATTEMPTS - (row.attempts + 1);
      return {
        error:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Too many incorrect attempts. Request a new code.",
      };
    }

    await admin
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // admin.generateLink() doesn't run through PKCE (there's no client-side
    // code_verifier for a server-generated link), so the action_link resolves
    // straight to implicit-flow tokens in the redirect's URL fragment rather
    // than a `?code=` param — verified live against this project. We fetch
    // that redirect ourselves (never exposing the link/tokens to the browser)
    // and feed the tokens into setSession() to establish the real cookie-backed
    // session on the request-scoped client.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !linkData) {
      return { error: "Could not sign you in. Please try again." };
    }

    const verifyRes = await fetch(linkData.properties.action_link, { redirect: "manual" });
    const location = verifyRes.headers.get("location");
    const fragment = location?.split("#")[1];
    const params = fragment ? new URLSearchParams(fragment) : null;
    const accessToken = params?.get("access_token");
    const refreshToken = params?.get("refresh_token");
    if (!accessToken || !refreshToken) {
      return { error: "Could not sign you in. Please try again." };
    }

    const supabase = getSupabaseServerClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) return { error: "Could not sign you in. Please try again." };

    return { error: null };
  });
