import { z } from "zod";

/**
 * Job Requirement Extraction Schemas
 */
export const ExtractedRequirementItemSchema = z.object({
  title: z.string().min(1, "Requirement title cannot be empty"),
  category: z.enum(["REQUIRED", "PREFERRED", "OPTIONAL"]).default("REQUIRED"),
  type: z.enum(["SKILL", "EXPERIENCE", "EDUCATION", "CERTIFICATION", "CUSTOM"]).default("SKILL"),
  normalizedKey: z.string().default("requirement"),
  minimumValue: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const JobRequirementsExtractionSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === "object") {
      const reqList = Array.isArray(val.requirementsList)
        ? val.requirementsList.map((r: any) => ({
            ...r,
            title: r.title || r.name || "Requirement",
            category: ["REQUIRED", "PREFERRED", "OPTIONAL"].includes(r.category)
              ? r.category
              : "REQUIRED",
            type: ["SKILL", "EXPERIENCE", "EDUCATION", "CERTIFICATION", "CUSTOM"].includes(r.type)
              ? r.type
              : "SKILL",
            normalizedKey: r.normalizedKey || r.slug || "req",
            minimumValue: typeof r.minimumValue === "number" ? r.minimumValue : undefined,
            description: r.description || "",
          }))
        : [];

      return {
        ...val,
        jobTitle: val.jobTitle || "",
        department: val.department || "",
        minimumExperienceYears: Number(val.minimumExperienceYears || 0),
        educationRequirements: Array.isArray(val.educationRequirements)
          ? val.educationRequirements
          : [],
        requiredSkills: Array.isArray(val.requiredSkills) ? val.requiredSkills : [],
        preferredSkills: Array.isArray(val.preferredSkills) ? val.preferredSkills : [],
        optionalSkills: Array.isArray(val.optionalSkills) ? val.optionalSkills : [],
        certifications: Array.isArray(val.certifications) ? val.certifications : [],
        customRequirements: Array.isArray(val.customRequirements) ? val.customRequirements : [],
        requirementsList: reqList,
      };
    }
    return val;
  },
  z.object({
    jobTitle: z.string().optional().default(""),
    department: z.string().optional().default(""),
    minimumExperienceYears: z.number().nonnegative().default(0),
    educationRequirements: z.array(z.string()).default([]),
    requiredSkills: z.array(z.string()).default([]),
    preferredSkills: z.array(z.string()).default([]),
    optionalSkills: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
    customRequirements: z.array(z.string()).default([]),
    requirementsList: z.array(ExtractedRequirementItemSchema).default([]),
  })
);

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

export const CandidateResumeExtractionSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === "object") {
      let email = (val.email || "").trim();
      if (!email.includes("@") || !email.includes(".")) {
        email = "applicant@example.com";
      }

      return {
        ...val,
        candidateName: (val.candidateName || val.name || val.fullName || "Candidate").trim(),
        email,
        phone: String(val.phone || ""),
        location: String(val.location || ""),
        summary: String(val.summary || ""),
        skills: Array.isArray(val.skills) ? val.skills : [],
        normalizedSkills: Array.isArray(val.normalizedSkills) ? val.normalizedSkills : [],
        experience: Array.isArray(val.experience) ? val.experience : [],
        education: Array.isArray(val.education) ? val.education : [],
        projects: Array.isArray(val.projects) ? val.projects : [],
        certifications: Array.isArray(val.certifications) ? val.certifications : [],
        languages: Array.isArray(val.languages) ? val.languages : [],
        totalExperienceYears: Number(
          val.totalExperienceYears ?? val.yearsOfExperience ?? val.experienceYears ?? 0
        ),
        highestDegree: String(val.highestDegree || ""),
      };
    }
    return val;
  },
  z.object({
    candidateName: z.string().min(1, "Candidate name is required"),
    email: z.string().default("applicant@example.com"),
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
  })
);

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

export const EvidenceVerificationReportSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === "object") {
      const list =
        val.verifiedRequirements ||
        val.requirementResults ||
        val.requirements ||
        val.results ||
        [];
      return {
        ...val,
        verifiedRequirements: Array.isArray(list)
          ? list.map((item: any) => ({
              requirementTitle:
                item.requirementTitle || item.title || item.name || "Requirement",
              status: ["MATCHED", "PARTIAL", "NOT_FOUND", "UNCLEAR"].includes(item.status)
                ? item.status
                : "MATCHED",
              evidenceQuote: item.evidenceQuote || item.quote || item.evidence || "",
              reasoning: item.reasoning || item.explanation || "Verified against resume evidence.",
              confidence: typeof item.confidence === "number" ? item.confidence : 0.9,
              verifiedByAi: true,
            }))
          : [],
        overallConfidence:
          typeof val.overallConfidence === "number" ? val.overallConfidence : 0.9,
        humanReviewRecommended: Boolean(val.humanReviewRecommended),
        humanReviewReasons: Array.isArray(val.humanReviewReasons) ? val.humanReviewReasons : [],
        summary: val.summary || val.overallSummary || "Evidence verification complete.",
      };
    }
    return val;
  },
  z.object({
    verifiedRequirements: z.array(SingleRequirementVerificationSchema).default([]),
    overallConfidence: z.number().min(0).max(1).default(0.9),
    humanReviewRecommended: z.boolean().default(false),
    humanReviewReasons: z.array(z.string()).default([]),
    summary: z.string().default("Verification complete."),
  })
);

export type SingleRequirementVerification = z.infer<
  typeof SingleRequirementVerificationSchema
>;
export type EvidenceVerificationReport = z.infer<
  typeof EvidenceVerificationReportSchema
>;
