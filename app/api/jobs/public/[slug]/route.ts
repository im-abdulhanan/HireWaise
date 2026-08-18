import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Job from "@/models/Job";
import Company from "@/models/Company";
import JobRequirement from "@/models/JobRequirement";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectToDatabase();

    const slug = (params.slug || "").toLowerCase().trim();

    // 1. Check if job exists in DB (even if draft or archived or past deadline)
    const job = await Job.findOne({ slug }).lean();

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          notFound: true,
          error: "404 • Position Not Found",
          message: "This job opening does not exist or has been permanently removed by the company.",
        },
        { status: 404 }
      );
    }

    // 2. Evaluate if job timeline has expired or if job is archived/closed
    const now = new Date();
    const isDeadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < now;
    const isArchived = job.status === "ARCHIVED";
    const isDraft = job.status === "DRAFT";
    const isClosed = isArchived || isDraft || Boolean(isDeadlinePassed);

    const closedReason = isArchived
      ? "ARCHIVED"
      : isDeadlinePassed
      ? "DEADLINE_PASSED"
      : isDraft
      ? "DRAFT"
      : "CLOSED";

    const [company, requirements] = await Promise.all([
      Company.findById(job.companyId).select("name slug logoUrl website").lean(),
      JobRequirement.find({ jobId: job._id })
        .select("title category type minimumValue order")
        .sort({ order: 1 })
        .lean(),
    ]);

    // Sanitized public job view
    return NextResponse.json({
      success: true,
      notFound: false,
      isClosed,
      closedReason,
      data: {
        id: job._id.toString(),
        slug: job.slug,
        title: job.title,
        department: job.department,
        location: job.location,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        description: job.description,
        status: job.status,
        applicationDeadline: job.applicationDeadline,
        isClosed,
        closedReason,
        createdAt: job.createdAt,
        company: company
          ? {
              name: company.name,
              slug: company.slug,
              logoUrl: company.logoUrl,
              website: company.website,
            }
          : { name: "Company" },
        requirements: requirements.map((r) => ({
          title: r.title,
          category: r.category,
          type: r.type,
          minimumValue: r.minimumValue,
        })),
      },
    });
  } catch (error: any) {
    console.error("Public job fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load job details." },
      { status: 500 }
    );
  }
}
