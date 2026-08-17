interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 10 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export interface RateLimitOptions {
  intervalMs: number; // Window duration in ms
  maxRequests: number; // Max requests in window
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory sliding rate limiter for public endpoints.
 * @param identifier IP or user key
 * @param options maxRequests and intervalMs
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { intervalMs: 60 * 1000, maxRequests: 10 }
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + options.intervalMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      resetAt: newRecord.resetAt,
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}
