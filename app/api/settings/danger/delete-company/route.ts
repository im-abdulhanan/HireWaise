import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwner, forbiddenResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import Job from "@/models/Job";
import JobRequirement from "@/models/JobRequirement";
import Application from "@/models/Application";
import Candidate from "@/models/Candidate";
import Resume from "@/models/Resume";
import ScreeningResult from "@/models/ScreeningResult";
import ScreeningRequirementResult from "@/models/ScreeningRequirementResult";
import GoogleIntegration from "@/models/GoogleIntegration";
import RecruiterNote from "@/models/RecruiterNote";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwner(tenant.role)) {
      return forbiddenResponse("Only the primary company Owner can permanently delete the organization workspace.");
    }

    const body = await req.json().catch(() => ({}));
    const { confirmationName } = body;

    await connectToDatabase();

    const company = await Company.findById(tenant.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found.", success: false }, { status: 404 });
    }

    if (!confirmationName || confirmationName.trim().toLowerCase() !== company.name.trim().toLowerCase()) {
      return NextResponse.json(
        {
          error: `Confirmation mismatch. You must type "${company.name}" exactly to confirm workspace deletion.`,
          success: false,
        },
        { status: 400 }
      );
    }

    const companyId = company._id;

    // Collect job IDs
    const jobs = await Job.find({ companyId }).select("_id").lean();
    const jobIds = jobs.map((j) => j._id);

    // Collect application IDs
    const applications = await Application.find({
      $or: [{ companyId }, { jobId: { $in: jobIds } }],
    }).select("_id").lean();
    const appIds = applications.map((a) => a._id);

    // Cascade delete tenant-isolated data
    await Promise.all([
      JobRequirement.deleteMany({ jobId: { $in: jobIds } }),
      ScreeningResult.deleteMany({ applicationId: { $in: appIds } }),
      ScreeningRequirementResult.deleteMany({ applicationId: { $in: appIds } }),
      RecruiterNote.deleteMany({
        $or: [{ companyId }, { applicationId: { $in: appIds } }],
      }),
      Application.deleteMany({
        $or: [{ companyId }, { jobId: { $in: jobIds } }],
      }),
      Candidate.deleteMany({ companyId }),
      Resume.deleteMany({ companyId }),
      Job.deleteMany({ companyId }),
      GoogleIntegration.deleteMany({ companyId }),
      User.deleteMany({ companyId }),
      Company.findByIdAndDelete(companyId),
    ]);

    return NextResponse.json({
      success: true,
      message: "Company workspace and all associated candidate screening data have been permanently deleted.",
    });
  } catch (error: any) {
    console.error("Delete company error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete company workspace." },
      { status: 500 }
    );
  }
}
