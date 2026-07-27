import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { getCurrentUserFn, type AuthUser } from "@/lib/auth.server";

export const authUserQueryKey = ["auth", "user"] as const;

export function authUserQueryOptions() {
  return {
    queryKey: authUserQueryKey,
    queryFn: () => getCurrentUserFn(),
    staleTime: 5 * 60 * 1000,
  } as const;
}

export function useCurrentUser() {
  return useQuery<AuthUser | null>(authUserQueryOptions());
}

export function invalidateCurrentUser(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: authUserQueryKey });
}
