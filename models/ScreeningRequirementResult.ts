import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { RequirementType } from "./JobRequirement";

export type MatchStatus = "MATCHED" | "PARTIAL" | "NOT_FOUND" | "UNCLEAR";
export type MatchMethod =
  | "EXACT"
  | "ALIAS"
  | "HIERARCHICAL"
  | "SEMANTIC"
  | "EVIDENCE_VERIFIED"
  | "NONE";

export interface IScreeningRequirementResult extends Document {
  screeningResultId: Types.ObjectId;
  jobRequirementId: Types.ObjectId;
  companyId: Types.ObjectId;
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  requirementTitle: string;
  requirementCategory: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  requirementType: RequirementType;
  status: MatchStatus;
  evidenceQuote: string; // Exact quote from resume text
  reasoning: string; // Deterministic/AI explanation
  confidence: number; // 0.0 to 1.0 or 0-100
  matchMethod?: MatchMethod;
  normalizedRequirement?: string;
  matchedCandidateSkill?: string;
  verifiedByAi: boolean;
  scoreContribution: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningRequirementResultSchema = new Schema<IScreeningRequirementResult>(
  {
    screeningResultId: {
      type: Schema.Types.ObjectId,
      ref: "ScreeningResult",
      required: true,
      index: true,
    },
    jobRequirementId: {
      type: Schema.Types.ObjectId,
      ref: "JobRequirement",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
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
    requirementTitle: { type: String, required: true },
    requirementCategory: {
      type: String,
      enum: ["REQUIRED", "PREFERRED", "OPTIONAL"],
      required: true,
    },
    requirementType: {
      type: String,
      enum: ["SKILL", "EXPERIENCE", "EDUCATION", "ACADEMIC_STATUS", "CERTIFICATION", "CUSTOM"],
      required: true,
    },
    status: {
      type: String,
      enum: ["MATCHED", "PARTIAL", "NOT_FOUND", "UNCLEAR"],
      required: true,
    },
    evidenceQuote: { type: String, default: "" },
    reasoning: { type: String, required: true },
    confidence: { type: Number, default: 0.9 },
    matchMethod: {
      type: String,
      enum: ["EXACT", "ALIAS", "HIERARCHICAL", "SEMANTIC", "EVIDENCE_VERIFIED", "NONE"],
      default: "NONE",
    },
    normalizedRequirement: { type: String },
    matchedCandidateSkill: { type: String },
    verifiedByAi: { type: Boolean, default: true },
    scoreContribution: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

ScreeningRequirementResultSchema.index({ screeningResultId: 1, status: 1 });

export const ScreeningRequirementResult: Model<IScreeningRequirementResult> =
  mongoose.models.ScreeningRequirementResult ||
  mongoose.model<IScreeningRequirementResult>(
    "ScreeningRequirementResult",
    ScreeningRequirementResultSchema
  );

export default ScreeningRequirementResult;
