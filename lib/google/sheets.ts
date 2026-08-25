import { google } from "googleapis";
import { getAuthenticatedGoogleClient } from "./oauth";
import connectToDatabase from "@/lib/db/mongodb";
import Application from "@/models/Application";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";
import ScreeningResult from "@/models/ScreeningResult";
import ScreeningRequirementResult from "@/models/ScreeningRequirementResult";
import GoogleIntegration from "@/models/GoogleIntegration";
import { formatDate, formatDateTime } from "@/lib/utils";
import { SCREENING_SHEET_HEADERS } from "./constants";

export { SCREENING_SHEET_HEADERS };

export interface CandidateSheetRowData {
  applicationId: string;
  candidateName: string;
  email: string;
  jobTitle: string;
  matchScore: number;
  aiCategory: string;
  requiredSkillsMatched: string;
  requiredSkillsMissing: string;
  preferredSkillsMatched: string;
  experienceYears: string;
  education: string;
  evidenceSummary: string;
  confidence: string;
  recruiterStatus: string;
  submittedAt: string;
  lastScreenedAt: string;
  screeningVersion: string;
}

/**
 * Formats structured candidate data into a 17-column array matching SCREENING_SHEET_HEADERS.
 */
export function formatCandidateRowForSheet(data: CandidateSheetRowData): string[] {
  return [
    data.applicationId || "",
    data.candidateName || "",
    data.email || "",
    data.jobTitle || "",
    data.matchScore !== undefined ? `${data.matchScore}/100` : "N/A",
    data.aiCategory || "N/A",
    data.requiredSkillsMatched || "None",
    data.requiredSkillsMissing || "None",
    data.preferredSkillsMatched || "None",
    data.experienceYears || "N/A",
    data.education || "N/A",
    data.evidenceSummary || "N/A",
    data.confidence || "N/A",
    data.recruiterStatus || "NEW",
    data.submittedAt || "N/A",
    data.lastScreenedAt || "N/A",
    data.screeningVersion || "v1",
  ];
}

/**
 * Creates a new Google Spreadsheet configured with 17 styled columns.
 */
