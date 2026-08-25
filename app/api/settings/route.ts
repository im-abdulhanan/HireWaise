import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import GoogleIntegration from "@/models/GoogleIntegration";
import { getCompanyJobUsage } from "@/lib/billing/subscription";
import Application from "@/models/Application";
import ScreeningResult from "@/models/ScreeningResult";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    const [company, currentUser, teamMembers, googleIntegration, billingUsage] =
      await Promise.all([
        Company.findById(tenant.companyId).lean(),
        User.findById(tenant.userId).lean(),
        User.find({ companyId: tenant.companyId })
          .select("-passwordHash")
          .sort({ createdAt: 1 })
          .lean(),
        GoogleIntegration.findOne({ companyId: tenant.companyId })
          .select("-encryptedAccessToken -encryptedRefreshToken")
          .lean(),
        getCompanyJobUsage(tenant.companyId).catch(() => null),
      ]);

    if (!company) {
      return NextResponse.json({ error: "Company not found.", success: false }, { status: 404 });
    }

    // Count candidate screenings for this company
    const applications = await Application.find({ companyId: tenant.companyId }).select("_id").lean();
    const appIds = applications.map((a) => a._id);
    const candidateScreeningsCount = await ScreeningResult.countDocuments({
      applicationId: { $in: appIds },
    });

    const isOwner = tenant.role === "OWNER";
    const isAdmin = tenant.role === "OWNER" || tenant.role === "ADMIN";

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: (company as any)._id.toString(),
          name: company.name,
          slug: company.slug,
          website: company.website || "",
          logoUrl: company.logoUrl || "",
          industry: (company as any).industry || "Technology / Software",
          size: (company as any).size || "11-50",
          country: (company as any).country || "United States",
          city: (company as any).city || "San Francisco",
          description: (company as any).description || "",
          retentionDays: company.settings?.retentionDays || 365,
          allowPublicApplications: company.settings?.allowPublicApplications ?? true,
          autoSyncSheets: company.settings?.autoSyncSheets ?? true,
          screeningDefaults: (company as any).screeningDefaults || {
            humanReviewBelowScore: 75,
            requiredSkillsMustMatch: true,
            minimumExperienceMustMatch: true,
            educationRequired: false,
            scoringWeights: {
              requiredSkillsWeight: 40,
              experienceWeight: 25,
              educationWeight: 15,
              preferredSkillsWeight: 10,
              otherWeight: 10,
            },
          },
          notificationSettings: (company as any).notificationSettings || {
            emailAlerts: {
              applicationReceived: true,
              screeningCompleted: true,
              screeningFailed: true,
              humanReviewRequired: true,
              jobAlerts: true,
              weeklySummary: false,
            },
            inAppAlerts: {
              screeningCompleted: true,
              humanReviewRequired: true,
              systemAlerts: true,
            },
          },
        },
        profile: {
          userId: tenant.userId,
          name: currentUser?.name || tenant.name,
          email: currentUser?.email || tenant.email,
          role: currentUser?.role || tenant.role,
          provider: currentUser?.provider || tenant.provider || "credentials",
          avatarUrl: currentUser?.avatarUrl || currentUser?.image || "",
          lastLoginAt: currentUser?.lastLoginAt || currentUser?.updatedAt,
          createdAt: currentUser?.createdAt,
        },
        team: (teamMembers || []).map((m: any) => ({
          id: m._id.toString(),
          name: m.name,
          email: m.email,
          role: m.role,
          provider: m.provider,
          avatarUrl: m.avatarUrl || m.image || "",
          lastLoginAt: m.lastLoginAt,
          createdAt: m.createdAt,
          isSelf: m._id.toString() === tenant.userId,
        })),
        integrations: {
          googleSheets: {
            connected: Boolean(googleIntegration),
            connectedEmail: googleIntegration?.connectedEmail || null,
            spreadsheetTitle: googleIntegration?.spreadsheetTitle || null,
            spreadsheetUrl: googleIntegration?.spreadsheetUrl || null,
            autoSyncEnabled: googleIntegration?.autoSyncEnabled ?? false,
            syncStatus: googleIntegration?.syncStatus || "IDLE",
            lastSyncedAt: googleIntegration?.lastSyncedAt || null,
          },
          googleOAuth: {
            connected: currentUser?.provider === "google",
          },
          githubOAuth: {
            connected: currentUser?.provider === "github",
          },
          microsoftOAuth: {
            connected: false,
          },
        },
        billing: {
          usage: billingUsage,
          candidateScreeningsCount,
        },
        permissions: {
          isOwner,
          isAdmin,
          canEditCompany: isAdmin,
          canManageTeam: isAdmin,
          canManageBilling: isOwner,
          canDeleteCompany: isOwner,
        },
      },
    });
  } catch (error: any) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings." },
      { status: 500 }
    );
  }
}
