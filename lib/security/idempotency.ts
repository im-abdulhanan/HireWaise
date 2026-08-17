import crypto from "crypto";

interface IdempotencyRecord {
  key: string;
  response: any;
  createdAt: number;
}

const idempotencyCache = new Map<string, IdempotencyRecord>();

// Evict expired idempotency records every 15 minutes
const idempotencyTimer = setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes TTL
  for (const [key, record] of idempotencyCache.entries()) {
    if (record.createdAt < cutoff) {
      idempotencyCache.delete(key);
    }
  }
}, 15 * 60 * 1000);

if (idempotencyTimer.unref) {
  idempotencyTimer.unref();
}

/**
 * Generates an idempotency key based on candidate email, jobId, and file hash/timestamp.
 */
export function generateSubmissionFingerprint(
  jobId: string,
  email: string,
  fileName: string,
  fileSize: number
): string {
  return crypto
    .createHash("sha256")
    .update(`${jobId.toLowerCase()}:${email.toLowerCase()}:${fileName}:${fileSize}`)
    .digest("hex");
}

/**
 * Checks if an operation with this key is already cached or completed.
 */
export function checkIdempotency(key: string): any | null {
  const record = idempotencyCache.get(key);
  if (!record) return null;
  return record.response;
}

/**
 * Stores the completed response for an idempotency key.
 */
export function recordIdempotency(key: string, response: any): void {
  idempotencyCache.set(key, {
    key,
    response,
    createdAt: Date.now(),
  });
}
