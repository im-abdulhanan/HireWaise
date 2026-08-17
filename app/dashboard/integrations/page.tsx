"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function IntegrationsPage() {
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/google/status");
        const json = await res.json();
        if (json.success) {
          setGoogleStatus(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch Google status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  const isGoogleConnected = googleStatus?.isConnected;

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Integrations & Data Sync
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect external spreadsheets, databases, and pipelines to automatically sync screening results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Sheets Integration Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <Badge variant={isGoogleConnected ? "success" : "secondary"}>
                {isGoogleConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>

            <h3 className="text-base font-bold text-slate-900">Google Sheets</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export and synchronize screened candidate scores, evidence quotes, and recruiter pipeline statuses into a standardized 17-column live Google Spreadsheet.
            </p>

            {isGoogleConnected && googleStatus?.connectedEmail && (
              <div className="mt-4 rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 text-xs text-emerald-800">
                <p className="font-semibold">Connected Account:</p>
                <p className="font-mono text-[11px] mt-0.5">{googleStatus.connectedEmail}</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">OAuth 2.0 • Encrypted Tokens</span>
            <Link href="/dashboard/integrations/google">
              <Button size="sm" variant={isGoogleConnected ? "outline" : "default"} className="gap-1.5 text-xs">
                <span>{isGoogleConnected ? "Manage Sheet" : "Connect"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Webhooks / Custom ATS Integration (Architectural Card) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between opacity-90">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Zap className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-xs">
                REST API Ready
              </Badge>
            </div>

            <h3 className="text-base font-bold text-slate-900">REST API & Webhooks</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              All candidate screenings, scores, and evidence quotes are queryable through secure tenant-gated JSON endpoints for Greenhouse, Lever, and custom ATS integrations.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tenant Isolated Endpoints</span>
            <Link href="/dashboard/candidates">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <span>View Candidate API</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
