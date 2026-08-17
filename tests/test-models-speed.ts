import { GoogleGenerativeAI } from "@google/generative-ai";

async function testSpeed() {
  process.loadEnvFile(".env");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const modelsToTest = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.6-flash"];
  
  for (const modelName of modelsToTest) {
    const start = Date.now();
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent("Return JSON: {\"test\": true}");
      console.log(`Model ${modelName}: SUCCESS in ${Date.now() - start}ms ->`, res.response.text().trim());
    } catch (err: any) {
      console.log(`Model ${modelName}: FAILED in ${Date.now() - start}ms ->`, err?.message);
    }
  }
}

testSpeed();
