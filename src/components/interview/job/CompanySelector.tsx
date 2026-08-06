import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Check, Search } from "lucide-react";

import { CompanyKnowledgeBase } from "@/services/job/CompanyKnowledgeBase";
import { cn } from "@/lib/utils";

export interface CompanySelectorProps {
  value: string | null;
  onChange: (companyId: string) => void;
}

export function CompanySelector({ value, onChange }: CompanySelectorProps) {
  const [query, setQuery] = useState("");
  const companies = useMemo(() => CompanyKnowledgeBase.list(), []);
  const filtered = useMemo(
    () => companies.filter((company) => company.name.toLowerCase().includes(query.toLowerCase())),
    [companies, query],
  );

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search companies…"
          className="w-full rounded-xl border border-white/20 bg-white/70 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 dark:bg-white/5"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((company, index) => {
          const selected = value === company.id;
          return (
            <motion.button
              key={company.id}
              type="button"
              onClick={() => onChange(company.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3), ease: "easeOut" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left shadow-sm backdrop-blur-xl transition-colors",
                selected
                  ? "border-violet-400/60 bg-white/80 ring-2 ring-violet-400/50 dark:bg-white/10"
                  : "border-white/20 bg-white/60 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-xs font-medium text-foreground">
                {company.name}
              </span>
              {selected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
              )}
            </motion.button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            No companies match "{query}".
          </p>
        )}
      </div>
    </div>
  );
}
