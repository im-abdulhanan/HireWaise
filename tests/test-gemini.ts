import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseResumeWithGemini } from "../lib/ai/resume-parser";
import { generateStructuredJSON } from "../lib/ai/gemini";
import { z } from "zod";

async function main() {
  process.loadEnvFile(".env");
  const key = process.env.GEMINI_API_KEY;
  console.log("GEMINI_API_KEY length:", key?.length);

  console.log("\n[1] Testing direct Gemini 3.6 Flash call...");
  const genAI = new GoogleGenerativeAI(key!);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
  const result = await model.generateContent("Return JSON: {\"status\": \"working\"}");
  console.log("Direct Result:", result.response.text());

  console.log("\n[2] Testing generateStructuredJSON with Schema on gemini-3.6-flash...");
  const schema = z.object({ status: z.string(), count: z.number() });
  const res = await generateStructuredJSON({
    systemPrompt: "You are a test helper. Output JSON.",
    userPrompt: "Give me status: 'online' and count: 42",
    schema,
    modelName: "gemini-3.6-flash",
  });
  console.log("Structured Result:", res.data, "Model:", res.telemetry.model);

  console.log("\n[3] Testing parseResumeWithGemini with gemini-3.6-flash...");
  const sampleResume = `
    Jane Doe
    jane.doe@example.com | (555) 123-4567 | San Francisco, CA
    
    Professional Summary:
    Senior Software Engineer with 6 years of experience building distributed systems in TypeScript, Node.js, and React.
    
    Experience:
    Tech Corp - Senior Software Engineer (2021 - Present)
    - Architected scalable Node.js microservices serving 10M daily requests.
    - Led frontend redesign with Next.js and Tailwind CSS.
    
    Startup IO - Full Stack Developer (2018 - 2021)
    - Developed REST APIs and integrated PostgreSQL database.
    
    Education:
    B.S. in Computer Science, UC Berkeley (2018)
    
    Skills:
    TypeScript, JavaScript, Node.js, React, Next.js, PostgreSQL, Docker, AWS
  `;

  const resumeParsed = await parseResumeWithGemini(sampleResume);
  console.log("Resume Parsed Candidate Name:", resumeParsed.data.candidateName);
  console.log("Skills:", resumeParsed.data.skills);
  console.log("Total Exp Years:", resumeParsed.data.totalExperienceYears);
}

main().catch(console.error);
