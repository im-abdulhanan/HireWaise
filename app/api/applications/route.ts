import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Job from "@/models/Job";
import Candidate from "@/models/Candidate";
import Resume from "@/models/Resume";
import Application from "@/models/Application";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  generateSubmissionFingerprint,
  checkIdempotency,
  recordIdempotency,
} from "@/lib/security/idempotency";
import { validateDocumentFile, extractTextFromDocument } from "@/lib/storage/file-parser";
import { getStorageProvider } from "@/lib/storage";
import { runScreeningPipeline } from "@/lib/ai/screening-pipeline";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting Guard
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous-ip";

    const rateLimit = checkRateLimit(ip, {
      intervalMs: 60 * 1000, // 1 minute window
      maxRequests: 5, // max 5 submissions per minute per IP
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many application submissions from your IP. Please wait a minute before trying again.",
        },
        { status: 429 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const jobIdOrSlug = formData.get("jobId") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = (formData.get("phone") as string) || "";
    const location = (formData.get("location") as string) || "";
    const file = formData.get("resume") as File | null;

    if (!jobIdOrSlug || !name || !email || !file) {
      return NextResponse.json(
        { error: "Name, email, job selection, and resume file are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 3. Find Job by ID or Slug
    let job = null;
    if (Types.ObjectId.isValid(jobIdOrSlug)) {
      job = await Job.findById(jobIdOrSlug);
    }
    if (!job) {
      job = await Job.findOne({ slug: jobIdOrSlug });
    }

    if (!job) {
      return NextResponse.json(
        { error: "The selected job position does not exist or has been removed." },
        { status: 404 }
      );
    }

    const isDeadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < new Date();
    if (job.status !== "PUBLISHED" || isDeadlinePassed) {
      return NextResponse.json(
        { error: "Applications for this position are closed and no longer being accepted." },
        { status: 403 }
      );
    }

    // 4. File Buffer & Validation
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    const fileValidation = validateDocumentFile(fileBuffer, file.name, file.type);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error || "Unsupported file format. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }

    // 5. Idempotency Check (prevent rapid double clicks or network retries)
    const idempotencyKey = generateSubmissionFingerprint(
      job._id.toString(),
      email.trim(),
      file.name,
      file.size
    );

    const cachedResponse = checkIdempotency(idempotencyKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    // 6. Extract Text from File immediately for initial storage
    const parsedDoc = await extractTextFromDocument(fileBuffer, file.name, file.type);

    // 7. Store File via Storage Provider
    const storage = getStorageProvider();
    const uploadResult = await storage.uploadFile(fileBuffer, file.name, file.type);

    // 8. Find or Create Candidate
    let candidate = await Candidate.findOne({
      companyId: job.companyId,
      email: email.toLowerCase().trim(),
    });

    if (!candidate) {
      candidate = await Candidate.create({
        companyId: job.companyId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        location: location.trim(),
        skills: [],
        normalizedSkills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        totalExperienceYears: 0,
      });
    }

    // 9. Store Resume
    const resume = await Resume.create({
      companyId: job.companyId,
      candidateId: candidate._id,
      storageKey: uploadResult.key,
      originalFilename: uploadResult.originalFilename,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      parsedText: parsedDoc.text,
      status: "PARSED",
    });

    // 10. Check if candidate already applied for this job
    let application = await Application.findOne({
      jobId: job._id,
      candidateId: candidate._id,
    });

    const referenceNumber = `APP-${(application?._id || new Types.ObjectId()).toString().slice(-8).toUpperCase()}`;

    if (application) {
      // Re-application or update
      application.resumeId = resume._id as Types.ObjectId;
      application.screeningStatus = "PROCESSING";
      application.currentStage = "RECEIVED";
      application.stageProgress = 15;
      application.referenceNumber = referenceNumber;
      application.idempotencyKey = idempotencyKey;
      application.screeningError = undefined;
      await application.save();
    } else {
      application = await Application.create({
        companyId: job.companyId,
        jobId: job._id,
        candidateId: candidate._id,
        resumeId: resume._id,
        status: "NEW",
        screeningStatus: "PROCESSING",
        currentStage: "RECEIVED",
        stageProgress: 15,
        referenceNumber,
        idempotencyKey,
        appliedAt: new Date(),
      });
    }

    // 11. Trigger Screening Pipeline Asynchronously (non-blocking for instant HTTP response)
    const appIdString = application._id.toString();
    runScreeningPipeline({ applicationId: appIdString }).catch((err) => {
      console.error(`[ASYNC SCREENING] Background pipeline error for application ${appIdString}:`, err);
    });

    const responsePayload = {
      success: true,
      message: "Application received and queued for qualification screening.",
      data: {
        applicationId: appIdString,
        candidateId: candidate._id.toString(),
        jobTitle: job.title,
        referenceNumber: application.referenceNumber || referenceNumber,
        currentStage: "RECEIVED",
        screeningStatus: "PROCESSING",
        progress: 15,
        submittedAt: application.appliedAt,
      },
    };

    recordIdempotency(idempotencyKey, responsePayload);

    // Immediate 201 response with application ID so client can start real-time status polling
    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error("Public application submission error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}
