/**
 * CLI Runner for ESCO v1.2.1 Dataset Ingestion
 * 
 * Usage: npm run esco:import
 */

import mongoose from "mongoose";
import { importEscoDataset } from "../lib/skills/esco-importer";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/resume-checker-saas";

async function main() {
  console.log("=======================================================");
  console.log("STARTING ESCO v1.2.1 SKILL INTELLIGENCE IMPORT");
  console.log("=======================================================\n");

  console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@")}...`);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB successfully.\n");

  const stats = await importEscoDataset(undefined, (processed, total) => {
    const pct = Math.round((processed / total) * 100);
    process.stdout.write(`\rImporting ESCO skills... ${processed}/${total} (${pct}%)`);
  });

  console.log("\n");
  console.log("=======================================================");
  console.log("ESCO INGESTION SUMMARY");
  console.log("=======================================================");
  console.log(`Version:                 ${stats.version}`);
  console.log(`Total CSV Records:       ${stats.totalCsvRows}`);
  console.log(`New Records Inserted:    ${stats.importedCount}`);
  console.log(`Existing Records Synced: ${stats.updatedCount}`);
  console.log(`Skipped Rows:            ${stats.skippedCount}`);
  console.log(`Skill-Skill Relations:   ${stats.relationsCount}`);
  console.log(`Hierarchy Relations:     ${stats.broaderRelationsCount}`);
  console.log(`Duration:                ${(stats.durationMs / 1000).toFixed(2)}s`);
  console.log("=======================================================\n");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Done.");
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\n[ERROR] ESCO Import failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
