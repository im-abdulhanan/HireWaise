import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type UserRole = "OWNER" | "RECRUITER" | "VIEWER";

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  companyId: Types.ObjectId;
  role: UserRole;
  avatarUrl?: string;
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
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "RECRUITER", "VIEWER"],
      default: "RECRUITER",
    },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ companyId: 1, email: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
