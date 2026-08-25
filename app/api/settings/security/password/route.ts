import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid password request.", success: false },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    await connectToDatabase();

    const user = await User.findById(tenant.userId).select("+passwordHash");
    if (!user) {
      return NextResponse.json({ error: "User not found.", success: false }, { status: 404 });
    }

    if (user.provider !== "credentials" || !user.passwordHash) {
      return NextResponse.json(
        {
          error: `Your account uses ${user.provider || "OAuth"} sign-in. Password changes are only applicable to email/password credentials accounts.`,
          success: false,
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password. Please check and try again.", success: false },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update password." },
      { status: 500 }
    );
  }
}
