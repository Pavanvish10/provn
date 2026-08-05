import { motion } from "framer-motion";
import { FileText, RefreshCw, Trash2 } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ResumePreviewProps {
  filename: string;
  sizeBytes: number;
  sourceFormat: string;
  uploadedAt: number;
  onReplace: () => void;
  onDelete: () => void;
}

export function ResumePreview({
  filename,
  sizeBytes,
  sourceFormat,
  uploadedAt,
  onReplace,
  onDelete,
}: ResumePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md">
        <FileText className="h-6 w-6" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{filename}</p>
        <p className="text-xs text-muted-foreground">
          {sourceFormat.toUpperCase()} · {formatFileSize(sizeBytes)} · Uploaded{" "}
          {new Date(uploadedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/50 px-4 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Replace
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}
