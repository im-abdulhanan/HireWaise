import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type UserRole = "OWNER" | "ADMIN" | "RECRUITER" | "VIEWER";
export type AuthProvider = "google" | "github" | "credentials";

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  image?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  providerAccountId?: string;
  companyId: Types.ObjectId;
  role: UserRole;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    avatarUrl: { type: String },
    provider: {
      type: String,
      enum: ["google", "github", "credentials"],
      default: "credentials",
      required: true,
    },
    providerAccountId: { type: String },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "RECRUITER", "VIEWER"],
      default: "OWNER",
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ companyId: 1, email: 1 });
UserSchema.index({ provider: 1, providerAccountId: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
