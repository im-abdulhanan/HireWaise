"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Menu, LogOut, User as UserIcon, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);

  const userName = session?.user?.name || "Recruiter";
  const userEmail = session?.user?.email || "";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 lg:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-slate-800">Recruiter Workspace</h2>
          <p className="text-xs text-slate-500">Autonomous Resume Screening & Evidence Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/jobs/new">
          <Button size="sm" className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Job</span>
          </Button>
        </Link>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white ring-2 ring-slate-100 hover:ring-blue-500 transition-all"
          >
            {initial}
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900 truncate">{userName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    Account Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="h-3.5 w-3.5 text-red-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
