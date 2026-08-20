import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEscoSkill extends Document {
  conceptUri: string; // e.g. "http://data.europa.eu/esco/skill/3cd569a2-4f88-4c1e-9995-8dce8c5e51a7"
  preferredTerm: string; // e.g. "JavaScript"
  normalizedTerm: string; // e.g. "javascript"
  conceptType: string; // e.g. "KnowledgeSkillCompetence"
  skillType?: string; // e.g. "skill/competence", "knowledge"
  reuseLevel?: string; // e.g. "cross-sector", "sector-specific", "occupation-specific"
  definition?: string;
  description?: string;
  alternativeLabels: string[];
  normalizedAltLabels: string[];
  broaderUris: string[];
  broaderLabels: string[];
  narrowerUris: string[];
  relatedSkillUris: string[];
  language: string; // "en"
  version: string; // "v1.2.1"
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EscoSkillSchema = new Schema<IEscoSkill>(
  {
    conceptUri: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    preferredTerm: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedTerm: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    conceptType: {
      type: String,
      default: "KnowledgeSkillCompetence",
    },
    skillType: {
      type: String,
      trim: true,
    },
    reuseLevel: {
      type: String,
      trim: true,
    },
    definition: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    alternativeLabels: [{ type: String, trim: true }],
    normalizedAltLabels: [{ type: String, trim: true, lowercase: true, index: true }],
    broaderUris: [{ type: String, trim: true }],
    broaderLabels: [{ type: String, trim: true }],
    narrowerUris: [{ type: String, trim: true }],
    relatedSkillUris: [{ type: String, trim: true }],
    language: {
      type: String,
      default: "en",
      index: true,
    },
    version: {
      type: String,
      default: "v1.2.1",
      index: true,
    },
    status: {
      type: String,
      default: "released",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast term lookup
EscoSkillSchema.index({ normalizedTerm: 1, version: 1 });
EscoSkillSchema.index({ normalizedAltLabels: 1, version: 1 });

// Text index for full-text search capability
EscoSkillSchema.index({
  preferredTerm: "text",
  alternativeLabels: "text",
  description: "text",
});

export const EscoSkill: Model<IEscoSkill> =
  (mongoose.models.EscoSkill as Model<IEscoSkill>) ||
  mongoose.model<IEscoSkill>("EscoSkill", EscoSkillSchema);

export default EscoSkill;
