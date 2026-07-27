import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ADMIN_PAGE_SIZE, logAdminAction } from "@/lib/admin-shared";

export type AdminRoadmap = Database["public"]["Tables"]["roadmap_templates"]["Row"];
export type RoadmapStep = Database["public"]["Tables"]["roadmap_steps"]["Row"];

export function useAdminRoadmaps(params: { search: string; page: number }) {
  return useQuery({
    queryKey: ["admin", "roadmaps", params],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("roadmap_templates").select("*", { count: "exact" });
      const q = params.search.trim().replace(/[,()%]/g, "");
      if (q) query = query.or(`title.ilike.%${q}%,role.ilike.%${q}%`);

      const from = params.page * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as AdminRoadmap[], count: count ?? 0 };
    },
  });
}

export type RoadmapFormValues = {
  role: string;
  title: string;
  description: string | null;
  is_premium: boolean;
};

export function useCreateRoadmap(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: RoadmapFormValues) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("roadmap_templates")
        .insert({ ...values, created_by: adminId ?? null })
        .select("id")
        .single();
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "create_roadmap",
          targetType: "roadmap_template",
          targetId: data.id,
          notes: `Created "${values.title}" (${values.role})`,
        });
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roadmaps"] }),
  });
}

export function useUpdateRoadmap(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RoadmapFormValues }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("roadmap_templates").update(values).eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "update_roadmap",
          targetType: "roadmap_template",
          targetId: id,
          notes: `Updated "${values.title}"`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roadmaps"] }),
  });
}

export function useDeleteRoadmap(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("roadmap_templates").delete().eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_roadmap",
          targetType: "roadmap_template",
          targetId: id,
          notes: `Deleted "${title}" (steps cascade-deleted)`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "roadmaps"] }),
  });
}

export function useRoadmapSteps(roadmapId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "roadmap-steps", roadmapId],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("roadmap_steps")
        .select("*")
        .eq("roadmap_id", roadmapId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as RoadmapStep[];
    },
    enabled: !!roadmapId,
  });
}

export type StepFormValues = {
  title: string;
  description: string | null;
  resource_url: string | null;
  estimated_hours: number;
};

export function useAddStep(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roadmapId,
      values,
      orderIndex,
    }: {
      roadmapId: string;
      values: StepFormValues;
      orderIndex: number;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("roadmap_steps")
        .insert({ ...values, roadmap_id: roadmapId, order_index: orderIndex })
        .select("id")
        .single();
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "add_roadmap_step",
          targetType: "roadmap_step",
          targetId: data.id,
        });
      }
      return roadmapId;
    },
    onSuccess: (roadmapId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "roadmap-steps", roadmapId] }),
  });
}

export function useUpdateStep(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      roadmapId,
      patch,
    }: {
      id: string;
      roadmapId: string;
      patch: Database["public"]["Tables"]["roadmap_steps"]["Update"];
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("roadmap_steps").update(patch).eq("id", id);
      if (error) throw error;
      if (adminId && patch.title !== undefined) {
        await logAdminAction(supabase, {
          adminId,
          action: "update_roadmap_step",
          targetType: "roadmap_step",
          targetId: id,
        });
      }
      return roadmapId;
    },
    onSuccess: (roadmapId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "roadmap-steps", roadmapId] }),
  });
}

export function useDeleteStep(adminId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roadmapId }: { id: string; roadmapId: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("roadmap_steps").delete().eq("id", id);
      if (error) throw error;
      if (adminId) {
        await logAdminAction(supabase, {
          adminId,
          action: "delete_roadmap_step",
          targetType: "roadmap_step",
          targetId: id,
        });
      }
      return roadmapId;
    },
    onSuccess: (roadmapId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "roadmap-steps", roadmapId] }),
  });
}

/** Swaps order_index between two steps to move one up or down in the list. */
export function useSwapStepOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roadmapId,
      a,
      b,
    }: {
      roadmapId: string;
      a: { id: string; order_index: number };
      b: { id: string; order_index: number };
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { error: e1 } = await supabase
        .from("roadmap_steps")
        .update({ order_index: b.order_index })
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("roadmap_steps")
        .update({ order_index: a.order_index })
        .eq("id", b.id);
      if (e2) throw e2;
      return roadmapId;
    },
    onSuccess: (roadmapId) =>
      queryClient.invalidateQueries({ queryKey: ["admin", "roadmap-steps", roadmapId] }),
  });
}
