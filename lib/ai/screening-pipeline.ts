import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import Candidate from "@/models/Candidate";
import Resume from "@/models/Resume";
import Job from "@/models/Job";
import JobRequirement from "@/models/JobRequirement";
import ScreeningResult from "@/models/ScreeningResult";
import ScreeningRequirementResult from "@/models/ScreeningRequirementResult";
import { parseResumeWithGemini } from "./resume-parser";
import { calculateDeterministicMatch } from "./matcher";
import { verifyEvidenceWithGemini } from "./verifier";
import { extractTextFromDocument } from "@/lib/storage/file-parser";
import { getStorageProvider } from "@/lib/storage";
import { Types } from "mongoose";

export interface ScreeningPipelineOptions {
  applicationId: string;
  skipVerificationAi?: boolean; // Can be used for quick local dev/tests if needed
  overrideCandidateData?: import("./schemas").CandidateResumeExtraction;
}

export interface ScreeningPipelineResult {
  success: boolean;
  applicationId: string;
  screeningResultId?: string;
  overallScore?: number;
  category?: string;
  error?: string;
  telemetry?: any;
}

/**
 * Multi-stage candidate screening pipeline orchestrator.
 * Designed to execute cleanly in Next.js Server Actions or asynchronous background workers.
 * Persists real-time stage updates to MongoDB for deterministic frontend polling.
 */
