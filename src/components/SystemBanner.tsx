import { AlertTriangle, Megaphone } from "lucide-react";

import { useSystemSettings } from "@/lib/system-settings-client";

/**
 * App-wide, informational-only banner driven by the Sprint 35 Launch
 * Command Center's maintenance-mode/announcement controls
 * (system_settings, public-read). Never blocks the app — just surfaces
 * the message an admin set.
 */
export function SystemBanner() {
  const { data } = useSystemSettings();
  if (!data) return null;

  if (data.maintenance.enabled) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-amber-950">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {data.maintenance.message ||
          "Provn is undergoing scheduled maintenance. Some features may be affected."}
      </div>
    );
  }

  if (data.announcement.active && data.announcement.message) {
    return (
      <div className="flex items-center justify-center gap-2 bg-brand px-4 py-2 text-center text-xs font-medium text-white">
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        {data.announcement.message}
      </div>
    );
  }

  return null;
}
