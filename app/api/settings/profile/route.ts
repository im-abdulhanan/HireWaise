import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required.").max(80, "Name too long."),
  avatarUrl: z.string().max(500).optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile data.", success: false },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(tenant.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found.", success: false }, { status: 404 });
    }

    user.name = parsed.data.name.trim();
    if (parsed.data.avatarUrl !== undefined) {
      user.avatarUrl = parsed.data.avatarUrl.trim();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Personal profile updated successfully.",
      data: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        provider: user.provider,
      },
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
