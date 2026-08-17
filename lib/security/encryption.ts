import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM

function getEncryptionKey(): Buffer {
  const secret =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "default-fallback-secret-for-dev-only-32chars!";

  // Hash secret with SHA-256 to ensure exact 32 bytes (256 bits)
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts sensitive plain text string (e.g. OAuth tokens) using AES-256-GCM.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted token string.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return "";

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivBase64, tagBase64, cipherTextBase64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(tagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextBase64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
