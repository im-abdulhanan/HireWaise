import mongoose, { Schema, Document, Model } from "mongoose";

export type PlanTier = "FREE" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

export interface ISubscriptionData {
  plan: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface IScreeningDefaults {
  humanReviewBelowScore: number;
  requiredSkillsMustMatch: boolean;
  minimumExperienceMustMatch: boolean;
  educationRequired: boolean;
  scoringWeights: {
    requiredSkillsWeight: number;
    experienceWeight: number;
    educationWeight: number;
    preferredSkillsWeight: number;
    otherWeight: number;
  };
}

export interface INotificationSettings {
  emailAlerts: {
    applicationReceived: boolean;
    screeningCompleted: boolean;
    screeningFailed: boolean;
    humanReviewRequired: boolean;
    jobAlerts: boolean;
    weeklySummary: boolean;
  };
  inAppAlerts: {
    screeningCompleted: boolean;
    humanReviewRequired: boolean;
    systemAlerts: boolean;
  };
}

export interface ICompany extends Document {
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
  description?: string;
  settings: {
    retentionDays: number;
    allowPublicApplications: boolean;
    autoSyncSheets: boolean;
  };
  screeningDefaults?: IScreeningDefaults;
  notificationSettings?: INotificationSettings;
  subscription?: ISubscriptionData;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    industry: { type: String, trim: true },
    size: { type: String, trim: true },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    description: { type: String, trim: true },
    settings: {
      retentionDays: { type: Number, default: 365 },
      allowPublicApplications: { type: Boolean, default: true },
      autoSyncSheets: { type: Boolean, default: true },
    },
    screeningDefaults: {
      humanReviewBelowScore: { type: Number, default: 75 },
      requiredSkillsMustMatch: { type: Boolean, default: true },
      minimumExperienceMustMatch: { type: Boolean, default: true },
      educationRequired: { type: Boolean, default: false },
      scoringWeights: {
        requiredSkillsWeight: { type: Number, default: 40 },
        experienceWeight: { type: Number, default: 25 },
        educationWeight: { type: Number, default: 15 },
        preferredSkillsWeight: { type: Number, default: 10 },
        otherWeight: { type: Number, default: 10 },
      },
    },
    notificationSettings: {
      emailAlerts: {
        applicationReceived: { type: Boolean, default: true },
        screeningCompleted: { type: Boolean, default: true },
        screeningFailed: { type: Boolean, default: true },
        humanReviewRequired: { type: Boolean, default: true },
        jobAlerts: { type: Boolean, default: true },
        weeklySummary: { type: Boolean, default: false },
      },
      inAppAlerts: {
        screeningCompleted: { type: Boolean, default: true },
        humanReviewRequired: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: true },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ["FREE", "PRO"],
        default: "FREE",
      },
      status: {
        type: String,
        enum: ["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"],
        default: "ACTIVE",
      },
      currentPeriodStart: { type: Date, default: Date.now },
      currentPeriodEnd: { type: Date },
      stripeCustomerId: { type: String },
      stripeSubscriptionId: { type: String },
      stripePriceId: { type: String },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);

export default Company;
