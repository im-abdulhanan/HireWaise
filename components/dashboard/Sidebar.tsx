"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileSpreadsheet,
  Settings,
  Sparkles,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  companyName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  companyName = "Workspace",
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse: controlledOnToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  // Internal collapse state with localStorage persistence if not controlled externally
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("screenai_sidebar_collapsed");
      if (saved !== null) {
        setInternalCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const isCollapsed =
    controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (controlledOnToggleCollapse) {
      controlledOnToggleCollapse();
    } else {
      const nextVal = !internalCollapsed;
      setInternalCollapsed(nextVal);
      try {
        localStorage.setItem("screenai_sidebar_collapsed", String(nextVal));
      } catch {
        // Ignore
      }
    }
  };

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs Studio", href: "/dashboard/jobs", icon: Briefcase },
    { name: "Candidates", href: "/dashboard/candidates", icon: Users },
    { name: "Integrations & Sheets", href: "/dashboard/integrations", icon: FileSpreadsheet },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex h-full flex-shrink-0 flex-col border-r border-black/10 bg-[#faf8f5] transition-all duration-300 ease-in-out lg:static lg:h-full lg:translate-x-0 overflow-hidden",
          // Width on desktop
          isCollapsed ? "lg:w-20" : "lg:w-72",
          // Mobile width & translate
          isOpen ? "w-72 translate-x-0 shadow-2xl" : "w-72 -translate-x-full lg:translate-x-0"
        )}
      >
        {/* Workspace Brand Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-200 transition-all",
            isCollapsed ? "justify-center px-3" : "justify-between px-6"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 min-w-0 transition-opacity",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? `ScreenAI - ${companyName}` : undefined}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#19191a] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <span className="font-bold text-[#19191a] tracking-tight text-base block truncate">
                  ScreenAI
                </span>
                <span className="block text-xs font-medium text-slate-500 truncate max-w-[130px]">
                  {companyName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button (when expanded) */}
          {!isCollapsed && (
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#e7e5e2] hover:text-slate-700 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#e7e5e2] hover:text-slate-600 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button below header for 1-click expand on desktop */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center pt-3 pb-1">
            <button
              onClick={handleToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-[#e7e5e2] hover:text-[#19191a] transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <div className={cn("flex-1 overflow-y-auto py-4", isCollapsed ? "px-2" : "px-4")}>
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "group flex items-center rounded-xl text-sm font-medium transition-all relative",
                    isCollapsed
                      ? "h-11 w-11 mx-auto justify-center p-0"
                      : "gap-3 px-3.5 py-2.5",
                    isActive
                      ? "bg-[#e7e5e2] text-[#19191a] shadow-xs font-semibold"
                      : "text-slate-600 hover:bg-[#e7e5e2] hover:text-[#19191a]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-[#19191a]" : "text-slate-500 group-hover:text-[#19191a]"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate animate-in fade-in duration-200">
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Responsible AI & Human Review Disclaimer in footer */}
        <div className="p-3">
          {isCollapsed ? (
            <div
              className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-[#e7e5e2]/80 border border-black/10 text-emerald-700"
              title="Decision-Support AI: Human recruiters make final decisions."
            >
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
          ) : (
            <div className="border border-black/10 p-3.5 bg-[#e7e5e2]/80 rounded-xl animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Decision-Support AI</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                    AI outputs assist screening; human recruiters make final decisions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
