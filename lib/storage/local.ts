import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { FileUploadResult, StorageProvider } from "./index";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(
      process.cwd(),
      process.env.LOCAL_STORAGE_DIR || "./uploads/resumes"
    );
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<FileUploadResult> {
    await this.ensureDirectory();

    const fileExt = path.extname(originalFilename).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString("hex");
    const safeKey = `${Date.now()}-${randomHex}${fileExt}`;
    const filePath = path.join(this.baseDir, safeKey);

    await fs.writeFile(filePath, fileBuffer);

    return {
      key: safeKey,
      originalFilename: this.sanitizeFilename(originalFilename),
      mimeType,
      size: fileBuffer.length,
      storedPath: filePath,
    };
  }

  async getFile(key: string): Promise<Buffer> {
    const safeKey = path.basename(key); // prevent path traversal
    const filePath = path.join(this.baseDir, safeKey);
    return await fs.readFile(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const safeKey = path.basename(key);
      const filePath = path.join(this.baseDir, safeKey);
      await fs.unlink(filePath);
    } catch (e) {
      console.warn(`Could not delete file ${key}:`, e);
    }
  }
}
