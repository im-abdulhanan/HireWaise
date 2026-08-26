import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Job from "@/models/Job";
import JobRequirement from "@/models/JobRequirement";
import Application from "@/models/Application";
import ScreeningResult from "@/models/ScreeningResult";
import { Types } from "mongoose";
import { slugify } from "@/lib/utils";
import {
  consumeJobQuotaAtomic,
  releaseJobQuotaAtomic,
} from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    const jobs = await Job.find({ companyId: tenant.companyId })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch stats for each job
    const jobIds = jobs.map((j) => j._id);

    const applications = await Application.find({ jobId: { $in: jobIds } }).lean();
    const appIds = applications.map((a) => a._id);
    const screeningResults = await ScreeningResult.find({ applicationId: { $in: appIds } }).lean();

    const jobsWithStats = jobs.map((job) => {
      const jobApps = applications.filter(
        (a) => a.jobId.toString() === job._id.toString()
      );
      const jobAppIds = new Set(jobApps.map((a) => a._id.toString()));
      const jobScreenings = screeningResults.filter((s) =>
        jobAppIds.has(s.applicationId.toString())
      );

      const strongMatches = jobScreenings.filter(
        (s) => s.category === "STRONG_MATCH"
      ).length;
      const possibleMatches = jobScreenings.filter(
        (s) => s.category === "POSSIBLE_MATCH"
      ).length;

      return {
        ...job,
        id: job._id.toString(),
        totalApplications: jobApps.length,
        strongMatchesCount: strongMatches,
        possibleMatchesCount: possibleMatches,
      };
    });

    return NextResponse.json({ success: true, data: jobsWithStats });
  } catch (error: any) {
    console.error("Fetch jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const {
      title,
      department,
      location,
      workplaceType = "REMOTE",
      employmentType = "FULL_TIME",
      salaryMin,
      salaryMax,
      salaryCurrency = "USD",
      description,
      status = "PUBLISHED",
      applicationDeadline,
      screeningPolicy,
      scoringWeights,
      requirements = [],
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Job title and description are required." },
        { status: 400 }
      );
    }

    const minNum = salaryMin !== undefined && salaryMin !== null && salaryMin !== "" ? Number(salaryMin) : undefined;
    const maxNum = salaryMax !== undefined && salaryMax !== null && salaryMax !== "" ? Number(salaryMax) : undefined;

    if (minNum !== undefined && minNum < 0) {
      return NextResponse.json(
        { error: "Minimum salary must be a positive number." },
        { status: 400 }
      );
    }
    if (maxNum !== undefined && maxNum < 0) {
      return NextResponse.json(
        { error: "Maximum salary must be a positive number." },
        { status: 400 }
      );
    }
    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
      return NextResponse.json(
        { error: "Minimum salary cannot exceed maximum salary." },
        { status: 400 }
      );
    }

    const cleanCurrency = (salaryCurrency || "USD").toString().trim().toUpperCase();

    await connectToDatabase();

    // Server-side atomic subscription & monthly job limit enforcement
    const quotaReservation = await consumeJobQuotaAtomic(tenant.companyId);
    if (!quotaReservation.allowed) {
      return NextResponse.json(
        {
          error: quotaReservation.reason,
          code: "PLAN_LIMIT_REACHED",
          usage: {
            plan: quotaReservation.usage.plan,
            jobsUsed: quotaReservation.usage.jobsUsed,
            jobsLimit: quotaReservation.usage.jobsLimit,
            jobsRemaining: quotaReservation.usage.jobsRemaining,
            currentPeriodEnd: quotaReservation.usage.currentPeriodEnd,
          },
        },
        { status: 403 }
      );
    }

    // Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = "job";
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create Job
    const job = await Job.create({
      companyId: new Types.ObjectId(tenant.companyId),
      title: title.trim(),
      slug,
      department: department?.trim(),
      location: location?.trim(),
      workplaceType,
      employmentType,
      salaryMin: minNum,
      salaryMax: maxNum,
      salaryCurrency: cleanCurrency,
      description,
      status,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
      screeningPolicy: screeningPolicy || {
        requiredSkillsMustMatch: true,
        minimumExperienceMustMatch: true,
        educationRequired: false,
        humanReviewBelowScore: 75,
      },
      scoringWeights: scoringWeights || {
        requiredSkillsWeight: 40,
        experienceWeight: 25,
        educationWeight: 15,
        preferredSkillsWeight: 10,
        otherWeight: 10,
      },
      currentScreeningVersion: 1,
    });

    // Create Requirements
    if (Array.isArray(requirements) && requirements.length > 0) {
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

    return NextResponse.json(
      {
        success: true,
        message: "Job created successfully.",
        data: {
          id: job._id.toString(),
          slug: job.slug,
          title: job.title,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create job." },
      { status: 500 }
    );
  }
}
