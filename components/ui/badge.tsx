import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "purple"
    | "strongMatch"
    | "possibleMatch"
    | "doesNotMeet"
    | "failed";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-blue-600 text-white shadow hover:bg-blue-700",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
    outline: "border-slate-300 text-slate-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
    warning: "border-amber-200 bg-amber-50 text-amber-700 font-medium",
    purple: "border-purple-200 bg-purple-50 text-purple-700 font-medium",
    strongMatch: "border-emerald-300 bg-emerald-100 text-emerald-800 font-semibold",
    possibleMatch: "border-amber-300 bg-amber-100 text-amber-800 font-semibold",
    doesNotMeet: "border-rose-300 bg-rose-100 text-rose-800 font-semibold",
    failed: "border-slate-300 bg-slate-100 text-slate-700 font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
