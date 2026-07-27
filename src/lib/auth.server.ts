import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    "Invalid login credentials": "Incorrect email or password.",
    "Email not confirmed": "Please confirm your email address before logging in.",
    "User already registered": "An account with this email already exists.",
    "Password should be at least 6 characters": "Password must be at least 6 characters.",
    "Email rate limit exceeded": "Too many attempts. Please wait a moment and try again.",
    "For security purposes, you can only request this after":
      "Please wait a moment before trying again.",
  };
  for (const [key, friendly] of Object.entries(known)) {
    if (message.includes(key)) return friendly;
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
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (error) return { error: friendlyAuthError(error.message), needsEmailConfirmation: false };
    const needsEmailConfirmation = signUpData.session === null && signUpData.user !== null;
    return { error: null, needsEmailConfirmation };
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
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.hrName,
          account_type: "company",
          pending_company: data.company,
        },
      },
    });
    if (error) return { error: friendlyAuthError(error.message), needsEmailConfirmation: false };
    const needsEmailConfirmation = signUpData.session === null && signUpData.user !== null;
    return { error: null, needsEmailConfirmation };
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
