import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

export interface ParsedDocumentResult {
  text: string;
  pageCount?: number;
  wordCount: number;
  detectedFormat: "pdf" | "docx";
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

/**
 * Validates document buffer for size and magic bytes.
 */
export function validateDocumentFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): { isValid: boolean; format: "pdf" | "docx"; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, format: "pdf", error: "Uploaded file is empty." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      format: "pdf",
      error: "File exceeds the maximum upload limit of 10MB.",
    };
  }

  const ext = path.extname(filename).toLowerCase();

  // Check PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, format: "pdf" };
  }

  // Check DOCX magic bytes: PK (0x50 0x4B 0x03 0x04)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return { isValid: true, format: "docx" };
  }

  // Fallback check on extension if mime matches
  if (ext === ".pdf") {
    return { isValid: true, format: "pdf" };
  } else if (ext === ".docx") {
    return { isValid: true, format: "docx" };
  }

  return {
    isValid: false,
    format: "pdf",
    error: "Unsupported file format. Please upload a valid PDF or DOCX file.",
  };
}

/**
 * Cleans and normalizes extracted raw text from document files.
 */
export function normalizeExtractedText(text: string): string {
  if (!text) return "";

  return text
    // Replace non-breaking spaces and other odd spaces with normal space
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    // Strip null and control chars except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize Windows/Mac line endings to \n
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Replace 3+ consecutive newlines with 2 newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts raw text from a PDF or DOCX buffer.
 */
export async function extractTextFromDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<ParsedDocumentResult> {
  const validation = validateDocumentFile(fileBuffer, filename, mimeType);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid file format");
  }

  try {
    if (validation.format === "pdf") {
      const pdfData = await pdfParse(fileBuffer);
      const rawText = pdfData.text || "";
      const normalized = normalizeExtractedText(rawText);

      if (normalized.length < 20) {
        throw new Error(
          "PDF does not contain selectable text (it may be a scanned image or empty)."
        );
      }

      const wordCount = normalized.split(/\s+/).filter(Boolean).length;

      return {
        text: normalized,
        pageCount: pdfData.numpages || 1,
        wordCount,
        detectedFormat: "pdf",
      };
    } else {
      // DOCX Parsing via mammoth
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const rawText = result.value || "";
      const normalized = normalizeExtractedText(rawText);

      if (normalized.length < 20) {
        throw new Error("DOCX document is empty or unreadable.");
      }

      const wordCount = normalized.split(/\s+/).filter(Boolean).length;

      return {
        text: normalized,
        wordCount,
        detectedFormat: "docx",
      };
    }
  } catch (error: any) {
    console.error("Document extraction error:", error);
    throw new Error(
      `Failed to parse ${validation.format.toUpperCase()} file: ${
        error.message || "Corrupted or password-protected document."
      }`
    );
  }
}
