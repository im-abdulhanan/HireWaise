import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEWING",
  "REJECTED",
  "HIRED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let application = null;
    if (Types.ObjectId.isValid(params.id)) {
      application = await Application.findById(params.id);
      if (!application) {
        application = await Application.findOne({
          candidateId: params.id,
          companyId: tenant.companyId,
        });
      }
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, application.companyId)) {
      return forbiddenResponse();
    }

    application.status = status;
    await application.save();

    return NextResponse.json({
      success: true,
      message: `Candidate status updated to ${status}.`,
      data: {
        applicationId: application._id.toString(),
        status: application.status,
      },
    });
  } catch (error: any) {
    console.error("Update candidate status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update candidate status." },
      { status: 500 }
    );
  }
}
