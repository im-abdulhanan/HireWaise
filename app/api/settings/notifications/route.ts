import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import { z } from "zod";

export const dynamic = "force-dynamic";

const notificationsSchema = z.object({
  emailAlerts: z.object({
    applicationReceived: z.boolean(),
    screeningCompleted: z.boolean(),
    screeningFailed: z.boolean(),
    humanReviewRequired: z.boolean(),
    jobAlerts: z.boolean(),
    weeklySummary: z.boolean(),
  }),
  inAppAlerts: z.object({
    screeningCompleted: z.boolean(),
    humanReviewRequired: z.boolean(),
    systemAlerts: z.boolean(),
  }),
});

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const parsed = notificationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid notification preferences.", success: false },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const company = await Company.findById(tenant.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found.", success: false }, { status: 404 });
    }

    (company as any).notificationSettings = parsed.data;
    await company.save();

    return NextResponse.json({
      success: true,
      message: "Notification preferences saved successfully.",
      data: (company as any).notificationSettings,
    });
  } catch (error: any) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification settings." },
      { status: 500 }
    );
  }
}