export async function createScreeningSpreadsheet(
  companyId: string,
  spreadsheetTitle = "HireWise - Candidate Screening Pipeline"
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const { oauth2Client, integration } = await getAuthenticatedGoogleClient(companyId);

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  // 1. Create spreadsheet
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: spreadsheetTitle,
      },
      sheets: [
        {
          properties: {
            title: "Candidate Screening Pipeline",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  if (!spreadsheetId) {
    throw new Error("Failed to create Google Spreadsheet.");
  }

  // 2. Insert Header Row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Candidate Screening Pipeline!A1:Q1",
    valueInputOption: "RAW",
    requestBody: {
      values: [SCREENING_SHEET_HEADERS],
    },
  });

  // 3. Save to database
  integration.connectedSpreadsheetId = spreadsheetId;
  integration.spreadsheetTitle = spreadsheetTitle;
  integration.spreadsheetUrl = spreadsheetUrl;
  await integration.save();

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Synchronizes all candidate screening records for a company to Google Sheets.
 */
export async function syncCandidatesToGoogleSheet(companyId: string): Promise<{
  success: boolean;
  syncedCount: number;
  spreadsheetUrl?: string;
}> {
  const { oauth2Client, integration } = await getAuthenticatedGoogleClient(companyId);

  const spreadsheetId = integration.connectedSpreadsheetId;
  if (!spreadsheetId) {
    throw new Error("No connected Google Spreadsheet ID found. Please create or connect a sheet first.");
  }

  integration.syncStatus = "SYNCING";
  integration.syncError = undefined;
  await integration.save();

  try {
    await connectToDatabase();

    const applications = await Application.find({ companyId })
      .sort({ appliedAt: -1 })
      .lean();

    const candidateIds = applications.map((a) => a.candidateId);
    const jobIds = applications.map((a) => a.jobId);
    const appIds = applications.map((a) => a._id);

    const [candidates, jobs, screeningResults, reqResults] = await Promise.all([
      Candidate.find({ _id: { $in: candidateIds } }).lean(),
      Job.find({ _id: { $in: jobIds } }).lean(),
      ScreeningResult.find({ applicationId: { $in: appIds } }).lean(),
      ScreeningRequirementResult.find({ companyId }).lean(),
    ]);

    const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]));
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));
    const screeningMap = new Map(screeningResults.map((s) => [s.applicationId.toString(), s]));

    const rows: string[][] = [SCREENING_SHEET_HEADERS];

    for (const app of applications) {
      const candidate = candidateMap.get(app.candidateId.toString());
      const job = jobMap.get(app.jobId.toString());
      const screening = screeningMap.get(app._id.toString());

      const appReqs = reqResults.filter(
        (r) =>
          r.candidateId?.toString() === app.candidateId.toString() &&
          r.jobId?.toString() === app.jobId.toString()
      );

      const matchedReqs = appReqs
        .filter((r) => r.requirementCategory === "REQUIRED" && r.status === "MATCHED")
        .map((r) => r.requirementTitle)
        .join(", ");

      const missingReqs = appReqs
        .filter(
          (r) =>
            r.requirementCategory === "REQUIRED" &&
            (r.status === "NOT_FOUND" || r.status === "UNCLEAR")
        )
        .map((r) => r.requirementTitle)
        .join(", ");

      const preferredMatched = appReqs
        .filter((r) => r.requirementCategory === "PREFERRED" && r.status === "MATCHED")
        .map((r) => r.requirementTitle)
        .join(", ");

      const rowData: CandidateSheetRowData = {
        applicationId: `APP-${app._id.toString().slice(-8).toUpperCase()}`,
        candidateName: candidate?.name || "Candidate",
        email: candidate?.email || "",
        jobTitle: job?.title || "Role",
        matchScore: screening?.overallScore ?? 0,
        aiCategory:
          screening?.category === "STRONG_MATCH"
            ? "Strong Match"
            : screening?.category === "POSSIBLE_MATCH"
            ? "Review Needed"
            : screening?.category === "DOES_NOT_MEET_STATED_REQUIREMENTS"
            ? "Does Not Meet"
            : "Processing",
        requiredSkillsMatched: matchedReqs || "All",
        requiredSkillsMissing: missingReqs || "None",
        preferredSkillsMatched: preferredMatched || "None",
        experienceYears: candidate?.totalExperienceYears
          ? `${candidate.totalExperienceYears} yrs`
          : "N/A",
        education:
          candidate?.education && candidate.education[0]
            ? `${candidate.education[0].degree || "Degree"} (${candidate.education[0].institution || ""})`
            : "N/A",
        evidenceSummary: screening?.summary || "Screening complete.",
        confidence: screening?.confidence
          ? `${Math.round(screening.confidence * 100)}%`
          : "90%",
        recruiterStatus: app.status || "NEW",
        submittedAt: formatDateTime(app.appliedAt),
        lastScreenedAt: screening?.screenedAt
          ? formatDateTime(screening.screenedAt)
          : formatDateTime(app.appliedAt),
        screeningVersion: `v${screening?.screeningVersion || job?.currentScreeningVersion || 1}`,
      };

      rows.push(formatCandidateRowForSheet(rowData));
    }

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Write rows to the sheet (clearing previous content first)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Candidate Screening Pipeline!A1:Q5000",
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Candidate Screening Pipeline!A1:Q${rows.length}`,
      valueInputOption: "RAW",
      requestBody: {
        values: rows,
      },
    });

    integration.lastSyncedAt = new Date();
    integration.syncStatus = "SUCCESS";
    integration.syncError = undefined;
    await integration.save();

    return {
      success: true,
      syncedCount: applications.length,
      spreadsheetUrl: integration.spreadsheetUrl,
    };
  } catch (error: any) {
    console.error("Google Sheets synchronization error:", error);
    integration.syncStatus = "ERROR";
    integration.syncError = error.message || "Failed to synchronize rows to Google Sheets.";
    await integration.save();
    throw error;
  }
}
