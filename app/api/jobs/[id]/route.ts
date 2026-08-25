import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Job from "@/models/Job";
import JobRequirement from "@/models/JobRequirement";
import Application from "@/models/Application";
import ScreeningResult from "@/models/ScreeningResult";
import { slugify } from "@/lib/utils";
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

    const job = await Job.findById(params.id).lean();
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, job.companyId)) {
      return forbiddenResponse();
    }

    const requirements = await JobRequirement.find({ jobId: job._id })
      .sort({ order: 1 })
      .lean();

    const applicationsCount = await Application.countDocuments({ jobId: job._id });

    return NextResponse.json({
      success: true,
      data: {
        ...job,
        id: job._id.toString(),
        requirements: requirements.map((r) => ({
          ...r,
          id: r._id.toString(),
        })),
        applicationsCount,
      },
    });
  } catch (error: any) {
    console.error("Fetch job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch job details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    const job = await Job.findById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, job.companyId)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const {
      title,
      department,
      location,
      workplaceType,
      employmentType,
      salaryMin,
      salaryMax,
      salaryCurrency,
      description,
      status,
      applicationDeadline,
      screeningPolicy,
      scoringWeights,
      requirements,
    } = body;

    let rulesChanged = false;

    if (title !== undefined) job.title = title.trim();
    if (department !== undefined) job.department = department?.trim();
    if (location !== undefined) job.location = location?.trim();
    if (workplaceType !== undefined) job.workplaceType = workplaceType;
    if (salaryMin !== undefined) {
      job.salaryMin = salaryMin !== null && salaryMin !== "" ? Number(salaryMin) : undefined;
    }
    if (salaryMax !== undefined) {
      job.salaryMax = salaryMax !== null && salaryMax !== "" ? Number(salaryMax) : undefined;
    }
    if (job.salaryMin !== undefined && job.salaryMin < 0) {
      return NextResponse.json(
        { error: "Minimum salary must be a positive number.", success: false },
        { status: 400 }
      );
    }
    if (job.salaryMax !== undefined && job.salaryMax < 0) {
      return NextResponse.json(
        { error: "Maximum salary must be a positive number.", success: false },
        { status: 400 }
      );
    }
    if (
      job.salaryMin !== undefined &&
      job.salaryMax !== undefined &&
      job.salaryMin > job.salaryMax
    ) {
      return NextResponse.json(
        { error: "Minimum salary cannot exceed maximum salary.", success: false },
        { status: 400 }
      );
    }
    if (salaryCurrency !== undefined) {
      job.salaryCurrency = (salaryCurrency || "USD").toString().trim().toUpperCase();
    }
    if (description !== undefined) job.description = description;
    if (status !== undefined) job.status = status;
    if (applicationDeadline !== undefined) {
      job.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : undefined;
    }

    if (screeningPolicy !== undefined) {
      job.screeningPolicy = screeningPolicy;
      rulesChanged = true;
    }

    if (scoringWeights !== undefined) {
      job.scoringWeights = scoringWeights;
      rulesChanged = true;
    }

    if (Array.isArray(requirements)) {
      rulesChanged = true;
      // Replace existing requirements with updated list
      await JobRequirement.deleteMany({ jobId: job._id });

      if (requirements.length > 0) {
        const requirementDocs = requirements.map((reqItem: any, index: number) => ({
          jobId: job._id,
          companyId: job.companyId,
          category: reqItem.category || "REQUIRED",
          type: reqItem.type || "SKILL",
          title: reqItem.title.trim(),
          description: reqItem.description?.trim(),
          normalizedKey: slugify(reqItem.normalizedKey || reqItem.title),
          minimumValue: reqItem.minimumValue ? Number(reqItem.minimumValue) : undefined,
          weightMultiplier: reqItem.weightMultiplier || 1,
          order: index,
        }));

        await JobRequirement.insertMany(requirementDocs);
      }
    }

    // Increment screening version if rules or requirements changed
    if (rulesChanged) {
      job.currentScreeningVersion = (job.currentScreeningVersion || 1) + 1;
    }

    await job.save();

    return NextResponse.json({
      success: true,
      message: "Job updated successfully.",
      data: {
        id: job._id.toString(),
        slug: job.slug,
        title: job.title,
        currentScreeningVersion: job.currentScreeningVersion,
      },
    });
  } catch (error: any) {
    console.error("Update job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update job." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    const job = await Job.findById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, job.companyId)) {
      return forbiddenResponse();
    }

    const hardDelete = req.nextUrl.searchParams.get("hardDelete") === "true" || req.nextUrl.searchParams.get("permanent") === "true";

    if (hardDelete) {
      await Promise.all([
        Job.findByIdAndDelete(params.id),
        JobRequirement.deleteMany({ jobId: params.id }),
        Application.deleteMany({ jobId: params.id }),
        ScreeningResult.deleteMany({ jobId: params.id }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Job deleted permanently.",
      });
    }

    job.status = "ARCHIVED";
    await job.save();

    return NextResponse.json({
      success: true,
      message: "Job archived successfully.",
    });
  } catch (error: any) {
    console.error("Delete job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete job." },
      { status: 500 }
    );
  }
}
