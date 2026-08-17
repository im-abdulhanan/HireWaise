import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";
import Resume from "@/models/Resume";
import ScreeningResult from "@/models/ScreeningResult";
import ScreeningRequirementResult from "@/models/ScreeningRequirementResult";
import RecruiterNote from "@/models/RecruiterNote";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    // The id parameter could be an Application ID or a Candidate ID
    let application = null;
    if (Types.ObjectId.isValid(params.id)) {
      application = await Application.findById(params.id).lean();
      if (!application) {
        // Try finding by candidateId
        application = await Application.findOne({
          candidateId: params.id,
          companyId: tenant.companyId,
        }).lean();
      }
    }

    if (!application) {
      return NextResponse.json({ error: "Candidate application not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, application.companyId)) {
      return forbiddenResponse();
    }

    const [candidate, job, resume, screeningResult, requirementResults, notes] =
      await Promise.all([
        Candidate.findById(application.candidateId).lean(),
        Job.findById(application.jobId).lean(),
        Resume.findById(application.resumeId).select("-parsedText").lean(),
        ScreeningResult.findOne({ applicationId: application._id }).lean(),
        ScreeningRequirementResult.find({
          candidateId: application.candidateId,
          jobId: application.jobId,
        }).lean(),
        RecruiterNote.find({ applicationId: application._id })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        application: {
          ...application,
          id: application._id.toString(),
        },
        candidate: candidate
          ? {
              ...candidate,
              id: candidate._id.toString(),
            }
          : null,
        job: job
          ? {
              ...job,
              id: job._id.toString(),
            }
          : null,
        resume: resume
          ? {
              ...resume,
              id: resume._id.toString(),
            }
          : null,
        screeningResult: screeningResult
          ? {
              ...screeningResult,
              id: screeningResult._id.toString(),
            }
          : null,
        requirementResults: requirementResults.map((r) => ({
          ...r,
          id: r._id.toString(),
        })),
        notes: notes.map((n) => ({
          ...n,
          id: n._id.toString(),
        })),
      },
    });
  } catch (error: any) {
    console.error("Fetch candidate detail error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidate details." },
      { status: 500 }
    );
  }
}
