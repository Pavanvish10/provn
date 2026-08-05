import { motion } from "framer-motion";
import { Award, Briefcase, GraduationCap, Info, Layers, Mail, Phone, User } from "lucide-react";

import type { ResumeProfile } from "@/ai/resume/ResumeAnalyzer";

export interface ResumeSummaryProps {
  profile: ResumeProfile;
  isMockExtraction: boolean;
}

export function ResumeSummary({ profile, isMockExtraction }: ResumeSummaryProps) {
  const { contact, skills, projects, experience, education, certifications } = profile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
      className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <h3 className="font-display text-base font-semibold text-foreground">What we found</h3>

      {isMockExtraction && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            Full text extraction for this file format isn't available yet, so this summary is based
            on a representative sample resume — everything downstream still works the same way once
            real extraction is added.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {contact.name ?? "Name not detected"}
        </span>
        {contact.email && (
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {contact.email}
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {contact.phone}
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          Skills & Technologies
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.length === 0 && (
            <span className="text-sm text-muted-foreground">None detected.</span>
          )}
          {skills.map((skill) => (
            <span
              key={skill.name}
              className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400"
            >
              {skill.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat icon={Briefcase} label="Projects" value={projects.length} />
        <SummaryStat icon={Layers} label="Roles" value={experience.length} />
        <SummaryStat icon={GraduationCap} label="Education" value={education.length} />
      </div>

      {certifications.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            Certifications
          </div>
          <ul className="mt-2 space-y-1">
            {certifications.map((cert) => (
              <li key={cert} className="text-sm text-foreground">
                {cert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/40 p-3 text-center dark:bg-white/5">
      <Icon className="mx-auto h-4 w-4 text-violet-600 dark:text-violet-400" />
      <div className="mt-1 font-display text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
