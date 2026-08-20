/**
 * ESCO v1.2.1 Dataset Importer
 * 
 * Imports and indexes official ESCO skills, altLabels, descriptions, and hierarchy relations
 * into local MongoDB collection (EscoSkill) with idempotent bulk upserts.
 */

import fs from "fs";
import path from "path";
import { EscoSkill } from "@/models/EscoSkill";
import { cleanAlphanumeric } from "./skill-aliases";
import { EscoImportStats } from "./types";

/**
 * Robust CSV parser that handles quoted fields with embedded newlines, commas, and escaped quotes.
 */
export function parseCSVFile(filePath: string): string[][] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ESCO CSV file not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Finds the ESCO dataset directory across candidate paths.
 */
export function resolveEscoDatasetDir(): string {
  const candidatePaths = [
    path.join(process.cwd(), "esco_dataset"),
    "C:\\Users\\Public\\Resume-Checker\\esco_dataset",
    path.join(process.cwd(), "ESCO v1.2.1 dataset CSV format"),
    "C:\\Users\\Public\\Resume-Checker\\ESCO v1.2.1 dataset CSV format",
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "skills_en.csv"))) {
      return p;
    }
  }

  throw new Error(
    `ESCO dataset directory not found. Looked in: ${candidatePaths.join(", ")}`
  );
}

/**
 * Imports ESCO skills, relations, and hierarchy into MongoDB.
 */
export async function importEscoDataset(
  customDir?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<EscoImportStats> {
  const startTime = Date.now();
  const datasetDir = customDir || resolveEscoDatasetDir();

  const skillsCsvPath = path.join(datasetDir, "skills_en.csv");
  const relationsCsvPath = path.join(datasetDir, "skillSkillRelations_en.csv");
  const broaderCsvPath = path.join(datasetDir, "broaderRelationsSkillPillar_en.csv");

  console.log(`[ESCO IMPORTER] Loading ESCO dataset from: ${datasetDir}`);

  // 1. Load Skill-to-Skill Relations
  const relatedMap = new Map<string, string[]>();
  let relationsCount = 0;
  if (fs.existsSync(relationsCsvPath)) {
    const relRows = parseCSVFile(relationsCsvPath);
    // Header: originalSkillUri, originalSkillType, relationType, relatedSkillType, relatedSkillUri
    for (let i = 1; i < relRows.length; i++) {
      const origUri = relRows[i][0];
      const relUri = relRows[i][4];
      if (origUri && relUri) {
        if (!relatedMap.has(origUri)) relatedMap.set(origUri, []);
        relatedMap.get(origUri)!.push(relUri);
        relationsCount++;
      }
    }
    console.log(`[ESCO IMPORTER] Loaded ${relationsCount} skill-to-skill relations.`);
  }

  // 2. Load Broader & Narrower Hierarchy Relations
  const broaderMap = new Map<string, { uris: string[]; labels: string[] }>();
  const narrowerMap = new Map<string, string[]>();
  let broaderRelationsCount = 0;

  if (fs.existsSync(broaderCsvPath)) {
    const broaderRows = parseCSVFile(broaderCsvPath);
    // Header: conceptType, conceptUri, conceptLabel, broaderType, broaderUri, broaderLabel
    for (let i = 1; i < broaderRows.length; i++) {
      const conceptUri = broaderRows[i][1];
      const broaderUri = broaderRows[i][4];
      const broaderLabel = broaderRows[i][5];

      if (conceptUri && broaderUri) {
        if (!broaderMap.has(conceptUri)) {
          broaderMap.set(conceptUri, { uris: [], labels: [] });
        }
        broaderMap.get(conceptUri)!.uris.push(broaderUri);
        if (broaderLabel) broaderMap.get(conceptUri)!.labels.push(broaderLabel);

        if (!narrowerMap.has(broaderUri)) narrowerMap.set(broaderUri, []);
        narrowerMap.get(broaderUri)!.push(conceptUri);
        broaderRelationsCount++;
      }
    }
    console.log(`[ESCO IMPORTER] Loaded ${broaderRelationsCount} broader relations.`);
  }

  // 3. Load Skills Dataset
  const skillRows = parseCSVFile(skillsCsvPath);
  const totalCsvRows = skillRows.length - 1;
  console.log(`[ESCO IMPORTER] Parsed ${totalCsvRows} skill records from skills_en.csv.`);

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const BATCH_SIZE = 1000;
  let bulkOps: any[] = [];

  for (let i = 1; i < skillRows.length; i++) {
    const row = skillRows[i];
    // Columns: conceptType(0), conceptUri(1), skillType(2), reuseLevel(3), preferredLabel(4), altLabels(5), hiddenLabels(6), status(7), modifiedDate(8), scopeNote(9), definition(10), inScheme(11), description(12)
    const conceptType = row[0] || "KnowledgeSkillCompetence";
    const conceptUri = row[1];
    const skillType = row[2];
    const reuseLevel = row[3];
    const preferredLabel = row[4];
    const rawAltLabels = row[5] || "";
    const definition = row[10];
    const description = row[12];
    const status = row[7] || "released";

    if (!conceptUri || !preferredLabel) {
      skippedCount++;
      continue;
    }

    const normalizedTerm = cleanAlphanumeric(preferredLabel);

    // Parse alt labels (separated by newlines or semicolons)
    const altLabels = rawAltLabels
      .split(/\r?\n|;/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.toLowerCase() !== preferredLabel.toLowerCase());

    const normalizedAltLabels = Array.from(
      new Set(altLabels.map((l) => cleanAlphanumeric(l)).filter((l) => l.length > 0))
    );

    const broader = broaderMap.get(conceptUri);
    const narrower = narrowerMap.get(conceptUri) || [];
    const related = relatedMap.get(conceptUri) || [];

    const skillDoc = {
      conceptUri,
      preferredTerm: preferredLabel,
      normalizedTerm,
      conceptType,
      skillType,
      reuseLevel,
      definition: definition || undefined,
      description: description || undefined,
      alternativeLabels: altLabels,
      normalizedAltLabels,
      broaderUris: broader ? broader.uris : [],
      broaderLabels: broader ? broader.labels : [],
      narrowerUris: narrower,
      relatedSkillUris: related,
      language: "en",
      version: "v1.2.1",
      status,
    };

    bulkOps.push({
      updateOne: {
        filter: { conceptUri },
        update: { $set: skillDoc },
        upsert: true,
      },
    });

    if (bulkOps.length >= BATCH_SIZE || i === skillRows.length - 1) {
      const res = await EscoSkill.bulkWrite(bulkOps, { ordered: false });
      importedCount += res.upsertedCount || 0;
      updatedCount += res.modifiedCount || 0;
      bulkOps = [];

      if (onProgress) {
        onProgress(i, totalCsvRows);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const stats: EscoImportStats = {
    version: "v1.2.1",
    totalCsvRows,
    importedCount,
    updatedCount,
    skippedCount,
    relationsCount,
    broaderRelationsCount,
    durationMs,
  };

  console.log(`[ESCO IMPORTER] Import complete in ${Math.round(durationMs / 1000)}s.`);
  console.log(`  - Total CSV Skills: ${totalCsvRows}`);
  console.log(`  - Inserted/Upserted: ${importedCount}`);
  console.log(`  - Updated: ${updatedCount}`);
  console.log(`  - Skipped: ${skippedCount}`);

  return stats;
}
