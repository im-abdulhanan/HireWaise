import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type GoogleSyncStatus = "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";

export interface IGoogleIntegration extends Document {
  companyId: Types.ObjectId;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiry?: Date;
  connectedEmail?: string;
  scopes?: string[];
  connectedSpreadsheetId?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  autoSyncEnabled: boolean;
  lastSyncedAt?: Date;
  syncStatus: GoogleSyncStatus;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleIntegrationSchema = new Schema<IGoogleIntegration>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    encryptedAccessToken: { type: String, required: true },
    encryptedRefreshToken: { type: String, required: true },
    tokenExpiry: { type: Date },
    connectedEmail: { type: String },
    scopes: [{ type: String }],
    connectedSpreadsheetId: { type: String },
    spreadsheetTitle: { type: String },
    spreadsheetUrl: { type: String },
    autoSyncEnabled: { type: Boolean, default: true },
    lastSyncedAt: { type: Date },
    syncStatus: {
      type: String,
      enum: ["IDLE", "SYNCING", "SUCCESS", "ERROR"],
      default: "IDLE",
    },
    syncError: { type: String },
  },
  {
    timestamps: true,
  }
);

export const GoogleIntegration: Model<IGoogleIntegration> =
  mongoose.models.GoogleIntegration ||
  mongoose.model<IGoogleIntegration>("GoogleIntegration", GoogleIntegrationSchema);

export default GoogleIntegration;
