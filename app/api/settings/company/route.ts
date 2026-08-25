import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwnerOrAdmin, forbiddenResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Company from "@/models/Company";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required.").max(100, "Company name too long."),
  website: z.string().max(200).optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  description: z.string().max(1000).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  retentionDays: z.number().min(30).max(3650).optional(),
  allowPublicApplications: z.boolean().optional(),
  autoSyncSheets: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can modify company settings.");
    }

    const body = await req.json();
    const parsed = updateCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid company details.", success: false },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate website URL format if provided
    if (data.website && data.website.trim().length > 0) {
      let formattedUrl = data.website.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      try {
        new URL(formattedUrl);
        data.website = formattedUrl;
      } catch {
        return NextResponse.json(
          { error: "Please enter a valid website URL.", success: false },
          { status: 400 }
        );
      }
    }

    await connectToDatabase();

    const company = await Company.findById(tenant.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found.", success: false }, { status: 404 });
    }

    company.name = data.name.trim();
    if (data.website !== undefined) company.website = data.website.trim();
    if (data.logoUrl !== undefined) company.logoUrl = data.logoUrl.trim();
    if (data.industry !== undefined) (company as any).industry = data.industry.trim();
    if (data.size !== undefined) (company as any).size = data.size.trim();
    if (data.country !== undefined) (company as any).country = data.country.trim();
    if (data.city !== undefined) (company as any).city = data.city.trim();
    if (data.description !== undefined) (company as any).description = data.description.trim();

    if (!company.settings) {
      company.settings = {
        retentionDays: 365,
        allowPublicApplications: true,
        autoSyncSheets: true,
      };
    }

    if (data.retentionDays !== undefined) company.settings.retentionDays = data.retentionDays;
    if (data.allowPublicApplications !== undefined) company.settings.allowPublicApplications = data.allowPublicApplications;
    if (data.autoSyncSheets !== undefined) company.settings.autoSyncSheets = data.autoSyncSheets;

    await company.save();

    return NextResponse.json({
      success: true,
      message: "Company profile updated successfully.",
      data: {
        name: company.name,
        website: company.website,
        logoUrl: company.logoUrl,
        industry: (company as any).industry,
        size: (company as any).size,
        country: (company as any).country,
        city: (company as any).city,
        description: (company as any).description,
        settings: company.settings,
      },
    });
  } catch (error: any) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update company profile." },
      { status: 500 }
    );
  }
}
