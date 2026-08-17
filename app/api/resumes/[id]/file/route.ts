import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Resume from "@/models/Resume";
import { getStorageProvider } from "@/lib/storage";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    await connectToDatabase();

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid resume ID." }, { status: 400 });
    }

    const resume = await Resume.findById(params.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume record not found." }, { status: 404 });
    }

    // Strict Tenant Isolation Guard
    if (!verifyCompanyAccess(tenant.companyId, resume.companyId)) {
      return forbiddenResponse("Access denied. You cannot view resumes belonging to another organization.");
    }

    const storage = getStorageProvider();
    const fileBuffer = await storage.getFile(resume.storageKey);

    const safeFilename = resume.originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": resume.mimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Resume file download error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve resume file." },
      { status: 500 }
    );
  }
}
