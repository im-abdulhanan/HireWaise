import {
  JobRequirementsExtractionSchema,
  CandidateResumeExtractionSchema,
  EvidenceVerificationReportSchema,
} from "../lib/ai/schemas";
import { cleanAndParseJSON } from "../lib/ai/gemini";
import {
  validateDocumentFile,
  normalizeExtractedText,
} from "../lib/storage/file-parser";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runPhase2Tests() {
  console.log("=== Running Phase 2 Verification Tests ===\n");

  // 1. JSON Cleaner
  console.log("[1] Testing JSON Cleaner & Code Fence Stripper");
  const rawWithMarkdown = "```json\n{\n  \"key\": \"value\",\n  \"count\": 42\n}\n```";
  const parsed = cleanAndParseJSON(rawWithMarkdown);
  assert(parsed.key === "value" && parsed.count === 42, "Cleanly parses JSON wrapped in ```json code fences");

  const rawWithBackticks = "```\n{\n  \"status\": true\n}\n```";
  const parsed2 = cleanAndParseJSON(rawWithBackticks);
  assert(parsed2.status === true, "Cleanly parses JSON wrapped in plain ``` code fences");

  // 2. Job Requirement Zod Schema Validation
  console.log("\n[2] Testing Job Requirement Schema Validation");
  const validJobData = {
    jobTitle: "Senior Full Stack Engineer",
    minimumExperienceYears: 4,
    educationRequirements: ["Bachelor's in Computer Science"],
    requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
    preferredSkills: ["Docker", "AWS", "GraphQL"],
    optionalSkills: ["Kubernetes"],
    certifications: ["AWS Certified Developer"],
    customRequirements: ["Available for EST timezone"],
    requirementsList: [
      {
        title: "React",
        category: "REQUIRED",
        type: "SKILL",
        normalizedKey: "skill_react",
      },
      {
        title: "4+ Years Experience",
        category: "REQUIRED",
        type: "EXPERIENCE",
        normalizedKey: "exp_years_4",
        minimumValue: 4,
      },
    ],
  };

  const parsedJob = JobRequirementsExtractionSchema.safeParse(validJobData);
  assert(parsedJob.success === true, "Valid job requirements object passes schema validation");

  // 3. Candidate Resume Zod Schema Validation
  console.log("\n[3] Testing Candidate Resume Schema Validation");
  const validCandidate = {
    candidateName: "Sarah Chen",
    email: "sarah.chen@example.com",
    phone: "+1-555-0199",
    location: "New York, NY",
    summary: "Staff Software Engineer with 6 years experience building distributed web applications.",
    skills: ["React", "TypeScript", "Node.js", "MongoDB", "Tailwind CSS"],
    normalizedSkills: ["react", "typescript", "node.js", "mongodb", "tailwind css"],
    experience: [
      {
        jobTitle: "Senior Frontend Engineer",
        company: "TechCorp Global",
        startDate: "2021-03",
        endDate: "Present",
        isCurrent: true,
        description: "Led migration to Next.js and optimized dashboard performance by 40%.",
        skillsUsed: ["React", "Next.js", "TypeScript"],
        durationYears: 3.5,
      },
      {
        jobTitle: "Full Stack Developer",
        company: "Startup Inc",
        startDate: "2018-06",
        endDate: "2021-02",
        isCurrent: false,
        description: "Built REST APIs with Node.js and MongoDB.",
        skillsUsed: ["Node.js", "MongoDB", "Express"],
        durationYears: 2.7,
      },
    ],
    education: [
      {
        institution: "Columbia University",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        graduationYear: "2018",
      },
    ],
    projects: [
      {
        title: "AI Code Reviewer",
        description: "Open-source tool using LLMs to suggest code refactors.",
        url: "https://github.com/example/ai-reviewer",
        technologies: ["React", "TypeScript", "Python"],
      },
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        year: "2023",
      },
    ],
    languages: ["English", "Mandarin"],
    totalExperienceYears: 6.2,
    highestDegree: "Bachelor's",
  };

  const parsedCandidate = CandidateResumeExtractionSchema.safeParse(validCandidate);
  assert(parsedCandidate.success === true, "Valid candidate resume profile passes schema validation");

  // Edge case: Invalid email
  const invalidCandidate = { ...validCandidate, email: "invalid-email-string" };
  const parsedInvalid = CandidateResumeExtractionSchema.safeParse(invalidCandidate);
  assert(parsedInvalid.success === false, "Invalid email fails schema validation with descriptive error");

  // 4. Evidence Verification Schema
  console.log("\n[4] Testing Evidence Verification Schema");
  const validVerification = {
    verifiedRequirements: [
      {
        requirementTitle: "React",
        status: "MATCHED",
        evidenceQuote: "Led migration to Next.js and optimized dashboard performance",
        reasoning: "Candidate has 3.5 years direct React experience at TechCorp.",
        confidence: 0.95,
        verifiedByAi: true,
      },
      {
        requirementTitle: "Kubernetes",
        status: "NOT_FOUND",
        evidenceQuote: "",
        reasoning: "No mention of Kubernetes or container orchestration found in resume.",
        confidence: 0.9,
        verifiedByAi: true,
      },
    ],
    overallConfidence: 0.92,
    humanReviewRecommended: false,
    humanReviewReasons: [],
    summary: "Candidate is a strong match meeting 4/4 required skills.",
  };

  const parsedVerification = EvidenceVerificationReportSchema.safeParse(validVerification);
  assert(parsedVerification.success === true, "Valid verification report passes schema validation");

  // 5. Document File Validation & Text Normalization
  console.log("\n[5] Testing Document Validation & Text Normalization");
  const pdfHeaderBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
  const pdfCheck = validateDocumentFile(pdfHeaderBuffer, "resume.pdf", "application/pdf");
  assert(pdfCheck.isValid === true && pdfCheck.format === "pdf", "PDF magic bytes correctly identified");

  const docxHeaderBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // PK..
  const docxCheck = validateDocumentFile(docxHeaderBuffer, "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert(docxCheck.isValid === true && docxCheck.format === "docx", "DOCX magic bytes correctly identified");

  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable
  const exeCheck = validateDocumentFile(exeBuffer, "malicious.exe", "application/x-msdownload");
  assert(exeCheck.isValid === false, "Executable file is rejected");

  const dirtyText = "Line 1\r\n\r\n\r\n\r\nLine 2\u00A0with odd\x00spaces\nLine 3";
  const normalized = normalizeExtractedText(dirtyText);
  assert(!normalized.includes("\r") && !normalized.includes("\x00"), "Text normalization removes CR and null bytes");
  assert(!normalized.includes("\n\n\n"), "Excessive blank lines are collapsed to 2 newlines");

  console.log(`\n=========================================`);
  console.log(`Phase 2 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
