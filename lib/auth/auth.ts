import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || "workspace"}-${suffix}`;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password.");
        }

        await connectToDatabase();

        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        }).select("+passwordHash");

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password.");
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isMatch) {
          throw new Error("Invalid email or password.");
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          companyId: user.companyId.toString(),
          role: user.role,
          avatarUrl: user.avatarUrl || user.image,
          image: user.image || user.avatarUrl,
          provider: "credentials",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) {
          return false;
        }

        await connectToDatabase();
        const email = user.email.toLowerCase().trim();

        let dbUser = await User.findOne({ email });

        if (dbUser) {
          // Update existing user with OAuth metadata if needed
          if (!dbUser.provider || dbUser.provider === "credentials") {
            dbUser.provider = account.provider as "google" | "github";
          }
          if (account.providerAccountId) {
            dbUser.providerAccountId = account.providerAccountId;
          }
          if (user.image) {
            dbUser.image = user.image;
            dbUser.avatarUrl = user.image;
          }
          dbUser.lastLoginAt = new Date();
          await dbUser.save();
        } else {
          // Create default Company workspace for new OAuth user
          const workspaceName = user.name ? `${user.name}'s Workspace` : "Company Workspace";
          const company = await Company.create({
            name: workspaceName,
            slug: generateSlug(user.name || "company"),
            settings: {
              retentionDays: 365,
              allowPublicApplications: true,
              autoSyncSheets: true,
            },
          });

          // Create new User
          dbUser = await User.create({
            name: user.name || "Recruiter",
            email,
            image: user.image,
            avatarUrl: user.image,
            provider: account.provider as "google" | "github",
            providerAccountId: account.providerAccountId,
            companyId: company._id,
            role: "OWNER",
            lastLoginAt: new Date(),
          });
        }

        // Attach company and role metadata to the user object for jwt callback
        user.id = dbUser._id.toString();
        (user as any).companyId = dbUser.companyId.toString();
        (user as any).role = dbUser.role;
        (user as any).provider = dbUser.provider;
        (user as any).avatarUrl = dbUser.avatarUrl || dbUser.image;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.companyId = (user as any).companyId;
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl || (user as any).image;
        token.image = (user as any).image || (user as any).avatarUrl;
        token.provider = (user as any).provider || account?.provider || "credentials";
      }

      // If token is missing companyId (e.g., re-authentication), fetch from database
      if (!token.companyId && token.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: token.email.toLowerCase().trim() });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.companyId = dbUser.companyId.toString();
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl || dbUser.image;
          token.image = dbUser.image || dbUser.avatarUrl;
          token.provider = dbUser.provider || "credentials";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).companyId = token.companyId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).avatarUrl = (token.avatarUrl || token.image) as string;
        (session.user as any).image = (token.image || token.avatarUrl) as string;
        (session.user as any).provider = token.provider as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

export default authOptions;
