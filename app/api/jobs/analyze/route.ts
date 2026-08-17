import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import { parseJobDescriptionWithGemini } from "@/lib/ai/job-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse("You must be logged in to analyze job descriptions.");
    }

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== "string" || description.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a detailed job description (at least 20 characters)." },
        { status: 400 }
      );
    }

    // Call Gemini AI parser
    const { data, telemetry } = await parseJobDescriptionWithGemini(description);

    return NextResponse.json({
      success: true,
      data,
      telemetry,
    });
  } catch (error: any) {
    console.error("Job analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze job description with AI." },
      { status: 500 }
    );
  }
}
