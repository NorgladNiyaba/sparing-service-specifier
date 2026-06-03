import { randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex"); // 256-bit, 64 hex chars
}

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_TYPES: Array<{ exts: string[]; magic: number[]; mime: string }> = [
  { exts: [".pdf"],                   magic: [0x25, 0x50, 0x44, 0x46],             mime: "application/pdf" },
  { exts: [".docx", ".xlsx", ".pptx"],magic: [0x50, 0x4B, 0x03, 0x04],             mime: "application/zip" },
  { exts: [".jpg", ".jpeg"],          magic: [0xFF, 0xD8, 0xFF],                   mime: "image/jpeg" },
  { exts: [".png"],                   magic: [0x89, 0x50, 0x4E, 0x47],             mime: "image/png" },
  { exts: [".gif"],                   magic: [0x47, 0x49, 0x46, 0x38],             mime: "image/gif" },
  { exts: [".webp"],                  magic: [0x52, 0x49, 0x46, 0x46],             mime: "image/webp" },
];

export type FileValidationError = string;

export function validateFileBytes(
  filename: string,
  size: number,
  headerBytes: Uint8Array
): FileValidationError | null {
  if (size > MAX_FILE_SIZE) return "File exceeds the 20 MB limit.";

  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  const allowed = ALLOWED_TYPES.find((t) => t.exts.includes(ext));

  if (!allowed) {
    return "File type not allowed. Accepted: PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, PNG, GIF, WebP.";
  }

  const magicMatch = allowed.magic.every((b, i) => headerBytes[i] === b);
  if (!magicMatch) {
    return "File content does not match its declared type. Please do not rename files.";
  }

  return null;
}

/** Opaque storage path: no original filename, just UUID + extension */
export function secureStoragePath(clientId: string, filename: string, prefix = "uploads"): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  const uuid = randomBytes(16).toString("hex");
  return `${clientId}/${prefix}/${uuid}${ext}`;
}
