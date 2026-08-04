import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email.server";

/** Signs up via the ADMIN api (email_confirm: false) instead of the public
 * auth.signUp(), then sends the confirmation link ourselves over Resend.
 * This is not just "more reliable" — it's the actual fix for a live,
 * reproduced bug: Supabase's public signUp() bundles account creation with
 * sending its own confirmation email, and that email goes through
 * Supabase's default mailer (no custom SMTP configured on this project,
 * rate-limited to a couple sends/hour and not meant for real traffic —
 * confirmed live via a real signup attempt that failed outright with
 * "email rate limit exceeded"). Because signUp() treats the two as one
 * transaction, hitting that limit doesn't just skip the email — it REJECTS
 * the entire signup, so the account is never created at all.
 *
 * admin.createUser() explicitly does not send any email (per the SDK's own
 * docs), so it can't trip that limiter — account creation always succeeds,
 * and delivery is handled entirely through Resend (the channel this project
 * already trusts for sign-in OTPs, interview scheduling, etc.).
 */
async function createAccountAndSendConfirmation(params: {
  email: string;
  password: string;
  fullName: string;
  userMetadata: Record<string, unknown>;
  redirectTo?: string;
  isBusiness?: boolean;
}): Promise<{ error: string | null; needsEmailConfirmation: boolean }> {
  const admin = getSupabaseAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: false,
    user_metadata: params.userMetadata,
  });
  if (createError) {
    return { error: friendlyAuthError(createError.message), needsEmailConfirmation: false };
  }

  try {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: params.email,
      password: params.password,
      options: params.redirectTo ? { redirectTo: params.redirectTo } : undefined,
    });
    if (linkError || !linkData.properties?.action_link) {
      console.error("[auth] generateLink failed for confirmation email:", linkError);
    } else {
      const result = await sendConfirmationEmail({
        to: params.email,
        fullName: params.fullName,
        confirmLink: linkData.properties.action_link,
        isBusiness: params.isBusiness,
      });
      if (!result.sent) {
        console.error("[auth] Resend confirmation email failed:", result.error);
      } else {
        console.log(`[auth] Confirmation email sent to ${params.email} via Resend.`);
      }
    }
  } catch (err) {
    console.error("[auth] Unexpected error sending confirmation email:", err);
  }

  // The account exists regardless of whether the email send above
  // succeeded — never block signup on email delivery.
  return { error: null, needsEmailConfirmation: true };
}

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: "user" | "recruiter" | "company_admin" | "admin";
  accountType: "student" | "company";
  onboardingCompleted: boolean;
};

function friendlyAuthError(message: string): string {
  const known: Record<string, string> = {
    "invalid login credentials": "Incorrect email or password.",
    "email not confirmed": "Please confirm your email address before logging in.",
    "user already registered": "An account with this email already exists.",
    "already been registered": "An account with this email already exists.",
    "email address .* is invalid": "Enter a valid email address.",
    "password should be at least 6 characters": "Password must be at least 6 characters.",
    "email rate limit exceeded": "Too many attempts. Please wait a moment and try again.",
    "for security purposes, you can only request this after":
      "Please wait a moment before trying again.",
  };
  // Case-insensitive: Supabase's error text casing differs between the
  // public auth API and the admin API for the same underlying condition
  // (e.g. "Email rate limit exceeded" vs "email rate limit exceeded"),
  // and a mismatch here means the raw Supabase error leaks to the user.
  const lower = message.toLowerCase();
  for (const [key, friendly] of Object.entries(known)) {
    if (new RegExp(key).test(lower)) return friendly;
  }
  return message;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_url, role, account_type, onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name:
        profile?.full_name ?? (data.user.user_metadata?.full_name as string | undefined) ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: (profile?.role as AuthUser["role"]) ?? "user",
      accountType: (profile?.account_type as AuthUser["accountType"]) ?? "student",
      onboardingCompleted: profile?.onboarding_completed ?? false,
    };
  },
);

export const signInFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: emailSchema, password: z.string().min(1, "Password is required") }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  });

export const signUpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: emailSchema,
      password: passwordSchema,
      fullName: z.string().trim().min(1, "Name is required"),
      redirectTo: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return createAccountAndSendConfirmation({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      userMetadata: { full_name: data.fullName },
      redirectTo: data.redirectTo,
    });
  });

const pendingCompanySchema = z.object({
  companyName: z.string().trim().min(1),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  companySize: z.string().trim().optional(),
  headquarters: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
});

export const businessSignUpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: emailSchema,
      password: passwordSchema,
      hrName: z.string().trim().min(1, "Name is required"),
      company: pendingCompanySchema,
      redirectTo: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return createAccountAndSendConfirmation({
      email: data.email,
      password: data.password,
      fullName: data.hrName,
      userMetadata: {
        full_name: data.hrName,
        account_type: "company",
        pending_company: data.company,
      },
      redirectTo: data.redirectTo,
      isBusiness: true,
    });
  });

export const getPendingCompanyDraftFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const draft = data.user?.user_metadata?.pending_company as
    z.infer<typeof pendingCompanySchema> | undefined;
  return draft ?? null;
});

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  return { error: null };
});

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: emailSchema, redirectTo: z.string().url() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  });

export const updatePasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ password: passwordSchema }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  });

export const exchangeCodeForSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  });
