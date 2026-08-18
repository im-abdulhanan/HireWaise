import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RequirementCategory = "REQUIRED" | "PREFERRED" | "OPTIONAL";
export type RequirementType =
  | "SKILL"
  | "EXPERIENCE"
  | "EDUCATION"
  | "ACADEMIC_STATUS"
  | "CERTIFICATION"
  | "CUSTOM";

export interface IJobRequirement extends Document {
  jobId: Types.ObjectId;
  companyId: Types.ObjectId;
  category: RequirementCategory;
  type: RequirementType;
  title: string;
  description?: string;
  normalizedKey: string; // e.g. 'react', 'experience_years_3', 'bachelor_cs', 'academic_status_final_year_or_graduate'
  minimumValue?: number; // e.g. 3 for 3 years
  weightMultiplier?: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobRequirementSchema = new Schema<IJobRequirement>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["REQUIRED", "PREFERRED", "OPTIONAL"],
      default: "REQUIRED",
    },
    type: {
      type: String,
      enum: ["SKILL", "EXPERIENCE", "EDUCATION", "ACADEMIC_STATUS", "CERTIFICATION", "CUSTOM"],
      default: "SKILL",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    normalizedKey: { type: String, required: true, lowercase: true, trim: true },
    minimumValue: { type: Number },
    weightMultiplier: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

JobRequirementSchema.index({ jobId: 1, category: 1 });

export const JobRequirement: Model<IJobRequirement> =
  mongoose.models.JobRequirement ||
  mongoose.model<IJobRequirement>("JobRequirement", JobRequirementSchema);

export default JobRequirement;
