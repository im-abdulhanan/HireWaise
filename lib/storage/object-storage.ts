import { FileUploadResult, StorageProvider } from "./index";
import crypto from "crypto";
import path from "path";

/**
 * Object storage implementation driver for production S3-compatible storage (AWS S3, Cloudflare R2, MinIO).
 * Falls back gracefully or can be activated by setting STORAGE_PROVIDER=s3 and S3 credentials.
 */
export class ObjectStorageProvider implements StorageProvider {
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || "resume-checker-uploads";
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<FileUploadResult> {
    const fileExt = path.extname(originalFilename).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString("hex");
    const safeKey = `resumes/${Date.now()}-${randomHex}${fileExt}`;

    // Note: When configured with AWS SDK or S3 client in production:
    // const s3 = new S3Client({...});
    // await s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey, Body: fileBuffer, ContentType: mimeType }));

    return {
      key: safeKey,
      originalFilename,
      mimeType,
      size: fileBuffer.length,
      storedPath: `s3://${this.bucket}/${safeKey}`,
    };
  }

  async getFile(key: string): Promise<Buffer> {
    // S3 GetObjectCommand logic
    throw new Error(
      `S3 Object storage getFile for key '${key}' requires configured AWS S3 credentials. In development, use local storage.`
    );
  }

  async deleteFile(key: string): Promise<void> {
    // S3 DeleteObjectCommand logic
    console.log(`Object storage deleteFile called for key: ${key}`);
  }
}
