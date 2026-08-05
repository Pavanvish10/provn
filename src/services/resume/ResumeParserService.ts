import { ResumeAnalyzer, type ResumeProfile } from "@/ai/resume/ResumeAnalyzer";
import {
  MOCK_RESUME_TEXT,
  type ResumeFileFormat,
  type ResumeFileInput,
} from "@/ai/resume/ResumeParser";
import {
  ResumeUploadService,
  type UploadProgressEvent,
} from "@/services/resume/ResumeUploadService";
import { ResumeValidationService } from "@/services/resume/ResumeValidationService";

// The seam between "a File the browser handed us" and Sprint 7's resume
// intelligence engine, which only ever operates on plain text. Text
// extraction is format-dependent and swappable — everything downstream
// (ResumeAnalyzer, CandidateKnowledgeGraph, the Interview Brain, the
// Evaluation Engine) only ever sees a ResumeProfile, so dropping in a
// real PDF/DOCX extractor later (e.g. pdf.js, mammoth) means changing
// exactly one method here.

export interface ParsedResume {
  profile: ResumeProfile;
  filename: string;
  sourceFormat: ResumeFileFormat;
  /** True when the source format required the mock-text fallback below
   * (no OCR/binary parsing in this sprint) rather than the file's real
   * content — surfaced so the UI can be honest about it. */
  isMockExtraction: boolean;
}

export class ResumeParserService {
  private readonly analyzer = new ResumeAnalyzer();

  async parseFile(
    file: File,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<ParsedResume> {
    const validation = ResumeValidationService.validate(file);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const format = ResumeValidationService.detectFormat(file);
    if (!format) {
      throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
    }

    const { text, isMockExtraction } = await this.extractText(file, format, onProgress);
    const input: ResumeFileInput = { filename: file.name, format, textContent: text };
    const profile = this.analyzer.analyze(input);

    return { profile, filename: file.name, sourceFormat: format, isMockExtraction };
  }

  /** Real text extraction for .txt via the browser's native File reading.
   * PDF/DOCX need a binary-parsing library that's out of scope for this
   * sprint (no OCR) — they fall back to a representative mock resume so
   * upload, validation, progress, and the rest of the pipeline can still
   * be exercised end to end with a realistic result. */
  private async extractText(
    file: File,
    format: ResumeFileFormat,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<{ text: string; isMockExtraction: boolean }> {
    if (format === "txt") {
      const text = await ResumeUploadService.readAsText(file, onProgress);
      return { text, isMockExtraction: false };
    }

    await ResumeUploadService.simulateProgress(onProgress);
    return { text: MOCK_RESUME_TEXT, isMockExtraction: true };
  }
}
