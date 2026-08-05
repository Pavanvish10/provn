import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/services/realtime/transcriptManager";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export interface LiveTranscriptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: TranscriptEntry[];
}

export function LiveTranscriptPanel({ open, onOpenChange, entries }: LiveTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-white/10 bg-slate-950/95 p-0 text-white backdrop-blur-2xl sm:max-w-sm [&_svg]:text-white/60"
      >
        <SheetHeader className="border-b border-white/10 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4 text-blue-300" />
            Live Transcript
          </SheetTitle>
          <SheetDescription className="text-white/50">
            A real-time record of the conversation so far.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              The transcript will appear here once the interview begins.
            </p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "font-semibold",
                      entry.speaker === "ai" ? "text-blue-300" : "text-emerald-300",
                    )}
                  >
                    {entry.speaker === "ai" ? "AI Interviewer" : "You"}
                  </span>
                  <span className="text-white/30">{formatTimestamp(entry.timestamp)}</span>
                  {!entry.final && <span className="text-white/30">…</span>}
                </div>
                <p className="text-sm leading-relaxed text-white/80">{entry.text || " "}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
