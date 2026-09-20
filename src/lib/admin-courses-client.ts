import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminCourse = Database["public"]["Tables"]["courses"]["Row"];

export function useAdminCourses(params: { search: string; page: number }) {
  return useQuery({
    queryKey: ["admin", "courses", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("courses").select("*", { count: "exact" });
      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.ilike("title", `%${q}%`);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("sort_order", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as AdminCourse[], count: count ?? 0 };
    },
  });
}

export type CourseFormValues = {
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  video_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
};

export function useCreateCourse(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CourseFormValues) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("courses")
        .insert({ ...values, created_by: adminId ?? null })
        .select("id")
        .single();
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "create_course",
          targetType: "course",
          targetId: data.id,
          notes: `Created "${values.title}"`,
        });
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
  });
}

export function useUpdateCourse(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CourseFormValues }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("courses")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "update_course",
          targetType: "course",
          targetId: id,
          notes: `Updated "${values.title}"`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
  });
}

/**
 * Real purchases (course_purchases) may already reference a course, so
 * "remove" a course is implemented as delisting it (is_active = false,
 * hidden from the student-facing catalog) rather than a hard delete that
 * would cascade-orphan paying customers' purchase history.
 */
export function useToggleCourseActive(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      title,
    }: {
      id: string;
      isActive: boolean;
      title: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("courses")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: isActive ? "activate_course" : "delist_course",
          targetType: "course",
          targetId: id,
          notes: `"${title}"`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
  });
}
