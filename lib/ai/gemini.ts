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
 * Calculates estimated cost for Gemini 1.5 Flash.
 * Pricing reference: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens.
 */
function estimateGeminiCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.3;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Robust JSON cleaner to parse responses from Gemini, stripping any accidental markdown wrappers.
 */
export function cleanAndParseJSON(rawText: string): any {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
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
}): Promise<GeminiExecutionResult<T>> {
  const modelName = params.modelName || "gemini-1.5-flash";
  const maxRetries = params.maxRetries ?? 2;
  const temperature = params.temperature ?? 0.1;

  const client = getGeminiClient();
  const startTime = Date.now();
  let retryCount = 0;
  let lastError: any = null;

  const combinedSystemPrompt = `
${PROMPT_INJECTION_SYSTEM_GUARD}

${params.systemPrompt}

CRITICAL: Return ONLY a valid JSON object strictly matching the requested schema. No conversational filler, no extra text, no markdown formatting outside JSON.
`.trim();

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
      const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(params.userPrompt.length / 4);
      const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
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
    } catch (err: any) {
      lastError = err;
      retryCount++;

      // If it's a Zod parsing error or transient rate limit, retry with backoff
      if (attempt < maxRetries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(
    `Gemini structured generation failed after ${maxRetries + 1} attempts: ${
      lastError?.message || String(lastError)
    }`
  );
}
