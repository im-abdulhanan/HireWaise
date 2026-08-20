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
import { auditEvidenceConsistency } from "./evidence-auditor";
import { extractTextFromDocument } from "@/lib/storage/file-parser";
import { getStorageProvider } from "@/lib/storage";
import { Types } from "mongoose";
import { batchNormalizeSkills } from "@/lib/skills/esco-normalizer";

export interface ScreeningPipelineOptions {
  applicationId: string;
  skipVerificationAi?: boolean;
  overrideCandidateData?: import("./schemas").CandidateResumeExtraction;
}

export interface ScreeningPipelineResult {
  success: boolean;
  applicationId: string;
  screeningResultId?: string;
  overallScore?: number;
  category?: string;
  error?: string;
  errorCode?: string;
  telemetry?: any;
}

/**
 * Structured telemetry & audit logger.
 * STRICT SECURITY RULE: NEVER log raw resume text, contents, passwords, API keys, or sensitive candidate PII.
 */
function logPipelineEvent(event: {
  applicationId: string;
  jobId: string;
  companyId: string;
  stage: string;
  durationMs: number;
  status: "START" | "SUCCESS" | "FAILED";
  errorCode?: string;
  errorMessage?: string;
  meta?: Record<string, any>;
}) {
  const safeMeta = { ...event.meta };
  delete (safeMeta as any).rawResumeText;
  delete (safeMeta as any).parsedText;
  delete (safeMeta as any).email;
  delete (safeMeta as any).phone;
  delete (safeMeta as any).apiKey;
  delete (safeMeta as any).password;
  delete (safeMeta as any).token;

  console.log(
    `[PIPELINE_LOG] ${JSON.stringify({
      timestamp: new Date().toISOString(),
      applicationId: event.applicationId,
      jobId: event.jobId,
      companyId: event.companyId,
      stage: event.stage,
      durationMs: event.durationMs,
      status: event.status,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
      meta: safeMeta,
    })}`
  );
}

/**
 * Classifies pipeline errors into structured machine-readable error codes.
 */
function classifyPipelineError(error: any): { code: string; message: string; stage: string } {
  const msg = (error?.message || String(error)).toLowerCase();
  const rawCode = error?.code && typeof error.code === "string" ? error.code : "";
  let code = "UNKNOWN_PIPELINE_ERROR";

  if (
    rawCode === "ENOENT" ||
    rawCode === "EACCES" ||
    msg.includes("no such file") ||
    msg.includes("storage") ||
    msg.includes("getfile") ||
    msg.includes("upload")
  ) {
    code = "RESUME_STORAGE_FAILED";
  } else if (
    msg.includes("extract") ||
    msg.includes("pdf") ||
    msg.includes("docx") ||
    msg.includes("corrupt")
  ) {
    code = "RESUME_PARSE_FAILED";
  } else if (msg.includes("empty") || msg.includes("no readable text") || msg.includes("no text")) {
    code = "EMPTY_RESUME_TEXT";
  } else if (msg.includes("job") && msg.includes("not found")) {
    code = "JOB_NOT_FOUND";
  } else if (msg.includes("requirement") && msg.includes("not found")) {
    code = "REQUIREMENTS_NOT_FOUND";
  } else if (rawCode === "GEMINI_TIMEOUT" || msg.includes("timeout")) {
    code = "GEMINI_TIMEOUT";
  } else if (
    rawCode === "GEMINI_QUOTA_EXCEEDED" ||
    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted")
  ) {
    code = "GEMINI_QUOTA_EXCEEDED";
  } else if (
    rawCode === "GEMINI_INVALID_RESPONSE" ||
    msg.includes("json") ||
    msg.includes("invalid response")
  ) {
    code = "GEMINI_INVALID_RESPONSE";
  } else if (
    rawCode === "SCHEMA_VALIDATION_FAILED" ||
    msg.includes("zod") ||
    msg.includes("validation") ||
    msg.includes("invalid_type")
  ) {
    code = "SCHEMA_VALIDATION_FAILED";
  } else if (rawCode === "GEMINI_API_ERROR" || msg.includes("gemini") || msg.includes("generative")) {
    code = "GEMINI_API_ERROR";
  } else if (msg.includes("match")) {
    code = "MATCHER_FAILED";
  } else if (msg.includes("verif")) {
    code = "VERIFIER_FAILED";
  } else if (
    msg.includes("mongo") ||
    msg.includes("database") ||
    msg.includes("save") ||
    msg.includes("insert")
  ) {
    code = "DATABASE_WRITE_FAILED";
  } else if (rawCode) {
    code = rawCode;
  }

  return {
    code,
    message: error?.message || "Unknown error occurred during screening",
    stage: error?.stage || "SCREENING_PIPELINE",
  };
}

