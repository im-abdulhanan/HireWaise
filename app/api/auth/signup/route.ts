import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  try {
    const body = await req.json();
    const { name, email, password, companyName } = body;

    const normalizedEmail = email ? email.toLowerCase().trim() : "";
    const trimmedName = name ? name.trim() : "";
    const trimmedCompanyName = companyName ? companyName.trim() : "";

    if (isDev) {
      console.log(`[AUTH-SIGNUP] Signup started for email: ${normalizedEmail}`);
    }

    if (!trimmedName || !normalizedEmail || !password || !trimmedCompanyName) {
      return NextResponse.json(
        { error: "Name, email, password, and company name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (isDev) {
        console.log(`[AUTH-SIGNUP] Registration rejected: User already exists for ${normalizedEmail}`);
      }
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Generate unique company slug
    let baseSlug = slugify(trimmedCompanyName);
    if (!baseSlug) baseSlug = "company";
    let companySlug = baseSlug;
    let counter = 1;
    while (await Company.findOne({ slug: companySlug })) {
      companySlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create Company
    const company = await Company.create({
      name: trimmedCompanyName,
      slug: companySlug,
      settings: {
        retentionDays: 365,
        allowPublicApplications: true,
        autoSyncSheets: true,
      },
    });

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User (as OWNER of the company)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      companyId: company._id,
      role: "OWNER",
      lastLoginAt: new Date(),
    });

    if (isDev) {
      console.log(`[AUTH-SIGNUP] User successfully persisted with ID: ${user._id} for email: ${normalizedEmail}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          companyId: company._id.toString(),
          companyName: company.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (isDev) {
      console.error("[AUTH-SIGNUP] Error during signup:", error);
    }
    // Handle MongoDB duplicate key error code 11000 gracefully
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
