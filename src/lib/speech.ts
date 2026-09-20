// Client-only browser voice/camera plumbing for the AI Voice Interview
// room: camera preview, live mic level (for the waveform), speech-to-text
// (candidate's spoken answers), and text-to-speech (the AI's questions).
// Every hook here is a no-op / reports "unsupported" during SSR and on
// browsers without the relevant API — the room UI falls back to a text
// input for STT so the whole flow still works end to end everywhere.

import { useCallback, useEffect, useRef, useState } from "react";

// ---- Minimal ambient types for the (still non-standard) Web Speech API ----
type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ 0: SpeechRecognitionResultLike; isFinal: boolean }>;
};
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const LANG_CODE: Record<string, string> = {
  english: "en-US",
  hindi: "hi-IN",
  hinglish: "en-IN",
};

// ---------------------------------------------------------------------
// Camera preview
// ---------------------------------------------------------------------
export function useCameraStream(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("requesting");
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("granted");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("denied");
        setError(err instanceof Error ? err.message : "Could not access the camera.");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled]);

  return { videoRef, status, error };
}

// ---------------------------------------------------------------------
// Live mic level (0..1) — drives the waveform while the candidate talks.
// ---------------------------------------------------------------------
export function useMicLevel(enabled: boolean) {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    setStatus("requesting");

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setStatus("granted");
        audioCtx = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
        const source = audioCtx.createMediaStreamSource(s);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 90));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("denied");
        setError(err instanceof Error ? err.message : "Could not access the microphone.");
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, [enabled]);

  return { level, status, error };
}

// ---------------------------------------------------------------------
// Speech-to-text: continuous recognition with live interim transcript.
// ---------------------------------------------------------------------
export function useSpeechRecognition(language: string) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = isSpeechRecognitionSupported();

  const start = useCallback(() => {
    if (!supported) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANG_CODE[language] ?? "en-US";
    recognition.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalText) setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText).trim());
      setInterimTranscript(interim);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [language, supported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, transcript, interimTranscript, start, stop, reset };
}

// ---------------------------------------------------------------------
// Text-to-speech: the AI "speaking" the current question aloud.
// ---------------------------------------------------------------------
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const supported = isSpeechSynthesisSupported();

  const speak = useCallback(
    (text: string, opts: { gender: "male" | "female"; language: string }) => {
      return new Promise<void>((resolve) => {
        if (!supported) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = LANG_CODE[opts.language] ?? "en-US";
        utter.rate = 1;
        utter.pitch = opts.gender === "female" ? 1.1 : 0.9;

        const voices = window.speechSynthesis.getVoices();
        const langVoices = voices.filter((v) => v.lang.startsWith(utter.lang.slice(0, 2)));
        const pool = langVoices.length > 0 ? langVoices : voices;
        const femaleHint = /female|zira|samantha|susan|google us english/i;
        const maleHint = /male|david|daniel|google uk english male/i;
        const match =
          pool.find((v) => (opts.gender === "female" ? femaleHint : maleHint).test(v.name)) ??
          pool[opts.gender === "female" ? 0 : pool.length - 1];
        if (match) utter.voice = match;

        utter.onstart = () => setSpeaking(true);
        utter.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utter.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utter);
      });
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => () => cancel(), [cancel]);

  return { supported, speaking, speak, cancel };
}
