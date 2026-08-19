import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import Job from "../models/Job";
import JobRequirement from "../models/JobRequirement";
import Candidate from "../models/Candidate";
import Resume from "../models/Resume";
import Application from "../models/Application";
import ScreeningResult from "../models/ScreeningResult";
import ScreeningRequirementResult from "../models/ScreeningRequirementResult";
import { calculateDeterministicMatch } from "../lib/ai/matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";
import { runScreeningPipeline } from "../lib/ai/screening-pipeline";
import mongoose from "mongoose";

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING REQUIREMENT & EVIDENCE INTEGRITY REGRESSION TESTS");
  console.log("=======================================================\n");

  await connectToDatabase();

  const testSuffix = Date.now().toString();
  let testCompany: any = null;
  let testJob: any = null;
  let testCandidate: any = null;
  let testResume: any = null;
  let testApplication: any = null;

  try {
    testCompany = await Company.create({
      name: `Integrity Co ${testSuffix}`,
      slug: `integrity-${testSuffix}`,
      plan: "GROWTH",
    });

    testJob = await Job.create({
      companyId: testCompany._id,
      title: "Senior AI Engineer",
      slug: `ai-eng-${testSuffix}`,
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "FULL_TIME",
      workplaceType: "REMOTE",
      description: "Looking for AI engineer with React, AI API integration, Data Pipeline, and CS degree.",
      status: "PUBLISHED",
    });

    // Create canonical requirements
    const req1 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "AI API integration",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "ai_api_integration",
      weightMultiplier: 1.5,
    });

    const req2 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "Data Pipeline",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "data_pipeline",
      weightMultiplier: 1.5,
    });

    const req3 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "React.js",
      category: "REQUIRED",
      type: "SKILL",
      normalizedKey: "react",
      weightMultiplier: 1.0,
    });

    const req4 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "Bachelor's Degree in CS",
      category: "REQUIRED",
      type: "EDUCATION",
      normalizedKey: "edu_bachelor_cs",
      weightMultiplier: 1.0,
    });

    const req5 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
      normalizedKey: "academic_status_final_year_or_graduate",
      weightMultiplier: 1.0,
    });

    const req6 = await JobRequirement.create({
      jobId: testJob._id,
      companyId: testCompany._id,
      title: "Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
      normalizedKey: "academic_status_graduate",
      weightMultiplier: 1.0,
    });

    const requirements = [req1, req2, req3, req4, req5, req6];

    // TEST 1 to 5: Canonical types preserved by matcher
    console.log("[TEST 1-5] Testing canonical requirement types preservation...");
    const sampleCandidateStudying: CandidateResumeExtraction = {
      candidateName: "Ali Khan",
      email: "ali@example.com",
      phone: "1234567890",
      location: "Lahore",
      summary: "Software developer with React.js and AI API integration experience.",
      skills: ["React.js", "AI API integration", "Python"],
      normalizedSkills: ["react", "ai api integration", "python"],
      experience: [
        {
          jobTitle: "Junior AI Developer",
          company: "TechCorp",
          startDate: "2023",
          endDate: "Present",
          isCurrent: true,
          description: "Integrated OpenAI and Anthropic AI APIs into customer dashboard. Built frontend with React.js.",
          skillsUsed: ["React.js", "AI API integration"],
          durationYears: 1.5,
        },
      ],
      education: [
        {
          institution: "Virtual University of Pakistan",
          degree: "Bachelor of Science in Computer Science",
          fieldOfStudy: "Computer Science",
          graduationYear: "2026",
          isCurrent: true,
          isCompleted: false,
          academicStatus: "ENROLLED",
          academicYearLevel: "2nd Year",
        },
        {
          institution: "Govt College",
          degree: "Intermediate in Pre-Engineering",
          fieldOfStudy: "Pre-Engineering",
          graduationYear: "2024",
          isCurrent: false,
          isCompleted: true,
          academicStatus: "GRADUATED",
          academicYearLevel: "Graduated",
        },
      ],
      projects: [],
      certifications: [],
      languages: ["English", "Urdu"],
      totalExperienceYears: 1.5,
      highestDegree: "INTERMEDIATE",
    };

    const matchResult = calculateDeterministicMatch({
      candidate: sampleCandidateStudying,
      requirements,
      scoringWeights: testJob.scoringWeights,
      screeningPolicy: testJob.screeningPolicy,
    });

    const mReq1 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req1._id.toString());
    const mReq2 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req2._id.toString());
    const mReq3 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req3._id.toString());
    const mReq4 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req4._id.toString());
    const mReq5 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req5._id.toString());
    const mReq6 = matchResult.matchedRequirements.find((r) => r.jobRequirementId === req6._id.toString());

    if (!mReq1 || mReq1.requirementType !== "SKILL") {
      throw new Error(`AI API integration must remain SKILL, got: ${mReq1?.requirementType}`);
    }
    console.log("  ✓ [Test 1] 'AI API integration' remains SKILL.");

    if (!mReq2 || mReq2.requirementType !== "SKILL") {
      throw new Error(`Data Pipeline must remain SKILL, got: ${mReq2?.requirementType}`);
    }
    console.log("  ✓ [Test 2] 'Data Pipeline' remains SKILL.");

    if (!mReq3 || mReq3.requirementType !== "SKILL") {
      throw new Error(`React.js must remain SKILL, got: ${mReq3?.requirementType}`);
    }
    console.log("  ✓ [Test 3] 'React.js' remains SKILL.");

    if (!mReq4 || mReq4.requirementType !== "EDUCATION") {
      throw new Error(`Bachelor's Degree must remain EDUCATION, got: ${mReq4?.requirementType}`);
    }
    console.log("  ✓ [Test 4] 'Bachelor's Degree' remains EDUCATION.");

    if (!mReq5 || mReq5.requirementType !== "ACADEMIC_STATUS" || !mReq6 || mReq6.requirementType !== "ACADEMIC_STATUS") {
      throw new Error(`Graduate / Final Year must remain ACADEMIC_STATUS`);
    }
    console.log("  ✓ [Test 5] Academic Status requirements remain ACADEMIC_STATUS.");

    // TEST 6 & 7: Evidence isolation & cross-contamination check
    console.log("\n[TEST 6-7] Testing evidence isolation between requirements...");
    if (mReq1.evidenceQuote.toLowerCase().includes("bachelor of science")) {
      throw new Error(`Evidence cross-contamination! AI API integration received degree quote: "${mReq1.evidenceQuote}"`);
    }
    if (mReq2.evidenceQuote.toLowerCase().includes("react")) {
      throw new Error(`Evidence cross-contamination! Data Pipeline received React quote: "${mReq2.evidenceQuote}"`);
    }
    console.log(`  ✓ [Test 6] 'AI API integration' evidence: "${mReq1.evidenceQuote}" (no degree quote contamination).`);
    console.log(`  ✓ [Test 7] 'Data Pipeline' evidence: "${mReq2.evidenceQuote}" (no cross-contamination).`);

    // TEST 8: Full pipeline end-to-end requirement ID and database persistence
    console.log("\n[TEST 8] Testing full screening pipeline DB persistence and ID alignment...");
    testCandidate = await Candidate.create({
      companyId: testCompany._id,
      name: "Ali Khan",
      email: `ali-${testSuffix}@example.com`,
      skills: ["React.js", "AI API integration", "Python"],
      totalExperienceYears: 1.5,
      education: sampleCandidateStudying.education,
    });

    testResume = await Resume.create({
      candidateId: testCandidate._id,
      companyId: testCompany._id,
      storageKey: `resumes/ali-resume-${testSuffix}.pdf`,
      originalFilename: "ali-resume.pdf",
      mimeType: "application/pdf",
      size: 1024,
      parsedText:
        "Ali Khan - Software Developer. Experience with React.js and AI API integration. Currently in 2nd year studying BS Computer Science at Virtual University of Pakistan. Completed Intermediate in 2024.",
      status: "PARSED",
    });

    testApplication = await Application.create({
      jobId: testJob._id,
      candidateId: testCandidate._id,
      resumeId: testResume._id,
      companyId: testCompany._id,
      status: "NEW",
      screeningStatus: "PROCESSING",
    });

    await runScreeningPipeline({
      applicationId: testApplication._id.toString(),
      overrideCandidateData: sampleCandidateStudying,
      skipVerificationAi: true, // test pipeline determinism & persistence
    });

    const dbResults = await ScreeningRequirementResult.find({
      candidateId: testCandidate._id,
      jobId: testJob._id,
    });

    if (dbResults.length !== requirements.length) {
      throw new Error(`Expected ${requirements.length} requirement results, found ${dbResults.length}`);
    }

    for (const rDoc of dbResults) {
      const orig = requirements.find((r) => r._id.toString() === rDoc.jobRequirementId.toString());
      if (!orig) {
        throw new Error(`Mismatch! Requirement ID ${rDoc.jobRequirementId} not in original requirements.`);
      }
      if (rDoc.requirementType !== orig.type) {
        throw new Error(`Type mismatch for ${orig.title}: expected ${orig.type}, got ${rDoc.requirementType}`);
      }
      if (rDoc.requirementCategory !== orig.category) {
        throw new Error(`Category mismatch for ${orig.title}: expected ${orig.category}, got ${rDoc.requirementCategory}`);
      }
    }
    console.log("  ✓ [Test 8] All requirement IDs, types, and categories match original MongoDB records 1:1.");

    // TEST 9: "Final year OR Graduate" OR evaluation logic
    console.log("\n[TEST 9-12] Testing Academic Status & Degree Distinction logic...");
    
    // Candidate in Final Year
    const finalYearCandidate: CandidateResumeExtraction = {
      ...sampleCandidateStudying,
      education: [
        {
          institution: "FAST NUCES",
          degree: "BS Computer Science",
          fieldOfStudy: "CS",
          graduationYear: "2025",
          isCurrent: true,
          isCompleted: false,
          academicStatus: "FINAL_YEAR",
          academicYearLevel: "Final Year (4th Year)",
        },
      ],
    };

    const matchFinalYear = calculateDeterministicMatch({
      candidate: finalYearCandidate,
      requirements,
      scoringWeights: testJob.scoringWeights,
    });

    const finalYearReqRes = matchFinalYear.matchedRequirements.find((r) => r.jobRequirementId === req5._id.toString());
    if (!finalYearReqRes || finalYearReqRes.status !== "MATCHED") {
      throw new Error(`Final year student MUST MATCH 'Final year or Graduate'`);
    }
    console.log("  ✓ [Test 9] Final year student successfully MATCHES 'Final year or Graduate'.");

    // Candidate Graduated from BS
    const graduatedCandidate: CandidateResumeExtraction = {
      ...sampleCandidateStudying,
      education: [
        {
          institution: "FAST NUCES",
          degree: "BS Computer Science",
          fieldOfStudy: "CS",
          graduationYear: "2023",
          isCurrent: false,
          isCompleted: true,
          academicStatus: "GRADUATED",
          academicYearLevel: "Graduated",
        },
      ],
    };

    const matchGraduated = calculateDeterministicMatch({
      candidate: graduatedCandidate,
      requirements,
      scoringWeights: testJob.scoringWeights,
    });

    const gradReqRes5 = matchGraduated.matchedRequirements.find((r) => r.jobRequirementId === req5._id.toString());
    const gradReqRes6 = matchGraduated.matchedRequirements.find((r) => r.jobRequirementId === req6._id.toString());
    if (gradReqRes5?.status !== "MATCHED" || gradReqRes6?.status !== "MATCHED") {
      throw new Error(`Completed BS Graduate MUST MATCH both 'Final year or Graduate' and 'Graduate'`);
    }
    console.log("  ✓ [Test 10] Completed BS graduate successfully MATCHES both 'Final year or Graduate' and 'Graduate'.");

    // Candidate with Intermediate completed + BS in 2nd year (NOT a graduate)
    const matchIntermediateStudent = calculateDeterministicMatch({
      candidate: sampleCandidateStudying,
      requirements,
      scoringWeights: testJob.scoringWeights,
    });

    const studentGradRes = matchIntermediateStudent.matchedRequirements.find((r) => r.jobRequirementId === req6._id.toString());
    if (studentGradRes?.status === "MATCHED") {
      throw new Error(`2nd year BS student with Intermediate MUST NOT match 'Graduate' requirement!`);
    }
    console.log("  ✓ [Test 11] Intermediate completion + 2nd year BS student correctly rejects 'Graduate' requirement.");

    const studentFinalOrGradRes = matchIntermediateStudent.matchedRequirements.find((r) => r.jobRequirementId === req5._id.toString());
    if (studentFinalOrGradRes?.status === "MATCHED") {
      throw new Error(`2nd year BS student MUST NOT match 'Final year or Graduate' requirement!`);
    }
    console.log("  ✓ [Test 12] 2nd year BS student correctly does NOT match 'Final year or Graduate'.");

  } finally {
    console.log("\nCleaning up regression test data...");
    if (testCompany) {
      await ScreeningRequirementResult.deleteMany({ companyId: testCompany._id });
      await ScreeningResult.deleteMany({ companyId: testCompany._id });
      await Application.deleteMany({ companyId: testCompany._id });
      await Resume.deleteMany({ companyId: testCompany._id });
      await Candidate.deleteMany({ companyId: testCompany._id });
      await JobRequirement.deleteMany({ companyId: testCompany._id });
      await Job.deleteMany({ companyId: testCompany._id });
      await Company.deleteOne({ _id: testCompany._id });
    }
    console.log("Cleaned up test data.");
  }

  console.log("\n=======================================================");
  console.log("ALL 12 REQUIREMENT & EVIDENCE INTEGRITY TESTS PASSED!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
