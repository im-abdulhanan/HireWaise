import { LocalStorageProvider } from "./local";
import { ObjectStorageProvider } from "./object-storage";

export interface FileUploadResult {
  key: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  storedPath?: string;
}

export interface StorageProvider {
  uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<FileUploadResult>;

  getFile(key: string): Promise<Buffer>;

  deleteFile(key: string): Promise<void>;

  getFileStream?(key: string): Promise<NodeJS.ReadableStream>;
}

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) return storageInstance;

  const providerType = process.env.STORAGE_PROVIDER || "local";

  if (providerType === "s3" || providerType === "object-storage") {
    storageInstance = new ObjectStorageProvider();
  } else {
    storageInstance = new LocalStorageProvider();
  }

  return storageInstance;
}
