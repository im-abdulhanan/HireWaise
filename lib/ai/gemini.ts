import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from "zod";
import { PROMPT_INJECTION_SYSTEM_GUARD } from "@/lib/security/prompt-defense";

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
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. Please add it to your .env file."
    );
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
  let cleaned = rawText.trim();

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

  // If text starts with non-JSON (e.g. conversational prefix or thinking), find outermost { ... }
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  return JSON.parse(cleaned);
}

/**
 * Wraps a promise with a timeout to prevent hanging network requests.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

/**
 * Executes a structured prompt with Gemini, enforcing JSON output,
 * retrying transient errors, and validating output against a Zod schema.
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
  const timeoutMs = params.timeoutMs ?? 30000; // 30 seconds timeout per attempt
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
          const result = await model.generateContent(params.userPrompt);

          const response = result.response;
          const text = response.text();

          const parsedJSON = cleanAndParseJSON(text);
          const validatedData = params.schema.parse(parsedJSON);

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

          const msg = attemptErr?.message || "";
          // If model is not found (404) or no longer available, break to try next model in candidate list
          if (
            msg.includes("404") ||
            msg.includes("not found") ||
            msg.includes("not supported") ||
            msg.includes("no longer available")
          ) {
            break;
          }

          if (attempt < maxRetries) {
            const backoffMs = 1000 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    } catch (modelErr: any) {
      lastError = modelErr;
    }
  }

  throw new Error(
    `Gemini structured generation failed: ${
      lastError?.message || String(lastError)
    }`
  );
}
