import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareReportButton() {
  async function handleShare() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Copying isn't supported in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Report link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy the link. Please copy it manually.");
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/10"
    >
      <Share2 className="h-4 w-4" />
      Share Report
    </motion.button>
  );
}
