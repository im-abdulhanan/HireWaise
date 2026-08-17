import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ScreeningCategory =
  | "STRONG_MATCH"
  | "POSSIBLE_MATCH"
  | "DOES_NOT_MEET_STATED_REQUIREMENTS"
  | "PROCESSING_FAILED";

export interface IScoreBreakdown {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  preferredSkillsScore: number;
  otherScore: number;
}

export interface IAiUsageMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  processingDurationMs: number;
  retryCount: number;
  estimatedCostUsd: number;
}

export interface IScreeningResult extends Document {
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  companyId: Types.ObjectId;
  overallScore: number; // 0 - 100
  category: ScreeningCategory;
  summary: string;
  confidence: number; // 0.0 - 1.0
  humanReviewRecommended: boolean;
  humanReviewReasons: string[];
  scoreBreakdown: IScoreBreakdown;
  matchedRequiredSkillsCount: number;
  totalRequiredSkillsCount: number;
  matchedPreferredSkillsCount: number;
  totalPreferredSkillsCount: number;
  detectedExperienceYears: number;
  requiredExperienceYears: number;
  screeningVersion: number;
  jobRequirementsSnapshot: any[];
  scoringWeightsSnapshot: any;
  screeningPolicySnapshot: any;
  aiUsage: IAiUsageMetrics;
  screenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningResultSchema = new Schema<IScreeningResult>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
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
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    category: {
      type: String,
      enum: [
        "STRONG_MATCH",
        "POSSIBLE_MATCH",
        "DOES_NOT_MEET_STATED_REQUIREMENTS",
        "PROCESSING_FAILED",
      ],
      required: true,
    },
    summary: { type: String, required: true },
    confidence: { type: Number, default: 0.9, min: 0, max: 1 },
    humanReviewRecommended: { type: Boolean, default: false },
    humanReviewReasons: [{ type: String }],
    scoreBreakdown: {
      skillsScore: { type: Number, default: 0 },
      experienceScore: { type: Number, default: 0 },
      educationScore: { type: Number, default: 0 },
      preferredSkillsScore: { type: Number, default: 0 },
      otherScore: { type: Number, default: 0 },
    },
    matchedRequiredSkillsCount: { type: Number, default: 0 },
    totalRequiredSkillsCount: { type: Number, default: 0 },
    matchedPreferredSkillsCount: { type: Number, default: 0 },
    totalPreferredSkillsCount: { type: Number, default: 0 },
    detectedExperienceYears: { type: Number, default: 0 },
    requiredExperienceYears: { type: Number, default: 0 },
    screeningVersion: { type: Number, default: 1 },
    jobRequirementsSnapshot: { type: Schema.Types.Mixed, default: [] },
    scoringWeightsSnapshot: { type: Schema.Types.Mixed },
    screeningPolicySnapshot: { type: Schema.Types.Mixed },
    aiUsage: {
      model: { type: String, default: "gemini-1.5-flash" },
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      processingDurationMs: { type: Number, default: 0 },
      retryCount: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0 },
    },
    screenedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

ScreeningResultSchema.index({ companyId: 1, overallScore: -1 });
ScreeningResultSchema.index({ jobId: 1, overallScore: -1 });
ScreeningResultSchema.index({ category: 1 });

export const ScreeningResult: Model<IScreeningResult> =
  mongoose.models.ScreeningResult ||
  mongoose.model<IScreeningResult>("ScreeningResult", ScreeningResultSchema);

export default ScreeningResult;
