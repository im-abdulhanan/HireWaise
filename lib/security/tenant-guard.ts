import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export interface TenantContext {
  userId: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
}

/**
 * Server-side guard that validates authentication and extracts the company tenant identity.
 * Always derives companyId from the verified server session, never trusting client parameters.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  const user = session.user as {
    id?: string;
    email?: string;
    name?: string;
    companyId?: string;
    role?: string;
  };

  if (!user.companyId || !user.id) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email || "",
    name: user.name || "",
    companyId: user.companyId,
    role: user.role || "RECRUITER",
  };
}

/**
 * Enforces company-level isolation.
 * Throws an error if the authenticated company ID does not match the resource's company ID.
 */
export function verifyCompanyAccess(
  sessionCompanyId: string,
  resourceCompanyId: string | { toString(): string }
): boolean {
  const resourceIdStr =
    typeof resourceCompanyId === "string"
      ? resourceCompanyId
      : resourceCompanyId.toString();

  return sessionCompanyId.toString() === resourceIdStr;
}

/**
 * Standard unauthorized response helper for API routes.
 */
export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

/**
 * Standard forbidden response helper for API routes (tenant mismatch).
 */
export function forbiddenResponse(message = "Access denied. Cross-company access prohibited."): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}
