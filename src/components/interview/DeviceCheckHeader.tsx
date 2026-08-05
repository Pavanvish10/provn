import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function DeviceCheckHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <Link
        to="/interview/setup"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to setup
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-500/25">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Device Check
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Let&apos;s make sure everything is ready before your AI Interview.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
