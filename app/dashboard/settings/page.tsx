"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building,
  User,
  Shield,
  Bell,
  Sliders,
  Plug,
  CreditCard,
  Users,
  Lock,
  AlertTriangle,
  Check,
  Sparkles,
  Save,
  Trash2,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Mail,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface SettingsData {
  company: {
    id: string;
    name: string;
    slug: string;
    website: string;
    logoUrl: string;
    industry: string;
    size: string;
    country: string;
    city: string;
    description: string;
    retentionDays: number;
    allowPublicApplications: boolean;
    autoSyncSheets: boolean;
    screeningDefaults: {
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
    };
    notificationSettings: {
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
    };
  };
  profile: {
    userId: string;
    name: string;
    email: string;
    role: string;
    provider: string;
    avatarUrl: string;
    lastLoginAt?: string;
    createdAt?: string;
  };
  team: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    provider: string;
    avatarUrl: string;
    lastLoginAt?: string;
    createdAt: string;
    isSelf: boolean;
  }>;
  integrations: {
    googleSheets: {
      connected: boolean;
      connectedEmail: string | null;
      spreadsheetTitle: string | null;
      spreadsheetUrl: string | null;
      autoSyncEnabled: boolean;
      syncStatus: string;
      lastSyncedAt: string | null;
    };
    googleOAuth: { connected: boolean };
    githubOAuth: { connected: boolean };
    microsoftOAuth: { connected: boolean };
  };
  billing: {
    usage: any;
    candidateScreeningsCount: number;
  };
  permissions: {
    isOwner: boolean;
    isAdmin: boolean;
    canEditCompany: boolean;
    canManageTeam: boolean;
    canManageBilling: boolean;
    canDeleteCompany: boolean;
  };
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "company";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettingsData | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    name: "",
    website: "",
    industry: "",
    size: "11-50",
    country: "",
    city: "",
    description: "",
    retentionDays: 365,
    allowPublicApplications: true,
    autoSyncSheets: true,
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "",
    avatarUrl: "",
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Screening Defaults Form State
  const [screeningForm, setScreeningForm] = useState({
    humanReviewBelowScore: 75,
    requiredSkillsMustMatch: true,
    minimumExperienceMustMatch: true,
    educationRequired: false,
    scoringWeights: {
      requiredSkillsWeight: 40,
      experienceWeight: 25,
      educationWeight: 15,
      preferredSkillsWeight: 10,
      otherWeight: 10,
    },
  });

  // Notification Form State
  const [notificationForm, setNotificationForm] = useState({
    emailAlerts: {
      applicationReceived: true,
      screeningCompleted: true,
      screeningFailed: true,
      humanReviewRequired: true,
      jobAlerts: true,
      weeklySummary: false,
    },
    inAppAlerts: {
      screeningCompleted: true,
      humanReviewRequired: true,
      systemAlerts: true,
    },
  });

  // Team Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "RECRUITER" });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Danger Zone Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Google Sheets Disconnect Modal State
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        const c = json.data.company;
        setCompanyForm({
          name: c.name || "",
          website: c.website || "",
          industry: c.industry || "Technology / Software",
          size: c.size || "11-50",
          country: c.country || "United States",
          city: c.city || "San Francisco",
          description: c.description || "",
          retentionDays: c.retentionDays || 365,
          allowPublicApplications: c.allowPublicApplications ?? true,
          autoSyncSheets: c.autoSyncSheets ?? true,
        });

        const p = json.data.profile;
        setProfileForm({
          name: p.name || "",
          avatarUrl: p.avatarUrl || "",
        });

        if (c.screeningDefaults) {
          setScreeningForm(c.screeningDefaults);
        }

        if (c.notificationSettings) {
          setNotificationForm(c.notificationSettings);
        }
      } else {
        showToast(json.error || "Failed to load settings.", "error");
      }
    } catch {
      showToast("Network error loading settings.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function setTab(tabName: string) {
    router.push(`/dashboard/settings?tab=${tabName}`);
  }

  // Save Company Profile
  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Company profile updated successfully!");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to update company.", "error");
      }
    } catch {
      showToast("Failed to save company settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Save Personal Profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Profile updated successfully!");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to update profile.", "error");
      }
    } catch {
      showToast("Failed to save personal information.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Change Password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Password changed successfully!");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        showToast(json.error || "Failed to update password.", "error");
      }
    } catch {
      showToast("Failed to change password.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Save Screening Defaults
  async function handleSaveScreeningDefaults(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/screening-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screeningForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Default screening preferences saved!");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to save screening defaults.", "error");
      }
    } catch {
      showToast("Failed to update screening defaults.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Save Notification Preferences
  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Notification settings saved!");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to update notification settings.", "error");
      }
    } catch {
      showToast("Failed to save notifications.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Invite Team Member
  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Team member invited successfully!");
        setShowInviteModal(false);
        setInviteForm({ name: "", email: "", role: "RECRUITER" });
        await loadSettings();
      } else {
        showToast(json.error || "Failed to invite team member.", "error");
      }
    } catch {
      showToast("Failed to invite team member.", "error");
    } finally {
      setInviteLoading(false);
    }
  }

  // Change Team Member Role
  async function handleChangeMemberRole(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Member role updated.");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to update member role.", "error");
      }
    } catch {
      showToast("Failed to update role.", "error");
    }
  }

  // Remove Team Member
  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove ${memberName} from your workspace?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Team member removed.");
        await loadSettings();
      } else {
        showToast(json.error || "Failed to remove member.", "error");
      }
    } catch {
      showToast("Failed to remove member.", "error");
    }
  }

  // Disconnect Google Sheets
  async function handleDisconnectGoogleSheets() {
    setDisconnectLoading(true);
    try {
      const res = await fetch("/api/settings/integrations/google/disconnect", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Google Sheets disconnected.");
        setShowDisconnectModal(false);
        await loadSettings();
      } else {
        showToast(json.error || "Failed to disconnect Google Sheets.", "error");
      }
    } catch {
      showToast("Failed to disconnect integration.", "error");
    } finally {
      setDisconnectLoading(false);
    }
  }

  // Delete Company (Danger Zone)
  async function handleDeleteCompany(e: React.FormEvent) {
    e.preventDefault();
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/settings/danger/delete-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationName: deleteConfirmationName }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Organization workspace permanently deleted. You will now be redirected.");
        signOut({ callbackUrl: "/" });
      } else {
        showToast(json.error || "Failed to delete company.", "error");
      }
    } catch {
      showToast("Failed to delete company.", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Export Data JSON
  function handleExportData() {
    if (!data) return;
    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      company: data.company,
      team: data.team,
      integrations: data.integrations,
      disclaimer: "HireWise GDPR/SOC2 Data Export",
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hirewise-${data.company.slug}-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Workspace data exported successfully!");
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 h-80 bg-slate-200 rounded-2xl" />
          <div className="md:col-span-9 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "company", name: "Company Profile", icon: Building },
    { id: "profile", name: "Personal Profile", icon: User },
    { id: "security", name: "Security", icon: Shield },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "screening", name: "Screening Defaults", icon: Sliders },
    { id: "integrations", name: "Integrations", icon: Plug },
    { id: "billing", name: "Billing & Plan", icon: CreditCard },
    { id: "team", name: "Team Members", icon: Users },
    { id: "privacy", name: "Data & Privacy", icon: Lock },
    { id: "danger", name: "Danger Zone", icon: AlertTriangle, danger: true },
  ];

  const providerLabel =
    data?.profile.provider === "google"
      ? "Signed in with Google"
      : data?.profile.provider === "github"
      ? "Signed in with GitHub"
      : "Signed in with Email & Password";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your company workspace, team access, screening policies, and security controls.
        </p>
      </div>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-xl border p-4 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Settings 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-4 rounded-2xl border border-black/10 bg-white p-2 shadow-2xs space-y-1">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Settings Menu</span>
          </div>

          <nav className="space-y-0.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  type="button"
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? tab.danger
                        ? "bg-rose-50 text-rose-900 font-bold border border-rose-200"
                        : "bg-[#e7e5e2] text-[#19191a] font-bold shadow-2xs"
                      : tab.danger
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-600 hover:bg-[#e7e5e2]/60 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <tab.icon className={`h-4 w-4 ${tab.danger ? "text-rose-600" : isActive ? "text-[#19191a]" : "text-slate-400"}`} />
                    <span>{tab.name}</span>
                  </div>
                  {tab.id === "team" && data?.team && (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {data.team.length}
                    </span>
                  )}
                  {tab.id === "billing" && (
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {data?.billing.usage?.plan || "FREE"}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Main Content Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: COMPANY PROFILE */}
          {/* ========================================================= */}
          {activeTab === "company" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Company Profile</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage the public profile and organization metadata displayed across your HireWise workspace.
                </p>
              </div>

              {!data?.permissions.canEditCompany && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>You have read-only access. Only Owners and Admins can update organization settings.</span>
                </div>
              )}

              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
                    <Input
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Website</label>
                    <Input
                      placeholder="https://company.com"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry</label>
                    <Input
                      placeholder="e.g. Technology / SaaS"
                      value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Size</label>
                    <select
                      value={companyForm.size}
                      onChange={(e) => setCompanyForm({ ...companyForm, size: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="1-10">1-10 Employees (Startup)</option>
                      <option value="11-50">11-50 Employees (Growth)</option>
                      <option value="51-200">51-200 Employees (Mid-size)</option>
                      <option value="201-500">201-500 Employees (Scaleup)</option>
                      <option value="500+">500+ Employees (Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country</label>
                    <Input
                      placeholder="e.g. United States"
                      value={companyForm.country}
                      onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                    <Input
                      placeholder="e.g. San Francisco"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      disabled={!data?.permissions.canEditCompany || saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Description</label>
                  <Textarea
                    rows={3}
                    placeholder="Brief description of your company and talent mission..."
                    value={companyForm.description}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    disabled={!data?.permissions.canEditCompany || saving}
                  />
                </div>

                {data?.permissions.canEditCompany && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                    <Button type="submit" disabled={saving} className="gap-2 text-xs font-bold shadow-xs">
                      {saving ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Save Company Profile</span>
                    </Button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PERSONAL PROFILE */}
          {/* ========================================================= */}
          {activeTab === "profile" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personal Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your individual account details, name, and identity across your company workspace.
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#19191a] text-white font-bold text-lg shadow-xs">
                  {data?.profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{data?.profile.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                      {data?.profile.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{providerLabel}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Work Email Address</label>
                    <span className="text-[11px] text-slate-400 font-medium">Primary Login Identifier</span>
                  </div>
                  <Input value={data?.profile.email} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Email address is tied to your login provider and cannot be changed directly.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button type="submit" disabled={saving} className="gap-2 text-xs font-bold shadow-xs">
                    {saving ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save Changes</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SECURITY */}
          {/* ========================================================= */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Password Change Card (if credentials) */}
              {data?.profile.provider === "credentials" ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Change Account Password</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ensure your account uses a secure password with a minimum of 8 characters.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
                        <Input
                          type="password"
                          placeholder="Min. 8 characters"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          minLength={8}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                        <Input
                          type="password"
                          placeholder="Repeat new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          minLength={8}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                      <Button type="submit" disabled={saving} className="gap-2 text-xs font-bold shadow-xs">
                        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                        <span>Update Password</span>
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">OAuth Managed Authentication</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your account is authenticated via {providerLabel}. Password management is handled by your OAuth identity provider.
                    </p>
                  </div>
                </div>
              )}

              {/* Session Security Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Shield className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Session & Inactivity Protection</h3>
                      <p className="text-xs text-slate-500">
                        Session tokens are encrypted with AES-256 JWT cookies.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active Session
                  </span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border-t border-slate-100">
                  <span className="text-slate-500">
                    Last login recorded: {data?.profile.lastLoginAt ? new Date(data.profile.lastLoginAt).toLocaleString() : "Active now"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                  >
                    Sign Out of Session
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: NOTIFICATIONS */}
          {/* ========================================================= */}
          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Notification Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure real-time email alerts and in-app screening updates for your team.
                </p>
              </div>

              <form onSubmit={handleSaveNotifications} className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Alerts</h3>
                  <div className="space-y-2.5">
                    {[
                      {
                        key: "applicationReceived",
                        title: "Application Received",
                        desc: "Send an email alert whenever a candidate applies to an active job.",
                      },
                      {
                        key: "screeningCompleted",
                        title: "AI Screening Completed",
                        desc: "Notify recruiters when deterministic evaluation and evidence audit complete.",
                      },
                      {
                        key: "screeningFailed",
                        title: "Screening Failure / Disqualification",
                        desc: "Send immediate notification when a resume fails hard policy rules.",
                      },
                      {
                        key: "humanReviewRequired",
                        title: "Candidate Requires Human Review",
                        desc: "Alert recruiters when match score is in the ambiguous human review threshold.",
                      },
                      {
                        key: "jobAlerts",
                        title: "Job Application Thresholds",
                        desc: "Receive pipeline milestone alerts (e.g. 50, 100 applications reached).",
                      },
                      {
                        key: "weeklySummary",
                        title: "Weekly Hiring Digest",
                        desc: "Weekly summary of candidates evaluated, top matches, and sync stats.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="pr-4">
                          <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={(notificationForm.emailAlerts as any)[item.key]}
                          onChange={(e) =>
                            setNotificationForm({
                              ...notificationForm,
                              emailAlerts: {
                                ...notificationForm.emailAlerts,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black mt-0.5"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* In-App Notifications */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">In-App Alerts</h3>
                  <div className="space-y-2.5">
                    {[
                      {
                        key: "screeningCompleted",
                        title: "Real-time Screening Popups",
                        desc: "Show toast notifications when background processing finishes.",
                      },
                      {
                        key: "humanReviewRequired",
                        title: "Human Review Badges",
                        desc: "Highlight candidate cards requiring recruiter audit with amber indicators.",
                      },
                      {
                        key: "systemAlerts",
                        title: "System & Sync Health Alerts",
                        desc: "Display Google Sheets connection status warnings in the sidebar.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="pr-4">
                          <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={(notificationForm.inAppAlerts as any)[item.key]}
                          onChange={(e) =>
                            setNotificationForm({
                              ...notificationForm,
                              inAppAlerts: {
                                ...notificationForm.inAppAlerts,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black mt-0.5"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button type="submit" disabled={saving} className="gap-2 text-xs font-bold shadow-xs">
                    {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Notification Preferences</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: SCREENING PREFERENCES */}
          {/* ========================================================= */}
          {activeTab === "screening" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Default Screening Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure default evaluation rules and scoring weights pre-populated when creating new job positions.
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-950 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Note:</strong> These preferences are used as defaults when creating new jobs. Changing them does not modify existing jobs or past candidate evaluations.
                </p>
              </div>

              <form onSubmit={handleSaveScreeningDefaults} className="space-y-6">
                {/* Strict Matching Rules */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Strict Qualification Rules</h3>
                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Strict Required Skills Match</p>
                        <p className="text-[11px] text-slate-500">Disqualify candidates who miss 100% of required skills</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={screeningForm.requiredSkillsMustMatch}
                        onChange={(e) => setScreeningForm({ ...screeningForm, requiredSkillsMustMatch: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Strict Minimum Experience Match</p>
                        <p className="text-[11px] text-slate-500">Disqualify candidates with less than the required years of experience</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={screeningForm.minimumExperienceMustMatch}
                        onChange={(e) => setScreeningForm({ ...screeningForm, minimumExperienceMustMatch: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Strict Education Requirement</p>
                        <p className="text-[11px] text-slate-500">Require degree credential before scoring preferred qualifications</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={screeningForm.educationRequired}
                        onChange={(e) => setScreeningForm({ ...screeningForm, educationRequired: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                      />
                    </label>
                  </div>
                </div>

                {/* Human Review Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Human Review Score Threshold: <strong>{screeningForm.humanReviewBelowScore}%</strong>
                    </label>
                    <span className="text-[11px] text-slate-500">Candidates below this score are flagged for recruiter review</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={screeningForm.humanReviewBelowScore}
                    onChange={(e) => setScreeningForm({ ...screeningForm, humanReviewBelowScore: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>50% (Lenient)</span>
                    <span>75% (Standard)</span>
                    <span>90% (Strict)</span>
                  </div>
                </div>

                {/* Scoring Weights */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Scoring Weights (Must total 100%)</h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        screeningForm.scoringWeights.requiredSkillsWeight +
                          screeningForm.scoringWeights.experienceWeight +
                          screeningForm.scoringWeights.educationWeight +
                          screeningForm.scoringWeights.preferredSkillsWeight +
                          screeningForm.scoringWeights.otherWeight ===
                        100
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      Total:{" "}
                      {screeningForm.scoringWeights.requiredSkillsWeight +
                        screeningForm.scoringWeights.experienceWeight +
                        screeningForm.scoringWeights.educationWeight +
                        screeningForm.scoringWeights.preferredSkillsWeight +
                        screeningForm.scoringWeights.otherWeight}
                      %
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Required Skills</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={screeningForm.scoringWeights.requiredSkillsWeight}
                        onChange={(e) =>
                          setScreeningForm({
                            ...screeningForm,
                            scoringWeights: {
                              ...screeningForm.scoringWeights,
                              requiredSkillsWeight: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Experience</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={screeningForm.scoringWeights.experienceWeight}
                        onChange={(e) =>
                          setScreeningForm({
                            ...screeningForm,
                            scoringWeights: {
                              ...screeningForm.scoringWeights,
                              experienceWeight: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Education</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={screeningForm.scoringWeights.educationWeight}
                        onChange={(e) =>
                          setScreeningForm({
                            ...screeningForm,
                            scoringWeights: {
                              ...screeningForm.scoringWeights,
                              educationWeight: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={screeningForm.scoringWeights.preferredSkillsWeight}
                        onChange={(e) =>
                          setScreeningForm({
                            ...screeningForm,
                            scoringWeights: {
                              ...screeningForm.scoringWeights,
                              preferredSkillsWeight: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Other Criteria</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={screeningForm.scoringWeights.otherWeight}
                        onChange={(e) =>
                          setScreeningForm({
                            ...screeningForm,
                            scoringWeights: {
                              ...screeningForm.scoringWeights,
                              otherWeight: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button type="submit" disabled={saving} className="gap-2 text-xs font-bold shadow-xs">
                    {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save Screening Defaults</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: INTEGRATIONS */}
          {/* ========================================================= */}
          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Connected Integrations</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect HireWise with Google Sheets and external platforms to automate candidate workflows.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Google Sheets Card */}
                  <div className="rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">Google Sheets 17-Column Live Sync</h3>
                          {data?.integrations.googleSheets.connected ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {data?.integrations.googleSheets.connected
                            ? `Synced to: ${data.integrations.googleSheets.spreadsheetTitle || "Live Recruiter Sheet"} (${data.integrations.googleSheets.connectedEmail})`
                            : "Export verified candidate match scores and verbatim quotes to Google Sheets automatically."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {data?.integrations.googleSheets.connected ? (
                        <>
                          {data.integrations.googleSheets.spreadsheetUrl && (
                            <a
                              href={data.integrations.googleSheets.spreadsheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 px-3 py-1.5"
                            >
                              <span>Open Sheet</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDisconnectModal(true)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Link href="/dashboard/integrations/google">
                          <Button size="sm" className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Connect Google Sheets</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Google OAuth Identity */}
                  <div className="rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Google Workspace Identity</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Single Sign-On and recruiter verification via Google Workspace.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                      {data?.integrations.googleOAuth.connected ? "Active SSO" : "Available"}
                    </span>
                  </div>

                  {/* GitHub OAuth Identity */}
                  <div className="rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">GitHub Developer SSO</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Engineering team single sign-on and OAuth identity.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                      {data?.integrations.githubOAuth.connected ? "Active SSO" : "Available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: BILLING & PLAN */}
          {/* ========================================================= */}
          {activeTab === "billing" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Billing & Subscription</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor monthly job creation quotas and subscription tiers.
                  </p>
                </div>
                <Link href="/dashboard/billing">
                  <Button size="sm" className="text-xs font-bold bg-[#19191a] text-white hover:bg-black gap-1 shadow-xs">
                    <span>Manage Full Billing</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Plan</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {data?.billing.usage?.plan === "PRO" ? "Pro Plan ($10/mo)" : "Free Plan ($0/mo)"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                      {data?.billing.usage?.status || "ACTIVE"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {data?.billing.usage?.plan === "PRO"
                      ? "Up to 50 active jobs with priority AI evaluation."
                      : "Up to 2 active jobs with standard screening."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Job Quota</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {data?.billing.usage?.jobsUsed ?? 0} / {data?.billing.usage?.jobsLimit ?? 2}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {data?.billing.usage?.jobsRemaining ?? 2} remaining
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#19191a] rounded-full"
                      style={{ width: `${Math.min(100, data?.billing.usage?.usagePercentage ?? 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: TEAM MEMBERS */}
          {/* ========================================================= */}
          {activeTab === "team" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Team Members</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invite recruiters, assign roles, and manage company access permissions.
                  </p>
                </div>
                {data?.permissions.canManageTeam && (
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    size="sm"
                    className="text-xs font-bold bg-[#19191a] hover:bg-black text-white gap-1.5 shadow-xs shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Invite Team Member</span>
                  </Button>
                )}
              </div>

              {/* Members Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Joined</th>
                      {data?.permissions.canManageTeam && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.team.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{member.name}</span>
                                {member.isSelf && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {data.permissions.canManageTeam && !member.isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-black"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="RECRUITER">RECRUITER</option>
                              <option value="VIEWER">VIEWER</option>
                              {data.permissions.isOwner && <option value="OWNER">OWNER</option>}
                            </select>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        {data.permissions.canManageTeam && (
                          <td className="px-4 py-3 text-right">
                            {!member.isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="h-7 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 9: DATA & PRIVACY */}
          {/* ========================================================= */}
          {activeTab === "privacy" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Data & Privacy Compliance</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tenant isolation, encryption standards, candidate resume data privacy, and data export tools.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Strict Tenant Data Isolation (SOC2 / GDPR Ready)</p>
                  <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                    Candidate resumes and screening evaluation outputs are isolated to your organization’s encrypted tenant partition. No candidate data is ever shared across organizations or used to train public foundation models.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Export Company Workspace Data</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Download a comprehensive JSON snapshot of your organization profile, team members, and integration metadata.
                    </p>
                  </div>
                  <Button onClick={handleExportData} variant="outline" size="sm" className="text-xs font-semibold gap-1.5 shadow-2xs">
                    <span>Export JSON</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Data Retention Cycle</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Candidate resumes are retained for {data?.company.retentionDays || 365} days before automated purge.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                    {data?.company.retentionDays || 365} Days
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 10: DANGER ZONE */}
          {/* ========================================================= */}
          {activeTab === "danger" && (
            <div className="rounded-2xl border-2 border-rose-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-950 tracking-tight">Danger Zone</h2>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Irreversible actions that permanently impact your organization workspace.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-rose-950">Delete Organization Workspace</h3>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      Permanently delete <strong>{data?.company.name}</strong> and all associated jobs, requirements, resumes, screening evaluations, and team accounts. This action cannot be undone.
                    </p>
                  </div>
                  {data?.permissions.isOwner ? (
                    <Button
                      onClick={() => setShowDeleteModal(true)}
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shrink-0 shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Workspace</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200">
                      Owner Permission Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: INVITE TEAM MEMBER */}
      {/* ========================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Invite a teammate to collaborate on candidate qualification and hiring workflows in {data?.company.name}.
            </p>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <Input
                  placeholder="e.g. Alex Miller"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
                <Input
                  type="email"
                  placeholder="alex@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role & Permissions</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="RECRUITER">RECRUITER (Create jobs & evaluate candidates)</option>
                  <option value="ADMIN">ADMIN (Full recruiter + team management access)</option>
                  <option value="VIEWER">VIEWER (Read-only candidate pipeline inspection)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={inviteLoading} className="text-xs font-bold bg-black text-white">
                  {inviteLoading ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DISCONNECT GOOGLE SHEETS CONFIRMATION */}
      {/* ========================================================= */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900">Disconnect Google Sheets</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Disconnecting will stop automatic synchronization of candidate scores and evidence citations. Your existing Google Sheet will remain untouched in your Google Drive.
            </p>

            <div className="pt-3 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDisconnectModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDisconnectGoogleSheets}
                disabled={disconnectLoading}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {disconnectLoading ? "Disconnecting..." : "Confirm Disconnect"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DELETE COMPANY CONFIRMATION (DANGER ZONE) */}
      {/* ========================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-rose-300 bg-white p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-rose-950">Delete Organization Workspace</h3>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              This action is <strong>permanent and non-recoverable</strong>. All active job postings, screening models, applicant resumes, AI scores, and user accounts associated with <strong>{data?.company.name}</strong> will be permanently wiped.
            </p>

            <form onSubmit={handleDeleteCompany} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type <strong>{data?.company.name}</strong> to confirm:
                </label>
                <Input
                  placeholder={data?.company.name}
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deleteLoading || deleteConfirmationName.trim().toLowerCase() !== data?.company.name.trim().toLowerCase()}
                  className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting Workspace..." : "Permanently Delete Workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
