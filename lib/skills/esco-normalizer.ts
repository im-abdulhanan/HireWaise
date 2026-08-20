/**
 * ESCO Skill Intelligence & Hybrid Normalization Engine
 * 
 * Normalizes candidate extracted skills and recruiter requirements using a multi-layer approach:
 * 1. Application-owned alias & taxonomy dictionary (fastest & covers modern developer/safety stacks)
 * 2. Local MongoDB ESCO v1.2.1 Knowledge Index (standard taxonomy, preferred terms, altLabels, broader/narrower relations)
 * 3. Alphanumeric canonical fallback
 */

import { EscoSkill } from "@/models/EscoSkill";
import {
  resolveApplicationAlias,
  cleanAlphanumeric,
  APPLICATION_SKILL_ALIASES,
} from "./skill-aliases";
import { SkillNormalizationResult } from "./types";

/**
 * Normalizes a single skill term against Application Aliases and ESCO Database.
 */
export async function normalizeSkillTerm(rawTerm: string): Promise<SkillNormalizationResult> {
  if (!rawTerm || rawTerm.trim().length === 0) {
    return {
      originalTerm: rawTerm,
      normalizedTerm: "",
      canonicalKey: "",
      matchType: "NOT_FOUND",
      confidence: 0,
      source: "NONE",
    };
  }

  const cleaned = cleanAlphanumeric(rawTerm);

  // 1. Check Application-Owned Aliases First (Covers React.js, Node.js, Linux Administration, etc.)
  const customDef = resolveApplicationAlias(rawTerm);
  if (customDef) {
    return {
      originalTerm: rawTerm,
      normalizedTerm: customDef.displayName,
      canonicalKey: customDef.canonicalKey,
      escoConceptUri: customDef.escoConceptUri,
      matchType: cleaned === customDef.canonicalKey ? "EXACT" : "ALIAS",
      confidence: 98,
      source: "APPLICATION_ALIAS",
      broaderSkills: customDef.parents,
      narrowerSkills: customDef.children,
    };
  }

  // 2. Query Local MongoDB ESCO Index (Cached / Indexed)
  try {
    const escoMatch = await EscoSkill.findOne({
      $or: [
        { normalizedTerm: cleaned },
        { normalizedAltLabels: cleaned },
      ],
    }).lean();

    if (escoMatch) {
      const isPreferred = escoMatch.normalizedTerm === cleaned;
      return {
        originalTerm: rawTerm,
        normalizedTerm: escoMatch.preferredTerm,
        canonicalKey: escoMatch.normalizedTerm.replace(/[\s/.-]+/g, "_"),
        escoConceptUri: escoMatch.conceptUri,
        escoPreferredLabel: escoMatch.preferredTerm,
        matchType: isPreferred ? "EXACT" : "ALIAS",
        confidence: isPreferred ? 95 : 92,
        source: "ESCO",
        broaderSkills: escoMatch.broaderLabels || [],
        narrowerSkills: escoMatch.narrowerUris || [],
        relatedSkills: escoMatch.relatedSkillUris || [],
      };
    }
  } catch (dbErr) {
    // If DB is offline, continue gracefully with in-memory rules
  }

  // 3. Fallback Alphanumeric Normalization
  return {
    originalTerm: rawTerm,
    normalizedTerm: rawTerm.trim(),
    canonicalKey: cleaned.replace(/[\s/.-]+/g, "_"),
    matchType: "EXACT",
    confidence: 80,
    source: "NONE",
  };
}

/**
 * Batch-normalizes an array of skills with high performance (single MongoDB $in query).
 */
export async function batchNormalizeSkills(skills: string[]): Promise<SkillNormalizationResult[]> {
  if (!skills || skills.length === 0) return [];

  const results: SkillNormalizationResult[] = [];
  const pendingIndices: number[] = [];
  const pendingCleanedTerms: string[] = [];

  // Pass 1: Resolve from in-memory application aliases
  for (let i = 0; i < skills.length; i++) {
    const raw = skills[i];
    if (!raw) continue;
    const cleaned = cleanAlphanumeric(raw);
    const customDef = resolveApplicationAlias(raw);

    if (customDef) {
      results[i] = {
        originalTerm: raw,
        normalizedTerm: customDef.displayName,
        canonicalKey: customDef.canonicalKey,
        escoConceptUri: customDef.escoConceptUri,
        matchType: cleaned === customDef.canonicalKey ? "EXACT" : "ALIAS",
        confidence: 98,
        source: "APPLICATION_ALIAS",
        broaderSkills: customDef.parents,
        narrowerSkills: customDef.children,
      };
    } else {
      pendingIndices.push(i);
      pendingCleanedTerms.push(cleaned);
    }
  }

  // Pass 2: Batch query ESCO MongoDB for remaining terms
  if (pendingCleanedTerms.length > 0) {
    try {
      const escoDocs = await EscoSkill.find({
        $or: [
          { normalizedTerm: { $in: pendingCleanedTerms } },
          { normalizedAltLabels: { $in: pendingCleanedTerms } },
        ],
      }).lean();

      const escoLookup = new Map<string, any>();
      for (const doc of escoDocs) {
        escoLookup.set(doc.normalizedTerm, doc);
        for (const alt of doc.normalizedAltLabels || []) {
          if (!escoLookup.has(alt)) escoLookup.set(alt, doc);
        }
      }

      for (let k = 0; k < pendingIndices.length; k++) {
        const idx = pendingIndices[k];
        const raw = skills[idx];
        const cleaned = pendingCleanedTerms[k];
        const matchedDoc = escoLookup.get(cleaned);

        if (matchedDoc) {
          const isPreferred = matchedDoc.normalizedTerm === cleaned;
          results[idx] = {
            originalTerm: raw,
            normalizedTerm: matchedDoc.preferredTerm,
            canonicalKey: matchedDoc.normalizedTerm.replace(/[\s/.-]+/g, "_"),
            escoConceptUri: matchedDoc.conceptUri,
            escoPreferredLabel: matchedDoc.preferredTerm,
            matchType: isPreferred ? "EXACT" : "ALIAS",
            confidence: isPreferred ? 95 : 92,
            source: "ESCO",
            broaderSkills: matchedDoc.broaderLabels || [],
            narrowerSkills: matchedDoc.narrowerUris || [],
            relatedSkills: matchedDoc.relatedSkillUris || [],
          };
        } else {
          results[idx] = {
            originalTerm: raw,
            normalizedTerm: raw.trim(),
            canonicalKey: cleaned.replace(/[\s/.-]+/g, "_"),
            matchType: "EXACT",
            confidence: 80,
            source: "NONE",
          };
        }
      }
    } catch {
      // Fallback
      for (let k = 0; k < pendingIndices.length; k++) {
        const idx = pendingIndices[k];
        const raw = skills[idx];
        const cleaned = pendingCleanedTerms[k];
        results[idx] = {
          originalTerm: raw,
          normalizedTerm: raw.trim(),
          canonicalKey: cleaned.replace(/[\s/.-]+/g, "_"),
          matchType: "EXACT",
          confidence: 80,
          source: "NONE",
        };
      }
    }
  }

  return results.filter(Boolean);
}
