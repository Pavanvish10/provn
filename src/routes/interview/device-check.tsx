import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { DeviceCheckHeader } from "@/components/interview/DeviceCheckHeader";
import { CameraPreview } from "@/components/interview/CameraPreview";
import { MicrophoneTest } from "@/components/interview/MicrophoneTest";
import { SpeakerTest, type SpeakerStatus } from "@/components/interview/SpeakerTest";
import { InternetStatus, type InternetQuality } from "@/components/interview/InternetStatus";
import { DeviceSelector, type DeviceSelectorValues } from "@/components/interview/DeviceSelector";
import { PermissionStatus } from "@/components/interview/PermissionStatus";
import { EnvironmentChecklist } from "@/components/interview/EnvironmentChecklist";
import { DeviceSummary } from "@/components/interview/DeviceSummary";
import { ContinueInterviewButton } from "@/components/interview/ContinueInterviewButton";
import { useInterviewSession } from "@/store/InterviewSessionStore";
import { InterviewFlowController } from "@/store/InterviewFlowController";
import { INTERVIEW_ROUTES } from "@/store/InterviewNavigation";

export const Route = createFileRoute("/interview/device-check")({
  beforeLoad: () => InterviewFlowController.enforceDeviceCheckAccess(),
  head: () => ({
    meta: [
      { title: "Device Check · Provn" },
      {
        name: "description",
        content: "Check your camera, microphone, and speaker before your AI interview.",
      },
    ],
  }),
  component: DeviceCheckPage,
});

// Fallback shown only if this page is somehow reached without a saved
// setup (the beforeLoad guard above normally prevents that).
const FALLBACK_SETUP = {
  company: "Google",
  role: "Frontend Developer",
  duration: 30,
  language: "English",
};

const DUMMY_INTERNET: { quality: InternetQuality; downloadMbps: number; pingMs: number } = {
  quality: "excellent",
  downloadMbps: 86,
  pingMs: 14,
};

function DeviceCheckPage() {
  const navigate = useNavigate();
  const session = useInterviewSession();

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraDetected, setCameraDetected] = useState(false);
  const [cameraSkipped, setCameraSkipped] = useState(false);

  const [micTesting, setMicTesting] = useState(false);
  const [micDetected, setMicDetected] = useState(false);

  const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>("idle");

  const [deviceValues, setDeviceValues] = useState<DeviceSelectorValues>({
    camera: "FaceTime HD Camera",
    microphone: "Built-in Microphone",
    speaker: "Built-in Speakers",
  });

  function handleEnableCamera() {
    if (cameraEnabled || cameraLoading) return;
    setCameraSkipped(false);
    setCameraLoading(true);
    setTimeout(() => {
      setCameraLoading(false);
      setCameraEnabled(true);
      setCameraDetected(true);
    }, 1200);
  }

  function handleSkipCamera() {
    setCameraSkipped(true);
    setCameraEnabled(false);
    setCameraDetected(false);
  }

  function handleTestMicrophone() {
    if (micTesting) return;
    setMicTesting(true);
    setTimeout(() => {
      setMicTesting(false);
      setMicDetected(true);
    }, 2600);
  }

  function handleTestSpeaker() {
    if (speakerStatus === "testing") return;
    setSpeakerStatus("testing");
    setTimeout(() => setSpeakerStatus("ready"), 1600);
  }

  function handleDeviceChange(field: keyof DeviceSelectorValues, value: string) {
    setDeviceValues((current) => ({ ...current, [field]: value }));
  }

  const speakerReady = speakerStatus === "ready";
  const canContinue = (cameraDetected || cameraSkipped) && micDetected && speakerReady;

  const setupForDisplay = session.setup
    ? {
        company: session.setup.company ?? "—",
        role: session.setup.role,
        duration: session.setup.duration,
        language: session.setup.language,
      }
    : FALLBACK_SETUP;

  function handleContinue() {
    InterviewFlowController.completeDeviceCheck();
    navigate({ to: INTERVIEW_ROUTES.room });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <DeviceCheckHeader />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <CameraPreview
                enabled={cameraEnabled}
                loading={cameraLoading}
                detected={cameraDetected}
                skipped={cameraSkipped}
                onEnable={handleEnableCamera}
                onSkip={handleSkipCamera}
              />
              <MicrophoneTest
                testing={micTesting}
                detected={micDetected}
                onTest={handleTestMicrophone}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <SpeakerTest status={speakerStatus} onTest={handleTestSpeaker} />
              <InternetStatus
                quality={DUMMY_INTERNET.quality}
                downloadMbps={DUMMY_INTERNET.downloadMbps}
                pingMs={DUMMY_INTERNET.pingMs}
              />
            </div>

            <DeviceSelector values={deviceValues} onChange={handleDeviceChange} />

            <PermissionStatus
              camera={cameraDetected}
              microphone={micDetected}
              speaker={speakerReady}
            />

            <EnvironmentChecklist />
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <DeviceSummary
              cameraReady={cameraDetected}
              cameraSkipped={cameraSkipped}
              microphoneReady={micDetected}
              speakerReady={speakerReady}
              internetQuality={DUMMY_INTERNET.quality}
              setup={setupForDisplay}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-6 rounded-2xl border border-white/20 bg-white/60 p-5 shadow-sm backdrop-blur-xl dark:bg-white/5 sm:p-6"
        >
          <ContinueInterviewButton
            canContinue={canContinue}
            onBack={() => navigate({ to: INTERVIEW_ROUTES.setup })}
            onContinue={handleContinue}
          />
        </motion.div>
      </div>
    </div>
  );
}
