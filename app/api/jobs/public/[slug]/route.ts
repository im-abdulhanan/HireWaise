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

    const job = await Job.findOne({
      slug: params.slug.toLowerCase().trim(),
      status: "PUBLISHED",
    }).lean();

    if (!job) {
      return NextResponse.json(
        { error: "Job opening not found or no longer accepting applications." },
        { status: 404 }
      );
    }

    const [company, requirements] = await Promise.all([
      Company.findById(job.companyId).select("name slug logoUrl website").lean(),
      JobRequirement.find({ jobId: job._id })
        .select("title category type minimumValue order")
        .sort({ order: 1 })
        .lean(),
    ]);

    // Sanitized public job view (no internal weights, no internal company notes)
    return NextResponse.json({
      success: true,
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
