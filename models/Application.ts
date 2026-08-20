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

export type ScreeningStage =
  | "APPLICATION_SUBMITTED"
  | "RESUME_UPLOADED"
  | "ANALYZING_RESUME"
  | "MATCHING_REQUIREMENTS"
  | "VERIFYING_RESULTS"
  | "QUEUED"
  | "RECEIVED"
  | "PARSING_RESUME"
  | "FILE_PROCESSING"
  | "EXTRACTING_PROFILE"
  | "RESUME_ANALYSIS"
  | "REQUIREMENT_MATCHING"
  | "VERIFYING_EVIDENCE"
  | "EVIDENCE_VERIFICATION"
  | "CALCULATING_SCORE"
  | "SAVING_RESULT"
  | "COMPLETED"
  | "FAILED";

export interface IScreeningAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  status: ScreeningPipelineStatus;
  failedStage?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface IApplication extends Document {
  companyId: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  resumeId: Types.ObjectId;
  status: RecruiterDecisionStatus;
  screeningStatus: ScreeningPipelineStatus;
  currentStage: ScreeningStage;
  stageProgress: number;
  referenceNumber?: string;
  screeningError?: string;
  errorCode?: string;
  attemptCount: number;
  screeningAttempts: IScreeningAttempt[];
  appliedAt: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningAttemptSchema = new Schema<IScreeningAttempt>(
  {
    attemptNumber: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    failedAt: { type: Date },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      required: true,
    },
    failedStage: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
    durationMs: { type: Number },
  },
  { _id: false }
);

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
      index: true,
    },
    currentStage: {
      type: String,
      enum: [
        "APPLICATION_SUBMITTED",
        "RESUME_UPLOADED",
        "ANALYZING_RESUME",
        "MATCHING_REQUIREMENTS",
        "VERIFYING_RESULTS",
        "QUEUED",
        "RECEIVED",
        "PARSING_RESUME",
        "FILE_PROCESSING",
        "EXTRACTING_PROFILE",
        "RESUME_ANALYSIS",
        "REQUIREMENT_MATCHING",
        "VERIFYING_EVIDENCE",
        "EVIDENCE_VERIFICATION",
        "CALCULATING_SCORE",
        "SAVING_RESULT",
        "COMPLETED",
        "FAILED",
      ],
      default: "APPLICATION_SUBMITTED",
    },
    stageProgress: {
      type: Number,
      default: 10,
    },
    referenceNumber: {
      type: String,
      index: true,
    },
    screeningError: { type: String },
    errorCode: { type: String },
    attemptCount: { type: Number, default: 1 },
    screeningAttempts: [ScreeningAttemptSchema],
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
