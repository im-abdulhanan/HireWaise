import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, companyName } = body;

    if (!name || !email || !password || !companyName) {
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
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Generate unique company slug
    let baseSlug = slugify(companyName);
    if (!baseSlug) baseSlug = "company";
    let companySlug = baseSlug;
    let counter = 1;
    while (await Company.findOne({ slug: companySlug })) {
      companySlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create Company
    const company = await Company.create({
      name: companyName.trim(),
      slug: companySlug,
      settings: {
        retentionDays: 365,
        allowPublicApplications: true,
        autoSyncSheets: true,
      },
    });

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User (as OWNER of the company)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      companyId: company._id,
      role: "OWNER",
      lastLoginAt: new Date(),
    });

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
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
