import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { InterviewUser } from "@/types/interview";

const DUMMY_USER: InterviewUser = {
  name: "Alex Morgan",
  role: "Aspiring Software Engineer",
  initials: "AM",
};

export function DashboardHeader() {
  const [search, setSearch] = useState("");
  const [hasUnread] = useState(true);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-30 border-b border-white/10 bg-white/60 backdrop-blur-xl dark:bg-slate-950/60"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 shadow-lg shadow-fuchsia-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              AI Interview
            </h1>
            <p className="text-xs text-muted-foreground">Your personal interview command center</p>
          </div>
        </div>

        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Search interviews, companies, roles..."
              className="w-full rounded-full border border-white/20 bg-white/50 py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none ring-0 backdrop-blur-md transition placeholder:text-muted-foreground focus:border-violet-400/60 focus:bg-white/80 dark:bg-white/5 dark:focus:bg-white/10"
            />
          </div>
        </div>

        <div className="order-2 flex items-center gap-3 sm:order-3">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/50 text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Bell className="h-4.5 w-4.5" />
            {hasUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full border border-white/20 bg-white/50 py-1 pl-1 pr-3 shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10",
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={DUMMY_USER.avatarUrl} alt={DUMMY_USER.name} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-semibold text-white">
                    {DUMMY_USER.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{DUMMY_USER.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{DUMMY_USER.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{DUMMY_USER.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile settings</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
