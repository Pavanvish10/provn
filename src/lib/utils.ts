import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact relative time, e.g. "5m", "2h", "3d" — for feed/notification timestamps. */
export function formatTimeAgo(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: false })
    .replace(/^(\d+)\s*seconds?$/, "$1s")
    .replace(/^(\d+)\s*minutes?$/, "$1m")
    .replace(/^(\d+)\s*hours?$/, "$1h")
    .replace(/^(\d+)\s*days?$/, "$1d")
    .replace(/^(\d+)\s*months?$/, "$1mo")
    .replace(/^(\d+)\s*years?$/, "$1y");
}
