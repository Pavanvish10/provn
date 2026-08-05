import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ResumeDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = ".pdf,.docx,.txt";

export function ResumeDropzone({ onFileSelected, disabled }: ResumeDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleBrowseChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
        dragActive
          ? "border-violet-400 bg-violet-500/10"
          : "border-white/30 bg-white/50 backdrop-blur-xl dark:bg-white/5",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <motion.span
        animate={dragActive ? { scale: 1.08 } : { scale: 1 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25"
      >
        {dragActive ? <FileText className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
      </motion.span>

      <div>
        <p className="font-display text-base font-semibold text-foreground">
          {dragActive ? "Drop your resume here" : "Drag & drop your resume"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">or browse your files to upload</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:opacity-95"
      >
        Browse Files
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleBrowseChange}
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT — up to 10MB</p>
    </motion.div>
  );
}
