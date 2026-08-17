"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ExternalLink,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Table,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { SCREENING_SHEET_HEADERS } from "@/lib/google/constants";

export default function GoogleSheetsIntegrationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [syncing, setSyncing] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/google/status");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load Google status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (successParam === "connected") {
      setMessage("Google account successfully connected with OAuth 2.0!");
    }
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [successParam, errorParam]);

  // Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/google/sheets/sync", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to synchronize to Google Sheets.");
      }

      setMessage(json.message || "Successfully synchronized candidate records.");
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Sync failed. Please verify your Google permissions.");
    } finally {
      setSyncing(false);
    }
  };

  // Create New Spreadsheet
  const handleCreateSheet = async () => {
    setCreatingSheet(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/google/sheets/create", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create Google Spreadsheet.");
      }

      setMessage("New 17-column screening spreadsheet created and linked!");
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Failed to create spreadsheet.");
    } finally {
      setCreatingSheet(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Sheets integration? Stored tokens will be permanently revoked.")) {
      return;
    }

    setDisconnecting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to disconnect.");
      }

      setMessage("Google integration disconnected.");
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || "Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const isConnected = data?.isConnected;

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/integrations"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Google Sheets Integration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate real-time candidate screening synchronization to your Google Drive.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Google Workspace Connection
                </h3>
                <Badge variant={isConnected ? "success" : "secondary"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">
                Connect your Google account using secure OAuth 2.0 with AES-256 encrypted token persistence. Automatically sync candidate scores and evidence quotes.
              </p>

              {isConnected && data?.connectedEmail && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-700">
                  <span className="font-semibold">Connected Google Account:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-800">
                    {data.connectedEmail}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            {!isConnected ? (
              <a href="/api/google/connect">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Connect Google Sheets</span>
                </Button>
              </a>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Connected Spreadsheet Details & Controls */}
      {isConnected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Screening Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Google Sheet storing candidate screening records and evaluation evidence.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {!data?.spreadsheetId ? (
                <Button
                  size="sm"
                  onClick={handleCreateSheet}
                  disabled={creatingSheet}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Screening Sheet</span>
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-blue-600" : ""}`} />
                    <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                  </Button>

                  {data?.spreadsheetUrl && (
                    <a
                      href={data.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
                        <span>Open in Google Sheets</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {data?.spreadsheetId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Spreadsheet Title:</span>
                <span className="font-bold text-slate-900">{data.spreadsheetTitle || "Candidate Screening Pipeline"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Spreadsheet ID:</span>
                <span className="font-mono text-[11px] text-slate-600">{data.spreadsheetId}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="font-semibold text-slate-700">Last Synchronized:</span>
                <span className="text-slate-600">{data.lastSyncedAt ? formatDateTime(data.lastSyncedAt) : "Never"}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">No Screening Spreadsheet Linked Yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click "Create New Screening Sheet" to generate a pre-formatted 17-column spreadsheet in your Google Drive.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 17-Column Schema Documentation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Table className="h-4 w-4 text-blue-600" />
          Standard 17-Column Spreadsheet Structure
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Every candidate screening syncs automatically with the following standardized recruiter data columns:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {SCREENING_SHEET_HEADERS.map((header, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-slate-700 font-medium"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-600">
                {i + 1}
              </span>
              <span className="truncate">{header}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
