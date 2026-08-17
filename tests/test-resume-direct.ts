import { parseResumeWithGemini } from "../lib/ai/resume-parser";

async function testVerbose() {
  process.loadEnvFile(".env");
  console.log("Testing parseResumeWithGemini directly...");
  const sample = "Alex Mercer\nalex.mercer@gmail.com\nSenior Software Engineer with 7 years of experience in React and Node.js.\nExperience: Tech Corp (2020-Present) - Built React apps.\nEducation: BS CS from MIT (2018).\nSkills: React, Node.js, TypeScript";
  
  const start = Date.now();
  try {
    const res = await parseResumeWithGemini(sample);
    console.log(`Parsed in ${Date.now() - start}ms:`, res.data);
  } catch (err: any) {
    console.error(`Failed in ${Date.now() - start}ms:`, err);
  }
}

testVerbose();
