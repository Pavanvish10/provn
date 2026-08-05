import { VideoOff, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";

export function LiveCameraTile({
  videoRef,
  cameraOn,
  micMuted,
  label = "You",
  className,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  micMuted: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-2xl border border-border bg-slate-900 shadow-lg",
        className,
      )}
    >
      {cameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-800">
          <VideoOff className="h-6 w-6 text-slate-500" />
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
        {micMuted && <MicOff className="h-2.5 w-2.5 text-rose-400" />}
        {label}
      </div>
    </div>
  );
}
