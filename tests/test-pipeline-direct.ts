import mongoose from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import Job from "../models/Job";
import Candidate from "../models/Candidate";
import Resume from "../models/Resume";
import Application from "../models/Application";
import ScreeningResult from "../models/ScreeningResult";
import ScreeningRequirementResult from "../models/ScreeningRequirementResult";
import { runScreeningPipeline } from "../lib/ai/screening-pipeline";
import { getStorageProvider } from "../lib/storage";

async function runPipelineTest() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  console.log("\n=== STARTING END-TO-END PIPELINE DIAGNOSTIC VERIFICATION ===");

  // 1. Find a published job
  let job = await Job.findOne({ status: "PUBLISHED" });
  if (!job) {
    job = await Job.findOne({});
  }
  if (!job) {
    throw new Error("No job found in database. Please run seed script first.");
  }
  console.log(`[TEST] Using Job: "${job.title}" (${job._id})`);

  // 2. Sample resume text
  const resumeText = `
    Alex Mercer
    alex.mercer@gmail.com | (555) 987-6543 | New York, NY
    
    Professional Summary:
    Senior Full Stack Software Engineer with 7 years of hands-on experience building mission-critical web applications, high-throughput microservices, and distributed cloud architectures.
    
    Core Competencies & Skills:
    - Programming Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
    - Frameworks & Libraries: React, Next.js, Node.js, Express, NestJS, Tailwind CSS
    - Databases & Storage: PostgreSQL, MongoDB, Redis
    - Cloud & DevOps: Docker, Kubernetes, AWS (ECS, S3, RDS), CI/CD (GitHub Actions)
    
    Professional Experience:
    
    Apex Cloud Solutions — Senior Full Stack Engineer
    Jan 2021 – Present (3+ years)
    - Architected and built Node.js microservices handling 50,000+ requests/minute with 99.99% uptime.
    - Led frontend development in Next.js and React, increasing lighthouse performance scores from 64 to 98.
    - Designed PostgreSQL relational schemas and migrated 2TB of legacy data with zero downtime.
    - Containerized 14 internal microservices using Docker and orchestrated deployments on Kubernetes.
    
    Nexus Digital — Full Stack Developer
    Jun 2017 – Dec 2020 (3.5 years)
    - Built responsive customer portals using React, TypeScript, and Node.js REST APIs.
    - Implemented secure JWT authentication and role-based access control.
    - Automated unit and integration testing pipelines with Jest, achieving 92% code coverage.
    
    Education:
    B.S. in Computer Science | Columbia University, New York (2017)
    
    Certifications:
    AWS Certified Solutions Architect – Associate (2022)
  `;

  // 3. Create or find Candidate
  const candidateEmail = "alex.mercer@gmail.com";
  let candidate = await Candidate.findOne({ email: candidateEmail, companyId: job.companyId });
  if (!candidate) {
    candidate = await Candidate.create({
      companyId: job.companyId,
      name: "Alex Mercer",
      email: candidateEmail,
      phone: "(555) 987-6543",
      location: "New York, NY",
      skills: [],
      normalizedSkills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: ["English"],
      totalExperienceYears: 0,
    });
  }

  // 4. Save Resume
  const storage = getStorageProvider();
  const fileBuffer = Buffer.from(resumeText, "utf-8");
  const uploadResult = await storage.uploadFile(fileBuffer, "Alex_Mercer_Resume.pdf", "application/pdf");

  const resume = await Resume.create({
    companyId: job.companyId,
    candidateId: candidate._id,
    storageKey: uploadResult.key,
    originalFilename: "Alex_Mercer_Resume.pdf",
    mimeType: "application/pdf",
    size: fileBuffer.length,
    parsedText: resumeText,
    status: "PARSED",
  });

  // 5. Create Application in PROCESSING state
  let application = await Application.findOne({
    jobId: job._id,
    candidateId: candidate._id,
  });

  if (application) {
    application.resumeId = resume._id;
    application.screeningStatus = "PROCESSING";
    await application.save();
  } else {
    application = await Application.create({
      companyId: job.companyId,
      jobId: job._id,
      candidateId: candidate._id,
      resumeId: resume._id,
      status: "NEW",
      screeningStatus: "PROCESSING",
      appliedAt: new Date(),
    });
  }

  console.log(`[TEST] Created Application: ${application._id} in PROCESSING state`);

  // 6. Invoke Screening Pipeline
  const pipelineResult = await runScreeningPipeline({
    applicationId: application._id.toString(),
  });

  console.log("\n[TEST] Pipeline Execution Result:", pipelineResult);

  // 7. Verify Database State
  const updatedApp = await Application.findById(application._id);
  const screeningResult = await ScreeningResult.findOne({ applicationId: application._id });
  const requirementResults = await ScreeningRequirementResult.find({ screeningResultId: screeningResult?._id });
  const updatedCandidate = await Candidate.findById(candidate._id);

  console.log("\n======================================================");
  console.log("=== FINAL VERIFICATION RESULTS ===");
  console.log("======================================================");
  console.log("1. Application Status:", updatedApp?.screeningStatus, "(Expected: COMPLETED)");
  console.log("2. Candidate Name:", updatedCandidate?.name);
  console.log("3. Candidate Skills Extracted:", updatedCandidate?.skills);
  console.log("4. Candidate Total Experience:", updatedCandidate?.totalExperienceYears, "years");
  console.log("5. Screening Result Score:", screeningResult?.overallScore, "/ 100");
  console.log("6. Screening Result Category:", screeningResult?.category);
  console.log("7. Required Skills Matched:", `${screeningResult?.matchedRequiredSkillsCount} / ${screeningResult?.totalRequiredSkillsCount}`);
  console.log("8. Verified Requirements Count:", requirementResults.length);
  console.log("9. AI Telemetry:", JSON.stringify(screeningResult?.aiUsage, null, 2));

  if (updatedApp?.screeningStatus === "COMPLETED" && screeningResult && screeningResult.overallScore > 0) {
    console.log("\n SUCCESS: Pipeline executed end-to-end without getting stuck in PROCESSING!");
  } else {
    console.error("\n FAILED: Pipeline did not complete successfully.");
    process.exit(1);
  }

  await mongoose.disconnect();
}

runPipelineTest().catch((err) => {
  console.error("Pipeline test error:", err);
  process.exit(1);
});
