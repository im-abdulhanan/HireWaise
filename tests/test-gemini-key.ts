import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing API key prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NONE");

  const genAI = new GoogleGenerativeAI(apiKey || "");

  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-pro",
  ];

  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTesting model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, return the word 'OK'");
      const response = await result.response;
      console.log(`✓ SUCCESS with ${modelName}:`, response.text().trim());
      process.exit(0);
    } catch (err: any) {
      console.log(`✗ FAILED with ${modelName}:`, err.message);
    }
  }

  process.exit(1);
}

testKey();
