import { verifyEvidenceWithGemini } from "../lib/ai/verifier";

async function testVerifier() {
  process.loadEnvFile(".env");
  console.log("Testing verifyEvidenceWithGemini directly...");
  
  const resumeRawText = "Alex Mercer\nalex.mercer@gmail.com\nSenior Software Engineer with 7 years of experience in React and Node.js.\nExperience: Tech Corp (2020-Present) - Built React apps and Node.js APIs.\nEducation: BS CS from Columbia (2017).\nSkills: React, Node.js, TypeScript";
  
  const candidateData = {
    candidateName: "Alex Mercer",
    email: "alex.mercer@gmail.com",
    phone: "",
    location: "New York",
    summary: "Senior dev",
    skills: ["React", "Node.js", "TypeScript"],
    normalizedSkills: ["react", "node.js", "typescript"],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: ["English"],
    totalExperienceYears: 7,
    highestDegree: "Bachelor's",
  };

  const evaluatedRequirements = [
    {
      jobRequirementId: "req-1",
      requirementTitle: "React",
      requirementCategory: "REQUIRED" as const,
      requirementType: "SKILL" as const,
      status: "MATCHED" as const,
      evidenceQuote: "Built React apps",
      reasoning: "Candidate knows React",
      confidence: 0.9,
      scoreContribution: 100,
    },
  ];

  const start = Date.now();
  try {
    const res = await verifyEvidenceWithGemini({
      resumeRawText,
      candidateData,
      evaluatedRequirements,
    });
    console.log(`SUCCESS in ${Date.now() - start}ms:`, res.data);
  } catch (err: any) {
    console.error(`FAILED in ${Date.now() - start}ms:`, err);
  }
}

testVerifier();
