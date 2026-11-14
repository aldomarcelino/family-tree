"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full min-w-0 max-w-full space-y-1.5 font-sans overflow-hidden">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-zinc-600 truncate">
            {label}
            {props.required && <span className="text-blue-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative w-full min-w-0 max-w-full overflow-hidden flex items-center">
          <select
            ref={ref}
            id={selectId}
            style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
            className={`w-full min-w-0 max-w-full truncate overflow-hidden appearance-none rounded-lg border bg-white pl-3.5 pr-9 py-2.5 text-[13px] font-normal text-zinc-900 outline-none transition duration-150 cursor-pointer disabled:bg-zinc-50 disabled:text-zinc-400 ${
              error
                ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                : "border-zinc-200 hover:border-zinc-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-3 flex items-center text-zinc-400">
            <ChevronDown size={14} />
          </div>
        </div>

        {error ? (
          <p className="text-[11px] text-blue-600 font-medium leading-none">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-zinc-400 font-normal leading-none">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
