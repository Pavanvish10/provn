import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileQueryKey, useProfile, type Profile } from "@/lib/profile-client";
import {
  useAchievements,
  useEducation,
  useExperience,
  useProjects,
  useSkills,
  type Achievement,
  type Education,
  type Experience,
  type Project,
  type Skill,
} from "@/lib/profile-sections-client";
import { useCurrentResume } from "@/lib/resume-client";
import type { ResumeAnalysis } from "@/lib/resume.server";

/** Certifications/languages have no dedicated table — they only exist inside the
 * uploaded resume's AI analysis JSON. Surfaced separately and clearly labeled. */
export type LiveResumeExtras = {
  certifications: string[];
  languages: string[];
};

export type LiveResumeData = {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  achievements: Achievement[];
  skills: Skill[];
  /** Present only when the student has an uploaded resume with analyzed extras
   * not already reflected in the structural tables above. */
  resumeExtras: LiveResumeExtras | null;
  /** True when the student has uploaded a PDF resume at all (used for framing, not display of ATS internals). */
  hasUploadedResume: boolean;
};

export function useLiveResumeData(profileId: string | undefined) {
  const profile = useProfile(profileId);
  const education = useEducation(profileId);
  const experience = useExperience(profileId);
  const projects = useProjects(profileId);
  const achievements = useAchievements(profileId);
  const skills = useSkills(profileId);
  const resume = useCurrentResume(profileId);

  const isLoading =
    profile.isLoading ||
    education.isLoading ||
    experience.isLoading ||
    projects.isLoading ||
    achievements.isLoading ||
    skills.isLoading ||
    resume.isLoading;

  const isError =
    profile.isError ||
    education.isError ||
    experience.isError ||
    projects.isError ||
    achievements.isError ||
    skills.isError ||
    resume.isError;

  const analysis = resume.data?.analysis as Partial<ResumeAnalysis> | null | undefined;
  const certifications = (analysis?.certifications ?? []).filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0,
  );
  const languages = (analysis?.languages ?? []).filter(
    (l): l is string => typeof l === "string" && l.trim().length > 0,
  );
  const hasExtras = certifications.length > 0 || languages.length > 0;

  const data: LiveResumeData | undefined = profile.data
    ? {
        profile: profile.data,
        education: education.data ?? [],
        experience: experience.data ?? [],
        projects: projects.data ?? [],
        achievements: achievements.data ?? [],
        skills: skills.data ?? [],
        resumeExtras: hasExtras ? { certifications, languages } : null,
        hasUploadedResume: !!resume.data,
      }
    : undefined;

  return { data, isLoading, isError };
}

/** Best-effort freshness stamp on the current user's own profile after they export their Live Resume. */
export function useStampLiveResumeDownloaded(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!profileId) return;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({ live_resume_updated_at: new Date().toISOString() })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(profileId) });
    },
  });
}
