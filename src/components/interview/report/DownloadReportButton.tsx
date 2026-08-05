import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function DownloadReportButton() {
  return (
    <motion.button
      type="button"
      onClick={() => toast.info("PDF export is coming in a future update.")}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/10"
    >
      <Download className="h-4 w-4" />
      Download Report
    </motion.button>
  );
}
