/**
 * Type definitions for ESCO Skill Intelligence & Normalization Layer
 */

export type SkillMatchType =
  | "EXACT"
  | "ALIAS"
  | "RELATED"
  | "HIERARCHICAL"
  | "CONTEXT_MATCH"
  | "PARTIAL"
  | "NOT_FOUND"
  | "UNCLEAR";

export type SkillNormalizationSource =
  | "ESCO"
  | "APPLICATION_ALIAS"
  | "HIERARCHY"
  | "CONTEXTUAL_EVIDENCE"
  | "NONE";

export interface SkillNormalizationResult {
  originalTerm: string;
  normalizedTerm: string;
  canonicalKey: string;
  escoConceptUri?: string;
  escoPreferredLabel?: string;
  matchType: SkillMatchType;
  confidence: number; // 0 - 100
  source: SkillNormalizationSource;
  broaderSkills?: string[];
  narrowerSkills?: string[];
  relatedSkills?: string[];
  reasoning?: string;
}

export interface ContextMatchResult {
  status: "MATCHED" | "PARTIAL" | "NOT_FOUND" | "UNCLEAR";
  matchMethod: "EXACT" | "ALIAS" | "HIERARCHICAL" | "SEMANTIC" | "EVIDENCE_VERIFIED" | "NONE";
  confidence: number; // 0 - 100
  evidenceQuote: string | null;
  reasoning: string;
  normalizedRequirement: string;
  matchedCandidateSkill?: string;
  escoConceptUri?: string;
  escoPreferredLabel?: string;
}

export interface EscoImportStats {
  version: string;
  totalCsvRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  relationsCount: number;
  broaderRelationsCount: number;
  durationMs: number;
}
