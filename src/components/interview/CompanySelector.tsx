import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Company {
  name: string;
  initials: string;
  gradient: string;
}

const DUMMY_COMPANIES: Company[] = [
  { name: "Google", initials: "G", gradient: "from-blue-500 to-sky-400" },
  { name: "Microsoft", initials: "M", gradient: "from-sky-500 to-cyan-400" },
  { name: "Amazon", initials: "A", gradient: "from-orange-500 to-amber-400" },
  { name: "Meta", initials: "M", gradient: "from-indigo-500 to-blue-500" },
  { name: "Netflix", initials: "N", gradient: "from-rose-500 to-red-500" },
  { name: "Apple", initials: "A", gradient: "from-slate-600 to-slate-400" },
  { name: "Adobe", initials: "A", gradient: "from-red-500 to-rose-400" },
  { name: "Flipkart", initials: "F", gradient: "from-blue-600 to-yellow-400" },
  { name: "Razorpay", initials: "R", gradient: "from-blue-500 to-indigo-500" },
  { name: "TCS", initials: "T", gradient: "from-indigo-600 to-violet-500" },
  { name: "Infosys", initials: "I", gradient: "from-teal-500 to-emerald-400" },
];

export interface CompanySelectorProps {
  value: string | null;
  onChange: (company: string) => void;
}

export function CompanySelector({ value, onChange }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = DUMMY_COMPANIES.find((company) => company.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/60 px-4 py-3.5 text-left shadow-sm backdrop-blur-xl transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <span className="flex items-center gap-3">
            {selected ? (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-semibold text-white shadow-sm",
                  selected.gradient,
                )}
              >
                {selected.initials}
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </span>
            )}
            <span
              className={cn(
                "text-sm",
                selected ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {selected ? selected.name : "Search and select a company..."}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search companies..." />
          <CommandList>
            <CommandEmpty>No company found.</CommandEmpty>
            <CommandGroup>
              {DUMMY_COMPANIES.map((company) => (
                <CommandItem
                  key={company.name}
                  value={company.name}
                  onSelect={() => {
                    onChange(company.name);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-[10px] font-semibold text-white",
                      company.gradient,
                    )}
                  >
                    {company.initials}
                  </span>
                  <span className="flex-1">{company.name}</span>
                  {value === company.name && <Check className="h-4 w-4 text-violet-600" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
