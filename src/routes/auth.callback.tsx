import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { exchangeCodeForSessionFn } from "@/lib/auth.server";

const searchSchema = z.object({
  code: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (search.error_description) {
      throw redirect({ to: "/login" });
    }
    if (!search.code) {
      throw redirect({ to: "/login" });
    }
    const result = await exchangeCodeForSessionFn({ data: { code: search.code } });
    if (result.error) {
      throw redirect({ to: "/login" });
    }
    // "/" already has the correct account-type-aware + onboarding-aware
    // redirect (see src/routes/index.tsx) — reuse it instead of hardcoding
    // a student-only destination here.
    throw redirect({ to: "/" });
  },
  component: () => null,
});
