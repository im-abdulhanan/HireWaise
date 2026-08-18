import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { generateJobDescriptionWithGemini } from "@/lib/ai/job-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("You must be logged in to generate job descriptions.");
    }

    const body = await req.json();
    const {
      title,
      jobTitle,
      department,
      location,
      workplaceType,
      employmentType,
      requirements = [],
    } = body;

    const finalTitle = (title || jobTitle || "").trim();

    if (!finalTitle) {
      return NextResponse.json(
        { error: "Please enter a Job Title before generating a description." },
        { status: 400 }
      );
    }

    if (!requirements || requirements.length === 0) {
      return NextResponse.json(
        { error: "Please configure at least one Job Requirement before generating a description." },
        { status: 400 }
      );
    }

    const { description, telemetry } = await generateJobDescriptionWithGemini({
      jobTitle: finalTitle,
      department,
      location,
      workplaceType,
      employmentType,
      requirements,
    });

    return NextResponse.json({
      success: true,
      data: {
        description,
      },
      telemetry,
    });
  } catch (error: any) {
    console.error("Generate job description error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate job description with AI." },
      { status: 500 }
    );
  }
}
