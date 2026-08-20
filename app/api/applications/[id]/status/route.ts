import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Application ID or reference number is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let application = null;

    // Search by ObjectId or referenceNumber
    if (Types.ObjectId.isValid(id)) {
      application = await Application.findById(id);
    }

    if (!application) {
      application = await Application.findOne({ referenceNumber: id });
    }

    // Also search by last 8 chars reference format (e.g. APP-XXXXXXXX)
    if (!application && id.startsWith("APP-")) {
      const partialId = id.replace(/^APP-/, "").toLowerCase();
      application = await Application.findOne({
        _id: { $regex: new RegExp(partialId + "$", "i") },
      });
    }

    if (!application) {
      return NextResponse.json(
        { error: "Application record not found." },
        { status: 404 }
      );
    }

    const isCompleted = application.screeningStatus === "COMPLETED";
    const isFailed = application.screeningStatus === "FAILED";

    const currentStage =
      application.currentStage ||
      (isCompleted ? "COMPLETED" : isFailed ? "FAILED" : "RESUME_UPLOADED");

    // Canonical progress mapping:
    // APPLICATION_SUBMITTED = 10%
    // RESUME_UPLOADED = 20%
    // ANALYZING_RESUME = 40%
    // MATCHING_REQUIREMENTS = 60%
    // VERIFYING_RESULTS = 80%
    // COMPLETED = 100%
    // FAILED = 100%
    let progress = application.stageProgress;
    if (isCompleted || isFailed) {
      progress = 100;
    } else if (typeof progress !== "number" || progress === 0) {
      switch (currentStage) {
        case "APPLICATION_SUBMITTED":
        case "QUEUED":
          progress = 10;
          break;
        case "RESUME_UPLOADED":
        case "RECEIVED":
        case "PARSING_RESUME":
        case "FILE_PROCESSING":
          progress = 20;
          break;
        case "ANALYZING_RESUME":
        case "EXTRACTING_PROFILE":
        case "RESUME_ANALYSIS":
          progress = 40;
          break;
        case "MATCHING_REQUIREMENTS":
        case "REQUIREMENT_MATCHING":
          progress = 60;
          break;
        case "VERIFYING_RESULTS":
        case "VERIFYING_EVIDENCE":
        case "EVIDENCE_VERIFICATION":
          progress = 80;
          break;
        default:
          progress = 20;
      }
    }

    const referenceNumber =
      application.referenceNumber ||
      `APP-${application._id.toString().slice(-8).toUpperCase()}`;

    // Return sanitized status response without exposing internal stack traces
    return NextResponse.json(
      {
        applicationId: application._id.toString(),
        referenceNumber,
        screeningStatus: application.screeningStatus,
        currentStage,
        progress,
        completed: isCompleted,
        failed: isFailed,
        error: isFailed
          ? "We couldn't complete the automated screening. Your application was received successfully. The hiring team can still review it."
          : null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching application screening status:", error);
    return NextResponse.json(
      { error: "Failed to retrieve application status." },
      { status: 500 }
    );
  }
}
