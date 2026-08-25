import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse, isOwnerOrAdmin, forbiddenResponse, isOwner } from "@/lib/security/tenant-guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "RECRUITER", "VIEWER"], {
    errorMap: () => ({ message: "Role must be OWNER, ADMIN, RECRUITER, or VIEWER." }),
  }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can modify team member roles.");
    }

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid role.", success: false },
        { status: 400 }
      );
    }

    const { role: newRole } = parsed.data;

    await connectToDatabase();

    const targetUser = await User.findOne({
      _id: params.id,
      companyId: tenant.companyId,
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Team member not found in this company.", success: false }, { status: 404 });
    }

    // Only OWNER can promote someone to OWNER or demote an OWNER
    if ((newRole === "OWNER" || targetUser.role === "OWNER") && !isOwner(tenant.role)) {
      return forbiddenResponse("Only the primary company Owner can promote or modify Owner privileges.");
    }

    // If demoting an OWNER, ensure at least one other OWNER remains
    if (targetUser.role === "OWNER" && newRole !== "OWNER") {
      const ownerCount = await User.countDocuments({
        companyId: tenant.companyId,
        role: "OWNER",
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining Owner of the organization.", success: false },
          { status: 400 }
        );
      }
    }

    targetUser.role = newRole;
    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `Updated role for ${targetUser.name} to ${newRole}.`,
      data: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error: any) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update team member role." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();

    if (!isOwnerOrAdmin(tenant.role)) {
      return forbiddenResponse("Only company Owners and Admins can remove team members.");
    }

    await connectToDatabase();

    const targetUser = await User.findOne({
      _id: params.id,
      companyId: tenant.companyId,
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Team member not found in this company.", success: false }, { status: 404 });
    }

    // Prevent deleting the last OWNER
    if (targetUser.role === "OWNER") {
      const ownerCount = await User.countDocuments({
        companyId: tenant.companyId,
        role: "OWNER",
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the only remaining Owner of the company.", success: false },
          { status: 400 }
        );
      }
    }

    // Prevent non-owner from deleting an OWNER
    if (targetUser.role === "OWNER" && !isOwner(tenant.role)) {
      return forbiddenResponse("Only the primary company Owner can remove another Owner.");
    }

    await User.findByIdAndDelete(targetUser._id);

    return NextResponse.json({
      success: true,
      message: `Removed ${targetUser.name} (${targetUser.email}) from the company workspace.`,
    });
  } catch (error: any) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove team member." },
      { status: 500 }
    );
  }
}
