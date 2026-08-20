import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import { runScreeningPipeline } from "@/lib/ai/screening-pipeline";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const { applicationId } = params;
    if (!applicationId || !Types.ObjectId.isValid(applicationId)) {
      return NextResponse.json({ error: "Valid Application ID is required." }, { status: 400 });
    }

    await connectToDatabase();

    const application = await Application.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, application.companyId)) {
      return forbiddenResponse();
    }

    // Reset screening state and increment attempt count
    const nextAttempt = (application.attemptCount || 1) + 1;
    application.attemptCount = nextAttempt;
    application.screeningStatus = "PROCESSING";
    application.currentStage = "QUEUED";
    application.stageProgress = 0;
    application.screeningError = undefined;
    application.errorCode = undefined;
    await application.save();

    // Trigger screening pipeline asynchronously
    const appIdStr = application._id.toString();
    runScreeningPipeline({ applicationId: appIdStr }).catch((err) => {
      console.error(`[RETRY SCREENING] Error executing screening retry for ${appIdStr}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: `Screening retry initiated (Attempt #${nextAttempt}).`,
      data: {
        applicationId: appIdStr,
        attemptCount: nextAttempt,
        screeningStatus: "PROCESSING",
        currentStage: "QUEUED",
      },
    });
  } catch (error: any) {
    console.error("Screening retry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger screening retry." },
      { status: 500 }
    );
  }
}
