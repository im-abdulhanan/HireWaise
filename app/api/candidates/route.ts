import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";
import ScreeningResult from "@/models/ScreeningResult";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const jobId = searchParams.get("jobId");
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const query: any = { companyId: tenant.companyId };
    if (jobId) query.jobId = jobId;
    if (status && status !== "ALL") query.status = status;

    const applications = await Application.find(query)
      .sort({ appliedAt: -1 })
      .limit(limit)
      .lean();

    const candidateIds = applications.map((a) => a.candidateId);
    const jobIds = applications.map((a) => a.jobId);
    const appIds = applications.map((a) => a._id);

    const [candidates, jobs, screeningResults] = await Promise.all([
      Candidate.find({ _id: { $in: candidateIds } }).lean(),
      Job.find({ _id: { $in: jobIds } }).lean(),
      ScreeningResult.find({ applicationId: { $in: appIds } }).lean(),
    ]);

    const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]));
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));
    const screeningMap = new Map(screeningResults.map((s) => [s.applicationId.toString(), s]));

    let results = applications.map((app) => {
      const candidate = candidateMap.get(app.candidateId.toString());
      const job = jobMap.get(app.jobId.toString());
      const screeningResult = screeningMap.get(app._id.toString());

      return {
        id: app._id.toString(),
        applicationId: app._id.toString(),
        candidateId: app.candidateId.toString(),
        jobId: app.jobId.toString(),
        name: candidate?.name || "Candidate",
        email: candidate?.email || "",
        status: app.status,
        screeningStatus: app.screeningStatus,
        appliedAt: app.appliedAt,
        candidate,
        job: job ? { id: job._id.toString(), title: job.title, slug: job.slug } : null,
        screeningResult: screeningResult
          ? {
              id: screeningResult._id.toString(),
              overallScore: screeningResult.overallScore,
              category: screeningResult.category,
              summary: screeningResult.summary,
              confidence: screeningResult.confidence,
              matchedRequiredSkillsCount: screeningResult.matchedRequiredSkillsCount,
              totalRequiredSkillsCount: screeningResult.totalRequiredSkillsCount,
              detectedExperienceYears: screeningResult.detectedExperienceYears,
              requiredExperienceYears: screeningResult.requiredExperienceYears,
            }
          : null,
      };
    });

    if (category && category !== "ALL") {
      results = results.filter((r) => r.screeningResult?.category === category);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Fetch candidates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidates." },
      { status: 500 }
    );
  }
}
