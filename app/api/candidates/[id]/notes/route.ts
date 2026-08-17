import { NextRequest, NextResponse } from "next/server";
import {
  getTenantContext,
  unauthorizedResponse,
  forbiddenResponse,
  verifyCompanyAccess,
} from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import RecruiterNote from "@/models/RecruiterNote";
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

    let application = null;
    if (Types.ObjectId.isValid(params.id)) {
      application = await Application.findById(params.id);
      if (!application) {
        application = await Application.findOne({
          candidateId: params.id,
          companyId: tenant.companyId,
        });
      }
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, application.companyId)) {
      return forbiddenResponse();
    }

    const notes = await RecruiterNote.find({ applicationId: application._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: notes.map((n) => ({
        ...n,
        id: n._id.toString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Note content cannot be empty." }, { status: 400 });
    }

    await connectToDatabase();

    let application = null;
    if (Types.ObjectId.isValid(params.id)) {
      application = await Application.findById(params.id);
      if (!application) {
        application = await Application.findOne({
          candidateId: params.id,
          companyId: tenant.companyId,
        });
      }
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!verifyCompanyAccess(tenant.companyId, application.companyId)) {
      return forbiddenResponse();
    }

    const note = await RecruiterNote.create({
      companyId: new Types.ObjectId(tenant.companyId),
      applicationId: application._id,
      candidateId: application.candidateId,
      userId: new Types.ObjectId(tenant.userId),
      authorName: tenant.name || "Recruiter",
      content: content.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Note added successfully.",
        data: {
          ...note.toObject(),
          id: note._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Add recruiter note error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
