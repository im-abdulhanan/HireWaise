import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";

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
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.companyId = (user as any).companyId;
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).companyId = token.companyId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).avatarUrl = token.avatarUrl as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

export default authOptions;
