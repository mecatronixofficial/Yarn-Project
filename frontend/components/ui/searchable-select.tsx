"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
};

export function SearchableSelect({ value, onChange, options, placeholder, className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((option) => option.toLowerCase().includes(q)) : options;
    return list.slice(0, 30);
  }, [options, query]);

  const exactMatch = options.some((option) => option.toLowerCase() === query.trim().toLowerCase());

  const select = (next: string) => {
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="erp-input pl-8 pr-8"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); onChange(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter") { event.preventDefault(); setOpen(false); }
          }}
        />
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {filtered.length === 0 && !query.trim() && (
            <p className="px-3 py-2 text-xs text-gray-400">Start typing to search or add a new name</p>
          )}
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50",
                option.toLowerCase() === value.trim().toLowerCase() && "bg-emerald-50 text-emerald-800",
              )}
            >
              <span className="truncate">{option}</span>
              {option.toLowerCase() === value.trim().toLowerCase() && <Check size={14} className="shrink-0" />}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(query.trim())}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <Plus size={14} /> Add &quot;{query.trim()}&quot; as new
            </button>
          )}
        </div>
      )}
    </div>
  );
}
