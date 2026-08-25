"use client";

import { useState, useRef, useEffect } from "react";
import {
  SUPPORTED_CURRENCIES,
  CurrencyConfig,
  getCurrency,
  searchCurrencies,
} from "@/lib/currency/currencies";
import { ChevronDown, Search, Check } from "lucide-react";

interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function CurrencySelector({
  value,
  onChange,
  disabled = false,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCurrency = getCurrency(value);
  const filteredCurrencies = searchCurrencies(search);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Focus search input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="flex h-10 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50 min-w-[110px]"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sm">{selectedCurrency.flag}</span>
          <span className="font-bold">{selectedCurrency.code}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Popover Dropdown Menu */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search currency, code or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Currencies List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((c) => {
                const isSelected = c.code === selectedCurrency.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-slate-100 font-bold text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{c.flag}</span>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({c.code})
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-black shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No currencies matching &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencySelector;
