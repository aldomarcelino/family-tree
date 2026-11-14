"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  counterLabel?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, counterLabel, leftIcon, rightElement, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const count = String(props.value ?? props.defaultValue ?? "").length;
    const showCount = (props.maxLength !== undefined || counterLabel !== undefined) && !props.readOnly;
    const fieldError = error || (props.maxLength !== undefined && count > props.maxLength ? `Maksimal ${props.maxLength} karakter.` : undefined);
    const descriptionId = `${inputId}-description`;

    return (
      <div className="w-full min-w-0 space-y-1.5 font-sans">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-zinc-600">
            {label}
            {props.required && <span className="text-blue-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full min-w-0">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 text-zinc-400 flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full min-w-0 rounded-lg border bg-white text-[13px] font-normal text-zinc-900 placeholder:text-zinc-400 outline-none transition duration-150 disabled:bg-zinc-50 disabled:text-zinc-400 ${
              leftIcon ? "pl-9" : "px-3.5"
            } ${rightElement ? "pr-10" : "pr-3.5"} py-2.5 ${
              fieldError
                ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                : "border-zinc-200 hover:border-zinc-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            } ${className}`}
            {...props}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={[props["aria-describedby"], (fieldError || hint || showCount) ? descriptionId : null].filter(Boolean).join(" ") || undefined}
          />

          {rightElement && (
            <div className="absolute right-2.5 flex items-center justify-center text-zinc-400">
              {rightElement}
            </div>
          )}
        </div>

        {(fieldError || hint || showCount) && <div id={descriptionId} className="flex items-start justify-between gap-3 text-[10px] leading-4"><p className={`min-w-0 ${fieldError ? "text-blue-700" : "text-zinc-400"}`}>{fieldError || hint}</p>{showCount && <span className={`shrink-0 tabular-nums ${fieldError || count >= props.maxLength! ? "text-blue-600" : "text-zinc-400"}`}>{counterLabel ?? `${count.toLocaleString("id-ID")} / ${props.maxLength!.toLocaleString("id-ID")}`}</span>}</div>}

      </div>
    );
  }
);

Input.displayName = "Input";
