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
 */
export async function runScreeningPipeline(
  options: ScreeningPipelineOptions
): Promise<ScreeningPipelineResult> {
  const { applicationId, skipVerificationAi = false } = options;
  const startTime = Date.now();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;
  let modelUsed = "gemini-1.5-flash";

  await connectToDatabase();

  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error(`Application ${applicationId} not found.`);
  }

  // Update status to PROCESSING
  application.screeningStatus = "PROCESSING";
  await application.save();

  try {
    const [job, resume, requirements] = await Promise.all([
      Job.findById(application.jobId),
      Resume.findById(application.resumeId),
      JobRequirement.find({ jobId: application.jobId }).sort({ order: 1 }),
    ]);

    if (!job) throw new Error(`Job ${application.jobId} not found.`);
    if (!resume) throw new Error(`Resume ${application.resumeId} not found.`);

    // STAGE 1: Extract Document Text if not already parsed
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

    // STAGE 2: Gemini Structured Candidate Extraction
    const extractionResult = await parseResumeWithGemini(rawText);
    const candidateData = extractionResult.data;

    totalInputTokens += extractionResult.telemetry.inputTokens;
    totalOutputTokens += extractionResult.telemetry.outputTokens;
    retryCount += extractionResult.telemetry.retryCount;
    modelUsed = extractionResult.telemetry.model;

    // Create or update Candidate record
    let candidate = await Candidate.findById(application.candidateId);
    if (!candidate) {
      candidate = new Candidate({
        _id: application.candidateId,
        companyId: application.companyId,
      });
    }

    candidate.name = candidateData.candidateName;
    candidate.email = candidateData.email;
    candidate.phone = candidateData.phone;
    candidate.location = candidateData.location;
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

    // Link candidate back to resume if needed
    if (!resume.candidateId) {
      resume.candidateId = candidate._id as Types.ObjectId;
      await resume.save();
    }

    // STAGE 3: Deterministic Rule Matching
    const deterministicMatch = calculateDeterministicMatch({
      candidate: candidateData,
      requirements,
      scoringWeights: job.scoringWeights,
      screeningPolicy: job.screeningPolicy,
    });

    let finalEvaluatedRequirements = deterministicMatch.matchedRequirements;
    let finalConfidence = deterministicMatch.confidence;
    let humanReviewRecommended = deterministicMatch.humanReviewRecommended;
    let humanReviewReasons = [...deterministicMatch.humanReviewReasons];

    // STAGE 4: Gemini Evidence Verification (Zero-Hallucination Audit)
    if (!skipVerificationAi && requirements.length > 0) {
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
        finalConfidence = auditReport.overallConfidence;
        if (auditReport.humanReviewRecommended) {
          humanReviewRecommended = true;
          humanReviewReasons.push(...auditReport.humanReviewReasons);
        }

        // Merge AI verified evidence quotes and statuses
        finalEvaluatedRequirements = finalEvaluatedRequirements.map((r) => {
          const auditItem = auditReport.verifiedRequirements.find(
            (v) => v.requirementTitle.toLowerCase() === r.requirementTitle.toLowerCase()
          );

          if (auditItem) {
            return {
              ...r,
              status: auditItem.status,
              evidenceQuote: auditItem.evidenceQuote || r.evidenceQuote,
              reasoning: auditItem.reasoning || r.reasoning,
              confidence: auditItem.confidence,
              verifiedByAi: true,
            };
          }
          return r;
        });
      } catch (verifyErr) {
        console.warn("Evidence verification step warning:", verifyErr);
      }
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
    await ScreeningRequirementResult.deleteMany({ candidateId: candidate._id, jobId: job._id });

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
      jobRequirementsSnapshot: requirements.map((r) => r.toObject ? r.toObject() : r),
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

    // Persist Individual Requirement Results
    if (finalEvaluatedRequirements.length > 0) {
      const requirementResultDocs = finalEvaluatedRequirements.map((r) => ({
        screeningResultId: screeningResult._id,
        jobRequirementId: new Types.ObjectId(r.jobRequirementId),
        companyId: application.companyId,
        candidateId: candidate._id,
        jobId: job._id,
        requirementTitle: r.requirementTitle,
        requirementCategory: r.requirementCategory,
        requirementType: r.requirementType,
        status: r.status,
        evidenceQuote: r.evidenceQuote,
        reasoning: r.reasoning,
        confidence: r.confidence,
        verifiedByAi: true,
        scoreContribution: r.scoreContribution,
      }));

      await ScreeningRequirementResult.insertMany(requirementResultDocs);
    }

    // Mark Application as COMPLETED
    application.screeningStatus = "COMPLETED";
    application.screeningError = undefined;
    await application.save();

    return {
      success: true,
      applicationId: application._id.toString(),
      screeningResultId: screeningResult._id.toString(),
      overallScore: screeningResult.overallScore,
      category: screeningResult.category,
      telemetry: screeningResult.aiUsage,
    };
  } catch (error: any) {
    console.error("Screening pipeline execution failed:", error);

    application.screeningStatus = "FAILED";
    application.screeningError = error.message || "Screening processing failed.";
    await application.save();

    return {
      success: false,
      applicationId: application._id.toString(),
      error: error.message || "Failed to process screening pipeline.",
    };
  }
}
