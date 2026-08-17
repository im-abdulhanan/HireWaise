"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Star, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface RequirementItem {
  id?: string;
  title: string;
  category: "REQUIRED" | "PREFERRED" | "OPTIONAL";
  type: "SKILL" | "EXPERIENCE" | "EDUCATION" | "CERTIFICATION" | "CUSTOM";
  normalizedKey?: string;
  minimumValue?: number;
  description?: string;
}

interface RequirementEditorProps {
  requirements: RequirementItem[];
  onChange: (requirements: RequirementItem[]) => void;
}

export function RequirementEditor({
  requirements,
  onChange,
}: RequirementEditorProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"REQUIRED" | "PREFERRED" | "OPTIONAL">("REQUIRED");
  const [newType, setNewType] = useState<"SKILL" | "EXPERIENCE" | "EDUCATION" | "CERTIFICATION" | "CUSTOM">("SKILL");
  const [newMinValue, setNewMinValue] = useState<number | undefined>(undefined);

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    const newItem: RequirementItem = {
      id: `req-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      type: newType,
      minimumValue: newType === "EXPERIENCE" ? newMinValue : undefined,
    };

    onChange([...requirements, newItem]);
    setNewTitle("");
    setNewMinValue(undefined);
  };

  const handleRemove = (index: number) => {
    const updated = requirements.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleCategoryChange = (index: number, category: "REQUIRED" | "PREFERRED" | "OPTIONAL") => {
    const updated = [...requirements];
    updated[index].category = category;
    onChange(updated);
  };

  const requiredCount = requirements.filter((r) => r.category === "REQUIRED").length;
  const preferredCount = requirements.filter((r) => r.category === "PREFERRED").length;
  const optionalCount = requirements.filter((r) => r.category === "OPTIONAL").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Job Requirements</h4>
          <p className="text-xs text-slate-500">
            Define the criteria used by the deterministic engine to screen candidates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {requiredCount} Required
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {preferredCount} Preferred
          </Badge>
          {optionalCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {optionalCount} Optional
            </Badge>
          )}
        </div>
      </div>

      {/* Add New Requirement Inline Control */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="text-xs font-semibold text-blue-900 mb-2">Add Custom Requirement</div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5">
            <Input
              placeholder="e.g. React, 3+ Years Exp, Bachelor's CS"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="REQUIRED">Required (Must-have)</option>
              <option value="PREFERRED">Preferred (Bonus)</option>
              <option value="OPTIONAL">Optional</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as any)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="SKILL">Skill</option>
              <option value="EXPERIENCE">Experience</option>
              <option value="EDUCATION">Education</option>
              <option value="CERTIFICATION">Certification</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="w-full gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {newType === "EXPERIENCE" && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-600">Minimum Years:</span>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 3"
              value={newMinValue ?? ""}
              onChange={(e) => setNewMinValue(e.target.value ? Number(e.target.value) : undefined)}
              className="h-8 w-24 rounded-lg border border-slate-300 bg-white px-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>
        )}
      </div>

      {/* Requirements List */}
      {requirements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
          <HelpCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">No requirements configured yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Analyze Job Description with AI" to extract requirements automatically, or add custom ones above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requirements.map((req, index) => {
            const isReq = req.category === "REQUIRED";
            const isPref = req.category === "PREFERRED";

            return (
              <div
                key={req.id || index}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isReq
                        ? "bg-blue-100 text-blue-700"
                        : isPref
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isReq ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {req.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {req.type}
                      </span>
                      {req.minimumValue && (
                        <span className="text-[11px] text-slate-500">
                          • Min: {req.minimumValue} yrs
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={req.category}
                    onChange={(e) => handleCategoryChange(index, e.target.value as any)}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="REQUIRED">Required</option>
                    <option value="PREFERRED">Preferred</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove requirement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
