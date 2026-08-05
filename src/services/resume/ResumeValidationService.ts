import { SUPPORTED_RESUME_FORMATS, type ResumeFileFormat } from "@/ai/resume/ResumeParser";

// The one place that decides whether an uploaded file is acceptable —
// format and size — reusing Sprint 7's SUPPORTED_RESUME_FORMATS rather
// than redeclaring the list of accepted formats.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const MIME_TO_FORMAT: Record<string, ResumeFileFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export interface ResumeValidationResult {
  valid: boolean;
  errors: string[];
}

export class ResumeValidationService {
  /** Prefers the browser-reported MIME type, falling back to the file
   * extension — some browsers/OSes report a generic or empty MIME type
   * for .docx in particular. */
  static detectFormat(file: File): ResumeFileFormat | null {
    const byMime = MIME_TO_FORMAT[file.type];
    if (byMime) return byMime;

    const extension = file.name.split(".").pop()?.toLowerCase();
    return (SUPPORTED_RESUME_FORMATS as string[]).includes(extension ?? "")
      ? (extension as ResumeFileFormat)
      : null;
  }

  static validate(file: File): ResumeValidationResult {
    const errors: string[] = [];

    if (!this.detectFormat(file)) {
      errors.push("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push("File is too large. Maximum size is 10MB.");
    }
    if (file.size === 0) {
      errors.push("This file appears to be empty.");
    }

    return { valid: errors.length === 0, errors };
  }
}