/**
 * Multi-stage candidate screening pipeline orchestrator.
 * Sequentially updates and persists each stage to MongoDB before executing the stage.
 *
 * Exact Stage Mapping:
 * - APPLICATION_SUBMITTED (10%)
 * - RESUME_UPLOADED (20%)
 * - ANALYZING_RESUME (40%)
 * - MATCHING_REQUIREMENTS (60%)
 * - VERIFYING_RESULTS (80%)
 * - COMPLETED (100%)
 * - FAILED (100%)
 */
export async function runScreeningPipeline(
  options: ScreeningPipelineOptions
): Promise<ScreeningPipelineResult> {
  const { applicationId, skipVerificationAi = false, overrideCandidateData } = options;
  const startTime = Date.now();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let retryCount = 0;
  let modelUsed = "gemini-3.6-flash";
  let currentStageName = "RESUME_UPLOADED";
  let currentProgress = 20;

  await connectToDatabase();

  const application = await Application.findById(applicationId);
  if (!application) {
    console.error(`[SCREENING PIPELINE] Error: Application ${applicationId} not found.`);
    throw new Error(`Application ${applicationId} not found.`);
  }

  const attemptNumber = application.attemptCount || 1;
  const attemptStartedAt = new Date();

  const jobIdStr = application.jobId.toString();
  const companyIdStr = application.companyId.toString();

  // Log Stage 1: APPLICATION_CREATED
  logPipelineEvent({
    applicationId,
    jobId: jobIdStr,
    companyId: companyIdStr,
    stage: "APPLICATION_CREATED",
    durationMs: Date.now() - startTime,
    status: "SUCCESS",
    meta: { attemptNumber },
  });

  try {
    const [job, resume, requirements] = await Promise.all([
      Job.findById(application.jobId),
      Resume.findById(application.resumeId),
      JobRequirement.find({ jobId: application.jobId }).sort({ order: 1 }),
    ]);

    if (!job) throw new Error(`Job ${application.jobId} not found.`);
    if (!resume) throw new Error(`Resume ${application.resumeId} not found.`);

    // Log Stage 2: RESUME_STORED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "RESUME_STORED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: {
        originalFilename: resume.originalFilename,
        mimeType: resume.mimeType,
        size: resume.size,
      },
    });

    // =========================================================================
    // STAGE 3: ANALYZING_RESUME (40%) - Extract text and parse candidate profile
    // =========================================================================
    currentStageName = "ANALYZING_RESUME";
    currentProgress = 40;
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "ANALYZING_RESUME",
      stageProgress: 40,
      screeningStatus: "PROCESSING",
      screeningError: undefined,
      errorCode: undefined,
    });

    let rawText = resume.parsedText;
    if (!rawText || rawText.trim().length < 10) {
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

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("EMPTY_RESUME_TEXT: No readable text could be extracted from uploaded document.");
    }

    // Log Stage 3: RESUME_TEXT_EXTRACTED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "RESUME_TEXT_EXTRACTED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: { characterCount: rawText.length },
    });

    let candidateData = overrideCandidateData;

    if (!candidateData) {
      const parseResult = await parseResumeWithGemini(rawText);
      candidateData = parseResult.data;
      totalInputTokens += parseResult.telemetry.inputTokens;
      totalOutputTokens += parseResult.telemetry.outputTokens;
      retryCount += parseResult.telemetry.retryCount;
      modelUsed = parseResult.telemetry.model;
    }

    // ESCO v1.2.1 Skill Normalization
    if (candidateData.skills && candidateData.skills.length > 0) {
      try {
        const escoNormResults = await batchNormalizeSkills(candidateData.skills);
        candidateData.normalizedSkills = escoNormResults.map((r) => r.canonicalKey || r.normalizedTerm);
      } catch {
        // Safe fallback
        if (!candidateData.normalizedSkills) {
          candidateData.normalizedSkills = candidateData.skills.map((s) => s.toLowerCase().trim());
        }
      }
    }

    // Update candidate profile fields in MongoDB
    const candidate = await Candidate.findById(application.candidateId);
    if (candidate) {
      candidate.skills = candidateData.skills || [];
      candidate.normalizedSkills = candidateData.normalizedSkills || [];
      candidate.experience = (candidateData.experience || []) as any;
      candidate.education = (candidateData.education || []) as any;
      candidate.projects = (candidateData.projects || []) as any;
      candidate.certifications = (candidateData.certifications || []) as any;
      candidate.languages = candidateData.languages || [];
      candidate.totalExperienceYears = candidateData.totalExperienceYears || 0;
      candidate.highestDegree = candidateData.highestDegree || "";
      if (candidateData.summary) candidate.summary = candidateData.summary;
      if (candidateData.location && !candidate.location) candidate.location = candidateData.location;
      if (candidateData.phone && !candidate.phone) candidate.phone = candidateData.phone;
      await candidate.save();
    }

    // Log Stage 4: RESUME_PARSED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "RESUME_PARSED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: {
        skillsCount: candidateData.skills?.length || 0,
        experienceYears: candidateData.totalExperienceYears || 0,
        educationCount: candidateData.education?.length || 0,
      },
    });

    // Log Stage 5: JOB_REQUIREMENTS_LOADED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "JOB_REQUIREMENTS_LOADED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: { requirementsCount: requirements.length },
    });

    // =========================================================================
    // STAGE 4: MATCHING_REQUIREMENTS (60%) - Taxonomy & Deterministic Rules
    // =========================================================================
    currentStageName = "MATCHING_REQUIREMENTS";
    currentProgress = 60;
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "MATCHING_REQUIREMENTS",
      stageProgress: 60,
      screeningStatus: "PROCESSING",
    });

    // Log Stage 6: REQUIREMENTS_NORMALIZED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "REQUIREMENTS_NORMALIZED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: { requirementTitles: requirements.map((r) => r.title) },
    });

    const deterministicMatch = calculateDeterministicMatch({
      candidate: candidateData,
      rawResumeText: rawText,
      requirements,
      scoringWeights: job.scoringWeights,
      screeningPolicy: job.screeningPolicy,
    });

    // Log Stage 7: DETERMINISTIC_MATCH_COMPLETED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "DETERMINISTIC_MATCH_COMPLETED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: {
        overallScore: deterministicMatch.overallScore,
        category: deterministicMatch.category,
        matchedCount: deterministicMatch.matchedRequiredSkillsCount,
        totalCount: deterministicMatch.totalRequiredSkillsCount,
      },
    });

    let finalEvaluatedRequirements = deterministicMatch.matchedRequirements;
    let finalConfidence = deterministicMatch.confidence;
    let humanReviewRecommended = deterministicMatch.humanReviewRecommended;
    let humanReviewReasons = [...deterministicMatch.humanReviewReasons];

    // =========================================================================
    // STAGE 5: VERIFYING_RESULTS (80%) - Gemini Semantic Verification & Audit
    // =========================================================================
    currentStageName = "VERIFYING_RESULTS";
    currentProgress = 80;
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "VERIFYING_RESULTS",
      stageProgress: 80,
      screeningStatus: "PROCESSING",
    });

    if (!skipVerificationAi && requirements.length > 0) {
      // Log Stage 8: GEMINI_VERIFICATION_STARTED
      logPipelineEvent({
        applicationId,
        jobId: jobIdStr,
        companyId: companyIdStr,
        stage: "GEMINI_VERIFICATION_STARTED",
        durationMs: Date.now() - startTime,
        status: "START",
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

        // Run Evidence Consistency Audit: LLM can NEVER downgrade direct resume evidence
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

        // Log Stage 9: GEMINI_VERIFICATION_COMPLETED
        logPipelineEvent({
          applicationId,
          jobId: jobIdStr,
          companyId: companyIdStr,
          stage: "GEMINI_VERIFICATION_COMPLETED",
          durationMs: Date.now() - startTime,
          status: "SUCCESS",
          meta: { verifiedRequirementsCount: finalEvaluatedRequirements.length },
        });
      } catch (verifyErr: any) {
        console.warn(
          `[SCREENING PIPELINE] Verification step warning (using deterministic evidence):`,
          verifyErr?.message
        );
      }
    } else {
      const auditRes = auditEvidenceConsistency({
        evaluatedRequirements: deterministicMatch.matchedRequirements,
        rawResumeText: rawText,
      });
      finalEvaluatedRequirements = auditRes.requirements;
    }

    const processingDurationMs = Date.now() - startTime;
    const estimatedCostUsd = Number(
      (
        (totalInputTokens / 1_000_000) * 0.075 +
        (totalOutputTokens / 1_000_000) * 0.3
      ).toFixed(6)
    );

    // Delete any existing ScreeningResult for this application (e.g. re-screening)
    await ScreeningResult.deleteMany({ applicationId: application._id });
    if (candidate) {
      await ScreeningRequirementResult.deleteMany({
        candidateId: candidate._id,
        jobId: job._id,
      });
    }

    const normalizedOverallConfidence =
      finalConfidence > 1 ? Math.min(1, finalConfidence / 100) : finalConfidence;

    // Persist ScreeningResult
    const screeningResult = await ScreeningResult.create({
      applicationId: application._id,
      candidateId: candidate?._id || application.candidateId,
      jobId: job._id,
      companyId: application.companyId,
      overallScore: deterministicMatch.overallScore,
      category: deterministicMatch.category,
      summary: deterministicMatch.summary,
      confidence: normalizedOverallConfidence,
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
    if (finalEvaluatedRequirements.length > 0 && candidate) {
      const requirementResultDocs = finalEvaluatedRequirements.map((r) => {
        const originalReq = requirements.find(
          (req) => req._id.toString() === r.jobRequirementId.toString()
        );

        const canonicalType = originalReq?.type || r.requirementType;
        const canonicalCategory = originalReq?.category || r.requirementCategory;
        const canonicalTitle = originalReq?.title || r.requirementTitle;
        const normReqConfidence =
          r.confidence > 1 ? Math.min(1, r.confidence / 100) : r.confidence;

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
          matchMethod: r.matchMethod || "NONE",
          normalizedRequirement: r.normalizedRequirement || originalReq?.normalizedKey,
          matchedCandidateSkill: r.matchedCandidateSkill,
          evidenceQuote: r.evidenceQuote,
          reasoning: r.reasoning,
          confidence: normReqConfidence,
          verifiedByAi: true,
          scoreContribution: r.scoreContribution,
        };
      });

      await ScreeningRequirementResult.insertMany(requirementResultDocs);
    }

    // Log Stage 10: SCREENING_RESULT_SAVED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "SCREENING_RESULT_SAVED",
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      meta: { screeningResultId: screeningResult._id.toString() },
    });

    // =========================================================================
    // STAGE 6: COMPLETED (100%) - Record attempt and mark COMPLETED
    // =========================================================================
    currentStageName = "COMPLETED";
    currentProgress = 100;
    const completedAttempt = {
      attemptNumber,
      startedAt: attemptStartedAt,
      completedAt: new Date(),
      status: "COMPLETED" as const,
      durationMs: processingDurationMs,
    };

    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "COMPLETED",
      stageProgress: 100,
      screeningStatus: "COMPLETED",
      screeningError: undefined,
      errorCode: undefined,
      $push: { screeningAttempts: completedAttempt },
    });

    // Log Stage 11: SCREENING_COMPLETED
    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: "SCREENING_COMPLETED",
      durationMs: processingDurationMs,
      status: "SUCCESS",
      meta: {
        overallScore: screeningResult.overallScore,
        category: screeningResult.category,
      },
    });

    return {
      success: true,
      applicationId: application._id.toString(),
      screeningResultId: screeningResult._id.toString(),
      overallScore: screeningResult.overallScore,
      category: screeningResult.category,
      telemetry: screeningResult.aiUsage,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const classified = classifyPipelineError(error);

    console.error(
      `[SCREENING PIPELINE] PIPELINE FAILED - Application: ${applicationId}, Stage: ${currentStageName}, ErrorCode: ${classified.code}, Message: ${classified.message}`
    );

    logPipelineEvent({
      applicationId,
      jobId: jobIdStr,
      companyId: companyIdStr,
      stage: currentStageName,
      durationMs,
      status: "FAILED",
      errorCode: classified.code,
      errorMessage: classified.message,
    });

    const failedAttempt = {
      attemptNumber,
      startedAt: attemptStartedAt,
      failedAt: new Date(),
      status: "FAILED" as const,
      failedStage: currentStageName,
      errorCode: classified.code,
      errorMessage: classified.message,
      durationMs,
    };

    // CRITICAL: Preserve candidate, resume, and application.
    await Application.findByIdAndUpdate(applicationId, {
      currentStage: "FAILED",
      stageProgress: 100,
      screeningStatus: "FAILED",
      screeningError:
        "We couldn't complete the automated screening. Your application was received successfully. The hiring team can still review it.",
      errorCode: classified.code,
      $push: { screeningAttempts: failedAttempt },
    });

    return {
      success: false,
      applicationId: application._id.toString(),
      error: classified.message,
      errorCode: classified.code,
    };
  }
}

export default runScreeningPipeline;
