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
      (isCompleted ? "COMPLETED" : isFailed ? "FAILED" : "RECEIVED");

    let progress = application.stageProgress;
    if (typeof progress !== "number") {
      switch (currentStage) {
        case "RECEIVED":
          progress = 15;
          break;
        case "FILE_PROCESSING":
          progress = 30;
          break;
        case "RESUME_ANALYSIS":
          progress = 55;
          break;
        case "REQUIREMENT_MATCHING":
          progress = 75;
          break;
        case "EVIDENCE_VERIFICATION":
          progress = 90;
          break;
        case "COMPLETED":
        case "FAILED":
          progress = 100;
          break;
        default:
          progress = 15;
      }
    }

    const referenceNumber =
      application.referenceNumber ||
      `APP-${application._id.toString().slice(-8).toUpperCase()}`;

    // Return sanitized status response without exposing internal Gemini/DB error traces
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
