import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwnerOrAdmin, forbiddenResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import { z } from "zod";

export const dynamic = "force-dynamic";

const screeningDefaultsSchema = z.object({
  humanReviewBelowScore: z.number().min(0).max(100),
  requiredSkillsMustMatch: z.boolean(),
  minimumExperienceMustMatch: z.boolean(),
  educationRequired: z.boolean(),
  scoringWeights: z.object({
    requiredSkillsWeight: z.number().min(0).max(100),
    experienceWeight: z.number().min(0).max(100),
    educationWeight: z.number().min(0).max(100),
    preferredSkillsWeight: z.number().min(0).max(100),
    otherWeight: z.number().min(0).max(100),
  }),
});

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can modify default screening preferences.");
    }

    const body = await req.json();
    const parsed = screeningDefaultsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid screening preferences.", success: false },
        { status: 400 }
      );
    }

    // Verify weights total 100
    const w = parsed.data.scoringWeights;
    const total =
      w.requiredSkillsWeight +
      w.experienceWeight +
      educationWeight(w.educationWeight) +
      w.preferredSkillsWeight +
      w.otherWeight;

    function educationWeight(val: number) {
      return val;
    }

    if (total !== 100) {
      return NextResponse.json(
        { error: `Scoring weights must sum to exactly 100% (currently ${total}%).`, success: false },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const company = await Company.findById(tenant.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found.", success: false }, { status: 404 });
    }

    (company as any).screeningDefaults = parsed.data;
    await company.save();

    return NextResponse.json({
      success: true,
      message: "Default screening preferences saved successfully. These defaults will apply to newly created jobs.",
      data: (company as any).screeningDefaults,
    });
  } catch (error: any) {
    console.error("Update screening defaults error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update screening defaults." },
      { status: 500 }
    );
  }
}
