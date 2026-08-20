import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from "zod";
import { PROMPT_INJECTION_SYSTEM_GUARD } from "@/lib/security/prompt-defense";

export type GeminiErrorCode =
  | "GEMINI_API_ERROR"
  | "GEMINI_TIMEOUT"
  | "GEMINI_INVALID_RESPONSE"
  | "SCHEMA_VALIDATION_FAILED"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_AUTH_ERROR";

export class GeminiPipelineError extends Error {
  code: GeminiErrorCode;
  retryable: boolean;
  stage: string;

  constructor(params: {
    code: GeminiErrorCode;
    message: string;
    stage?: string;
    retryable?: boolean;
    cause?: any;
  }) {
    super(params.message);
    this.name = "GeminiPipelineError";
    this.code = params.code;
    this.stage = params.stage || "AI_PIPELINE";
    this.retryable = params.retryable ?? false;
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export interface GeminiExecutionResult<T> {
  data: T;
  telemetry: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    processingDurationMs: number;
    retryCount: number;
    estimatedCostUsd: number;
  };
}

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiPipelineError({
      code: "GEMINI_AUTH_ERROR",
      message: "GEMINI_API_KEY environment variable is not configured. Please add it to your .env file.",
      retryable: false,
    });
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Calculates estimated cost for Gemini Flash models.
 * Pricing reference: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens.
 */
function estimateGeminiCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.3;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Robust JSON cleaner to parse responses from Gemini, stripping any accidental markdown wrappers,
 * thought delimiters, or extraneous non-JSON text.
 */
export function cleanAndParseJSON(rawText: string): any {
  let cleaned = (rawText || "").trim();

  // Strip markdown code fences if present
  if (cleaned.includes("```json")) {
    const match = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  } else if (cleaned.includes("```")) {
    const match = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  // If text starts with non-JSON (e.g. conversational prefix or thinking), find outermost { ... } or [ ... ]
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      const firstBracket = cleaned.indexOf("[");
      const lastBracket = cleaned.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    // Attempt basic fallback repair for dangling commas or unescaped characters
    try {
      const relaxed = cleaned.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(relaxed);
    } catch {
      throw new GeminiPipelineError({
        code: "GEMINI_INVALID_RESPONSE",
        message: `Failed to parse Gemini response as JSON: ${err?.message || "Invalid JSON syntax"}`,
        retryable: true,
      });
    }
  }
}

/**
 * Wraps a promise with a timeout to prevent hanging network requests.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new GeminiPipelineError({
          code: "GEMINI_TIMEOUT",
          message: errorMessage,
          retryable: true,
        })
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

/**
 * Checks whether an error is transient and eligible for retry.
 */
export function isRetryableGeminiError(error: any): boolean {
  if (!error) return false;
  if (error instanceof GeminiPipelineError && !error.retryable) {
    return false;
  }

  const msg = (error.message || "").toLowerCase();
  const status = error.status || error.statusCode || 0;

  // Non-retryable
  if (
    msg.includes("api_key") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("quota exceeded") ||
    status === 401 ||
    status === 403
  ) {
    return false;
  }

  // Retryable: 429, 500, 503, 504, timeout, network error, invalid JSON
  if (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === 504 ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("overloaded") ||
    msg.includes("rate limit") ||
    error.code === "GEMINI_TIMEOUT" ||
    error.code === "GEMINI_INVALID_RESPONSE"
  ) {
    return true;
  }

  return false;
}

/**
 * Executes a structured prompt with Gemini, enforcing JSON output,
 * retrying transient errors with exponential backoff, and validating output against a Zod schema.
 */
export async function generateStructuredJSON<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T, any, any>;
  modelName?: string;
  maxRetries?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<GeminiExecutionResult<T>> {
  const candidateModels = params.modelName
    ? [params.modelName]
    : [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
      ];

  const maxRetries = params.maxRetries ?? 2;
  const temperature = params.temperature ?? 0.1;
  const timeoutMs = params.timeoutMs ?? 25000; // 25 seconds timeout per call
  const client = getGeminiClient();
  const startTime = Date.now();

  let lastError: any = null;

  const combinedSystemPrompt = `
${PROMPT_INJECTION_SYSTEM_GUARD}

${params.systemPrompt}

CRITICAL: Return ONLY a valid JSON object strictly matching the requested schema. No conversational filler, no extra text, no markdown formatting outside JSON.
`.trim();

  for (const modelName of candidateModels) {
    let retryCount = 0;
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: combinedSystemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
          temperature,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const generatePromise = model.generateContent(params.userPrompt);
          const result = await withTimeout(
            generatePromise,
            timeoutMs,
            `Gemini request timed out after ${timeoutMs}ms for model ${modelName}`
          );

          const response = result.response;
          const text = response.text();

          const parsedJSON = cleanAndParseJSON(text);

          let validatedData: T;
          try {
            validatedData = params.schema.parse(parsedJSON);
          } catch (schemaErr: any) {
            throw new GeminiPipelineError({
              code: "SCHEMA_VALIDATION_FAILED",
              message: `Zod validation failed: ${schemaErr?.message || "Invalid schema"}`,
              retryable: false,
              cause: schemaErr,
            });
          }

          const usageMetadata = response.usageMetadata;
          const inputTokens =
            usageMetadata?.promptTokenCount || Math.ceil(params.userPrompt.length / 4);
          const outputTokens =
            usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
          const duration = Date.now() - startTime;

          return {
            data: validatedData,
            telemetry: {
              model: modelName,
              inputTokens,
              outputTokens,
              processingDurationMs: duration,
              retryCount,
              estimatedCostUsd: estimateGeminiCost(inputTokens, outputTokens),
            },
          };
        } catch (attemptErr: any) {
          lastError = attemptErr;
          retryCount++;

          const isRetryable = isRetryableGeminiError(attemptErr);
          const msg = attemptErr?.message || "";

          // If model is not found (404), break to try next model in candidate list
          if (
            msg.includes("404") ||
            msg.includes("not found") ||
            msg.includes("not supported") ||
            msg.includes("no longer available")
          ) {
            break;
          }

          if (!isRetryable || attempt >= maxRetries) {
            break;
          }

          // Exponential backoff: 1s, 2s
          const backoffMs = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    } catch (modelErr: any) {
      lastError = modelErr;
    }
  }

  if (lastError instanceof GeminiPipelineError) {
    throw lastError;
  }

  throw new GeminiPipelineError({
    code: "GEMINI_API_ERROR",
    message: `Gemini structured generation failed: ${lastError?.message || String(lastError)}`,
    retryable: false,
    cause: lastError,
  });
}
