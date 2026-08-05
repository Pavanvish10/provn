import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";

export function RetakeInterviewButton() {
  const navigate = useNavigate();

  function handleRetake() {
    InterviewFlowController.resetInterview();
    navigate({ to: INTERVIEW_ROUTES.setup });
  }

  return (
    <motion.button
      type="button"
      onClick={handleRetake}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:opacity-95"
    >
      <RotateCcw className="h-4 w-4" />
      Retake Interview
    </motion.button>
  );
}
