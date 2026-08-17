import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RecruiterDecisionStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEWING"
  | "REJECTED"
  | "HIRED";

export type ScreeningPipelineStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface IApplication extends Document {
  companyId: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  resumeId: Types.ObjectId;
  status: RecruiterDecisionStatus;
  screeningStatus: ScreeningPipelineStatus;
  screeningError?: string;
  appliedAt: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    status: {
      type: String,
      enum: ["NEW", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEWING", "REJECTED", "HIRED"],
      default: "NEW",
    },
    screeningStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    screeningError: { type: String },
    appliedAt: { type: Date, default: Date.now },
    idempotencyKey: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

ApplicationSchema.index({ companyId: 1, jobId: 1, status: 1 });
ApplicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);

export default Application;
