import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICandidateExperience {
  jobTitle: string;
  company: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  skillsUsed: string[];
  durationYears?: number;
}

export interface ICandidateEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  graduationYear?: string;
}

export interface ICandidateProject {
  title: string;
  description?: string;
  url?: string;
  technologies: string[];
}

export interface ICandidateCertification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface ICandidate extends Document {
  companyId: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  normalizedSkills: string[];
  experience: ICandidateExperience[];
  education: ICandidateEducation[];
  projects: ICandidateProject[];
  certifications: ICandidateCertification[];
  languages: string[];
  totalExperienceYears: number;
  highestDegree?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    summary: { type: String },
    skills: [{ type: String }],
    normalizedSkills: [{ type: String, lowercase: true }],
    experience: [
      {
        jobTitle: { type: String, required: true },
        company: { type: String, required: true },
        startDate: { type: String },
        endDate: { type: String },
        isCurrent: { type: Boolean, default: false },
        description: { type: String },
        skillsUsed: [{ type: String }],
        durationYears: { type: Number },
      },
    ],
    education: [
      {
        institution: { type: String, required: true },
        degree: { type: String },
        fieldOfStudy: { type: String },
        graduationYear: { type: String },
      },
    ],
    projects: [
      {
        title: { type: String, required: true },
        description: { type: String },
        url: { type: String },
        technologies: [{ type: String }],
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String },
        year: { type: String },
      },
    ],
    languages: [{ type: String }],
    totalExperienceYears: { type: Number, default: 0 },
    highestDegree: { type: String },
  },
  {
    timestamps: true,
  }
);

CandidateSchema.index({ companyId: 1, email: 1 });
CandidateSchema.index({ companyId: 1, name: 1 });

export const Candidate: Model<ICandidate> =
  mongoose.models.Candidate ||
  mongoose.model<ICandidate>("Candidate", CandidateSchema);

export default Candidate;
