import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRecruiterNote extends Document {
  companyId: Types.ObjectId;
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  userId: Types.ObjectId;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterNoteSchema = new Schema<IRecruiterNote>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    content: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

RecruiterNoteSchema.index({ applicationId: 1, createdAt: -1 });

export const RecruiterNote: Model<IRecruiterNote> =
  mongoose.models.RecruiterNote ||
  mongoose.model<IRecruiterNote>("RecruiterNote", RecruiterNoteSchema);

export default RecruiterNote;
