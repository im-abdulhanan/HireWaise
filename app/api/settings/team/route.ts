import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwnerOrAdmin, forbiddenResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

const inviteMemberSchema = z.object({
  name: z.string().min(1, "Name is required.").max(80),
  email: z.string().email("Please provide a valid email address.").toLowerCase().trim(),
  role: z.enum(["ADMIN", "RECRUITER", "VIEWER"], {
    errorMap: () => ({ message: "Role must be ADMIN, RECRUITER, or VIEWER." }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can invite team members.");
    }

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid team member details.", success: false },
        { status: 400 }
      );
    }

    const { name, email, role } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.companyId.toString() !== tenant.companyId) {
        return NextResponse.json(
          { error: "A user with this email is already registered with another organization.", success: false },
          { status: 400 }
        );
      }
      // If already in company, update role
      existingUser.role = role;
      existingUser.name = name;
      await existingUser.save();

      return NextResponse.json({
        success: true,
        message: `Updated ${name}'s role to ${role}.`,
        data: {
          id: existingUser._id.toString(),
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    // Create member with placeholder password hash (can sign in with OAuth or reset password)
    const tempPassword = `Invite#${Math.random().toString(36).slice(2, 10)}!`;
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      companyId: new Types.ObjectId(tenant.companyId),
      role,
      provider: "credentials",
    });

    return NextResponse.json({
      success: true,
      message: `Team member ${name} (${email}) has been added to your workspace.`,
      data: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add team member." },
      { status: 500 }
    );
  }
}
