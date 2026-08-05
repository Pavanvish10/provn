// Browser-only file reading — no backend, no network request. "Upload"
// here means "read the file into memory locally," but the progress
// events are genuine FileReader events, not faked, wherever the browser
// can report them (readAsText on real files does).

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

const SIMULATED_PROGRESS_STEPS = [15, 35, 60, 85, 100];
const SIMULATED_STEP_DELAY_MS = 140;

export class ResumeUploadService {
  /** Real, browser-reported progress — used for .txt, the one format this
   * sprint can genuinely read client-side. */
  static readAsText(
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read the file."));
      reader.readAsText(file);
    });
  }

  /** A short, evenly-paced progress sequence for formats this sprint
   * can't genuinely stream progress for (see ResumeParserService's PDF/
   * DOCX fallback) — keeps the progress bar's behavior consistent across
   * formats instead of jumping straight from 0% to 100%. */
  static async simulateProgress(onProgress?: (event: UploadProgressEvent) => void): Promise<void> {
    for (const percent of SIMULATED_PROGRESS_STEPS) {
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_STEP_DELAY_MS));
      onProgress?.({ loaded: percent, total: 100, percent });
    }
  }
}
