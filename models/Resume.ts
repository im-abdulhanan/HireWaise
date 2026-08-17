import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ResumeStatus = "UPLOADED" | "PARSED" | "FAILED";

export interface IResume extends Document {
  companyId: Types.ObjectId;
  candidateId?: Types.ObjectId;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  parsedText: string;
  status: ResumeStatus;
  parseError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      index: true,
    },
    storageKey: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    parsedText: { type: String, default: "" },
    status: {
      type: String,
      enum: ["UPLOADED", "PARSED", "FAILED"],
      default: "UPLOADED",
    },
    parseError: { type: String },
  },
  {
    timestamps: true,
  }
);

ResumeSchema.index({ storageKey: 1 });

export const Resume: Model<IResume> =
  mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);

export default Resume;
