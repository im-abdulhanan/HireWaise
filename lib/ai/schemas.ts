import { z } from "zod";

/**
 * Job Requirement Extraction Schemas
 */
export const ExtractedRequirementItemSchema = z.object({
  title: z.string().min(1, "Requirement title cannot be empty"),
  category: z.enum(["REQUIRED", "PREFERRED", "OPTIONAL"]),
  type: z.enum(["SKILL", "EXPERIENCE", "EDUCATION", "CERTIFICATION", "CUSTOM"]),
  normalizedKey: z.string().min(1),
  minimumValue: z.number().optional(),
  description: z.string().optional(),
});

export const JobRequirementsExtractionSchema = z.object({
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  minimumExperienceYears: z.number().nonnegative().default(0),
  educationRequirements: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  optionalSkills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  customRequirements: z.array(z.string()).default([]),
  requirementsList: z.array(ExtractedRequirementItemSchema).default([]),
});

export type ExtractedRequirementItem = z.infer<typeof ExtractedRequirementItemSchema>;
export type JobRequirementsExtraction = z.infer<typeof JobRequirementsExtractionSchema>;

/**
 * Candidate Resume Extraction Schemas
 */
export const ExperienceItemSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
  skillsUsed: z.array(z.string()).default([]),
  durationYears: z.number().nonnegative().optional().default(0),
});

export const EducationItemSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().optional().default(""),
  fieldOfStudy: z.string().optional().default(""),
  graduationYear: z.string().optional().default(""),
});

export const ProjectItemSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().optional().default(""),
  url: z.string().optional().default(""),
  technologies: z.array(z.string()).default([]),
});

export const CertificationItemSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().optional().default(""),
  year: z.string().optional().default(""),
});

export const CandidateResumeExtractionSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  skills: z.array(z.string()).default([]),
  normalizedSkills: z.array(z.string()).default([]),
  experience: z.array(ExperienceItemSchema).default([]),
  education: z.array(EducationItemSchema).default([]),
  projects: z.array(ProjectItemSchema).default([]),
  certifications: z.array(CertificationItemSchema).default([]),
  languages: z.array(z.string()).default([]),
  totalExperienceYears: z.number().nonnegative().default(0),
  highestDegree: z.string().optional().default(""),
});

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type CertificationItem = z.infer<typeof CertificationItemSchema>;
export type CandidateResumeExtraction = z.infer<typeof CandidateResumeExtractionSchema>;

/**
 * Requirement Verification Schema
 */
export const SingleRequirementVerificationSchema = z.object({
  requirementTitle: z.string(),
  status: z.enum(["MATCHED", "PARTIAL", "NOT_FOUND", "UNCLEAR"]),
  evidenceQuote: z.string().default(""),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1).default(0.9),
  verifiedByAi: z.boolean().default(true),
});

export const EvidenceVerificationReportSchema = z.object({
  verifiedRequirements: z.array(SingleRequirementVerificationSchema),
  overallConfidence: z.number().min(0).max(1).default(0.9),
  humanReviewRecommended: z.boolean().default(false),
  humanReviewReasons: z.array(z.string()).default([]),
  summary: z.string(),
});

export type SingleRequirementVerification = z.infer<
  typeof SingleRequirementVerificationSchema
>;
export type EvidenceVerificationReport = z.infer<
  typeof EvidenceVerificationReportSchema
>;
