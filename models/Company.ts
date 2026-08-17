import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompany extends Document {
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
  settings: {
    retentionDays: number;
    allowPublicApplications: boolean;
    autoSyncSheets: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    settings: {
      retentionDays: { type: Number, default: 365 },
      allowPublicApplications: { type: Boolean, default: true },
      autoSyncSheets: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);

export default Company;