export async function runScreeningPipeline(
  options: ScreeningPipelineOptions
): Promise<ScreeningPipelineResult> {
  const { applicationId, skipVerificationAi = false, overrideCandidateData } = options;
  const startTime = Date.now();

  console.log(`\n======================================================`);
  console.log(`[SCREENING PIPELINE] PIPELINE START - Application: ${applicationId}`);
  console.log(`======================================================`);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;
  let modelUsed = "gemini-3.6-flash";

  await connectToDatabase();

  const application = await Application.findById(applicationId);
  if (!application) {
    console.error(`[SCREENING PIPELINE] Error: Application ${applicationId} not found.`);
    throw new Error(`Application ${applicationId} not found.`);
  }

  // Initial stage update: RECEIVED
  await Application.findByIdAndUpdate(applicationId, {
    currentStage: "RECEIVED",
    stageProgress: 15,
    screeningStatus: "PROCESSING",
    screeningError: undefined,
  });

  try {
    const [job, resume, requirements] = await Promise.all([
      Job.findById(application.jobId),
      Resume.findById(application.resumeId),
      JobRequirement.find({ jobId: application.jobId }).sort({ order: 1 }),
    ]);

    if (!job) throw new Error(`Job ${application.jobId} not found.`);
    if (!resume) throw new Error(`Resume ${application.resumeId} not found.`);

    // STAGE 1: FILE_PROCESSING (Extract Document Text if not already parsed)
    console.log(`[SCREENING PIPELINE] FILE EXTRACTION START`);
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "FILE_PROCESSING",
      stageProgress: 30,
      screeningStatus: "PROCESSING",
    });

    let rawText = resume.parsedText;
    if (!rawText || rawText.trim().length < 20) {
      const storage = getStorageProvider();
      const fileBuffer = await storage.getFile(resume.storageKey);
      const parsedDoc = await extractTextFromDocument(
        fileBuffer,
        resume.originalFilename,
        resume.mimeType
      );
      rawText = parsedDoc.text;
      resume.parsedText = rawText;
      resume.status = "PARSED";
      await resume.save();
    }
    console.log(
      `[SCREENING PIPELINE] FILE EXTRACTION COMPLETE - Extracted ${rawText?.length || 0} characters`
    );

    if (!rawText || rawText.trim().length < 20) {
      throw new Error("Resume document contains insufficient readable text.");
    }

    // STAGE 2: RESUME_ANALYSIS (Gemini Structured Candidate Extraction)
    console.log(`[SCREENING PIPELINE] GEMINI RESUME ANALYSIS START`);
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "RESUME_ANALYSIS",
      stageProgress: 55,
      screeningStatus: "PROCESSING",
    });

    let candidateData: import("./schemas").CandidateResumeExtraction;
    if (overrideCandidateData) {
      candidateData = overrideCandidateData;
      console.log(`[SCREENING PIPELINE] Using provided candidate extraction data.`);
    } else {
      const extractionResult = await parseResumeWithGemini(rawText);
      candidateData = extractionResult.data;

      totalInputTokens += extractionResult.telemetry.inputTokens;
      totalOutputTokens += extractionResult.telemetry.outputTokens;
      retryCount += extractionResult.telemetry.retryCount;
      modelUsed = extractionResult.telemetry.model;
      console.log(`[SCREENING PIPELINE] GEMINI RESUME ANALYSIS COMPLETE - Model: ${modelUsed}`);
    }

    // Create or update Candidate record
    let candidate = await Candidate.findById(application.candidateId);
    if (!candidate) {
      candidate = new Candidate({
        _id: application.candidateId,
        companyId: application.companyId,
      });
    }

    candidate.name = candidateData.candidateName || candidate.name;
    candidate.email = candidateData.email || candidate.email;
    candidate.phone = candidateData.phone || candidate.phone;
    candidate.location = candidateData.location || candidate.location;
    candidate.summary = candidateData.summary;
    candidate.skills = candidateData.skills;
    candidate.normalizedSkills = candidateData.normalizedSkills;
    candidate.experience = candidateData.experience as any;
    candidate.education = candidateData.education as any;
    candidate.projects = candidateData.projects as any;
    candidate.certifications = candidateData.certifications as any;
    candidate.languages = candidateData.languages;
    candidate.totalExperienceYears = candidateData.totalExperienceYears;
    candidate.highestDegree = candidateData.highestDegree;
    await candidate.save();

    console.log(
      `[SCREENING PIPELINE] CANDIDATE EXTRACTION COMPLETE - Name: ${candidate.name}, Skills: ${candidate.skills.length}, Exp: ${candidate.totalExperienceYears} yrs`
    );

    // Link candidate back to resume if needed
    if (!resume.candidateId) {
      resume.candidateId = candidate._id as Types.ObjectId;
      await resume.save();
    }

    // STAGE 3: REQUIREMENT_MATCHING (Deterministic Evidence-First Rule Matching)
    console.log(`[SCREENING PIPELINE] MATCHING START - Requirements Count: ${requirements.length}`);
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "REQUIREMENT_MATCHING",
      stageProgress: 75,
      screeningStatus: "PROCESSING",
    });

    const deterministicMatch = calculateDeterministicMatch({
      candidate: candidateData,
      rawResumeText: rawText,
      requirements,
      scoringWeights: job.scoringWeights,
      screeningPolicy: job.screeningPolicy,
    });

    console.log(
      `[SCREENING PIPELINE] MATCHING COMPLETE - Score: ${deterministicMatch.overallScore}, Category: ${deterministicMatch.category}`
    );

    let finalEvaluatedRequirements = deterministicMatch.matchedRequirements;
    let finalConfidence = deterministicMatch.confidence;
    let humanReviewRecommended = deterministicMatch.humanReviewRecommended;
    let humanReviewReasons = [...deterministicMatch.humanReviewReasons];

    // STAGE 4: EVIDENCE_VERIFICATION (Gemini Evidence Verification & Consistency Audit)
    if (!skipVerificationAi && requirements.length > 0) {
      console.log(`[SCREENING PIPELINE] VERIFICATION START`);
      await Application.findByIdAndUpdate(applicationId, {
        currentStage: "EVIDENCE_VERIFICATION",
        stageProgress: 90,
        screeningStatus: "PROCESSING",
      });

      try {
        const verifyResult = await verifyEvidenceWithGemini({
          resumeRawText: rawText,
          candidateData,
          evaluatedRequirements: deterministicMatch.matchedRequirements,
        });

        totalInputTokens += verifyResult.telemetry.inputTokens;
        totalOutputTokens += verifyResult.telemetry.outputTokens;
        retryCount += verifyResult.telemetry.retryCount;

        const auditReport = verifyResult.data;

        // Run Evidence Consistency Audit: LLM can never downgrade exact/alias resume matches
        const { auditEvidenceConsistency } = require("./evidence-auditor");
        const auditRes = auditEvidenceConsistency({
          evaluatedRequirements: deterministicMatch.matchedRequirements,
          rawResumeText: rawText,
          geminiVerifications: auditReport.verifiedRequirements,
        });

        finalEvaluatedRequirements = auditRes.requirements;
        finalConfidence = auditRes.overallConfidence;
        if (auditRes.humanReviewRecommended) {
          humanReviewRecommended = true;
          humanReviewReasons.push(...auditRes.humanReviewReasons);
        }
        console.log(`[SCREENING PIPELINE] VERIFICATION & CONSISTENCY AUDIT COMPLETE`);
      } catch (verifyErr: any) {
        console.warn(
          `[SCREENING PIPELINE] Verification step warning (using deterministic evidence):`,
          verifyErr?.message
        );
      }
    } else {
      const { auditEvidenceConsistency } = require("./evidence-auditor");
      const auditRes = auditEvidenceConsistency({
        evaluatedRequirements: deterministicMatch.matchedRequirements,
        rawResumeText: rawText,
      });
      finalEvaluatedRequirements = auditRes.requirements;
    }

    // STAGE 5: Create Immutable Snapshots & AI Telemetry
    const processingDurationMs = Date.now() - startTime;
    const estimatedCostUsd = Number(
      (
        (totalInputTokens / 1_000_000) * 0.075 +
        (totalOutputTokens / 1_000_000) * 0.3
      ).toFixed(6)
    );

    // Delete any existing ScreeningResult for this application (e.g. re-screening)
    await ScreeningResult.deleteMany({ applicationId: application._id });
    await ScreeningRequirementResult.deleteMany({
      candidateId: candidate._id,
      jobId: job._id,
    });

    // STAGE 6: Persist ScreeningResult
    const screeningResult = await ScreeningResult.create({
      applicationId: application._id,
      candidateId: candidate._id,
      jobId: job._id,
      companyId: application.companyId,
      overallScore: deterministicMatch.overallScore,
      category: deterministicMatch.category,
      summary: deterministicMatch.summary,
      confidence: finalConfidence,
      humanReviewRecommended,
      humanReviewReasons: Array.from(new Set(humanReviewReasons)),
      scoreBreakdown: deterministicMatch.scoreBreakdown,
      matchedRequiredSkillsCount: deterministicMatch.matchedRequiredSkillsCount,
      totalRequiredSkillsCount: deterministicMatch.totalRequiredSkillsCount,
      matchedPreferredSkillsCount: deterministicMatch.matchedPreferredSkillsCount,
      totalPreferredSkillsCount: deterministicMatch.totalPreferredSkillsCount,
      detectedExperienceYears: deterministicMatch.detectedExperienceYears,
      requiredExperienceYears: deterministicMatch.requiredExperienceYears,
      screeningVersion: job.currentScreeningVersion || 1,
      jobRequirementsSnapshot: requirements.map((r) =>
        r.toObject ? r.toObject() : r
      ),
      scoringWeightsSnapshot: job.scoringWeights,
      screeningPolicySnapshot: job.screeningPolicy,
      aiUsage: {
        model: modelUsed,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        processingDurationMs,
        retryCount,
        estimatedCostUsd,
      },
      screenedAt: new Date(),
    });

    // Persist Individual Requirement Results with canonical schema assertions
    if (finalEvaluatedRequirements.length > 0) {
      const requirementResultDocs = finalEvaluatedRequirements.map((r) => {
        const originalReq = requirements.find(
          (req) => req._id.toString() === r.jobRequirementId.toString()
        );

        const canonicalType = originalReq?.type || r.requirementType;
        const canonicalCategory = originalReq?.category || r.requirementCategory;
        const canonicalTitle = originalReq?.title || r.requirementTitle;

        return {
          screeningResultId: screeningResult._id,
          jobRequirementId: new Types.ObjectId(r.jobRequirementId),
          companyId: application.companyId,
          candidateId: candidate._id,
          jobId: job._id,
          requirementTitle: canonicalTitle,
          requirementCategory: canonicalCategory,
          requirementType: canonicalType,
          status: r.status,
          evidenceQuote: r.evidenceQuote,
          reasoning: r.reasoning,
          confidence: r.confidence,
          verifiedByAi: true,
          scoreContribution: r.scoreContribution,
        };
      });

      await ScreeningRequirementResult.insertMany(requirementResultDocs);
    }

    console.log(`[SCREENING PIPELINE] SCREENING RESULT SAVED - ResultId: ${screeningResult._id}`);

    // Mark Application as COMPLETED
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "COMPLETED",
      stageProgress: 100,
      screeningStatus: "COMPLETED",
      screeningError: undefined,
    });

    console.log(`[SCREENING PIPELINE] PIPELINE COMPLETE - Status: COMPLETED in ${processingDurationMs}ms\n`);

    return {
      success: true,
      applicationId: application._id.toString(),
      screeningResultId: screeningResult._id.toString(),
      overallScore: screeningResult.overallScore,
      category: screeningResult.category,
      telemetry: screeningResult.aiUsage,
    };
  } catch (error: any) {
    console.error(`[SCREENING PIPELINE] PIPELINE FAILED - Application: ${applicationId}, Error:`, error?.message || error);

    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "FAILED",
      stageProgress: 100,
      screeningStatus: "FAILED",
      screeningError: error?.message || "Screening processing failed.",
    });

    return {
      success: false,
      applicationId: application._id.toString(),
      error: error?.message || "Failed to process screening pipeline.",
    };
  }
}

export default runScreeningPipeline;
