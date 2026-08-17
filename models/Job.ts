import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "REMOTE";
export type WorkplaceType = "ON_SITE" | "HYBRID" | "REMOTE";
export type JobStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface IScreeningPolicy {
  requiredSkillsMustMatch: boolean;
  minimumExperienceMustMatch: boolean;
  educationRequired: boolean;
  humanReviewBelowScore: number;
}

export interface IScoringWeights {
  requiredSkillsWeight: number; // default 40
  experienceWeight: number;     // default 25
  educationWeight: number;      // default 15
  preferredSkillsWeight: number; // default 10
  otherWeight: number;          // default 10
}

export interface IJob extends Document {
  companyId: Types.ObjectId;
  title: string;
  slug: string;
  department?: string;
  location?: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  status: JobStatus;
  screeningPolicy: IScreeningPolicy;
  scoringWeights: IScoringWeights;
  currentScreeningVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    department: { type: String, trim: true },
    location: { type: String, trim: true },
    workplaceType: {
      type: String,
      enum: ["ON_SITE", "HYBRID", "REMOTE"],
      default: "REMOTE",
    },
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"],
      default: "FULL_TIME",
    },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: "USD" },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    screeningPolicy: {
      requiredSkillsMustMatch: { type: Boolean, default: true },
      minimumExperienceMustMatch: { type: Boolean, default: true },
      educationRequired: { type: Boolean, default: false },
      humanReviewBelowScore: { type: Number, default: 75 },
    },
    scoringWeights: {
      requiredSkillsWeight: { type: Number, default: 40 },
      experienceWeight: { type: Number, default: 25 },
      educationWeight: { type: Number, default: 15 },
      preferredSkillsWeight: { type: Number, default: 10 },
      otherWeight: { type: Number, default: 10 },
    },
    currentScreeningVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ companyId: 1, status: 1 });

export const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;
