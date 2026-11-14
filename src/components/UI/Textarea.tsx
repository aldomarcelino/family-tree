"use client";

import React, { forwardRef, useId } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const count = String(props.value ?? props.defaultValue ?? "").length;
    const showCount = props.maxLength !== undefined && !props.readOnly;
    const fieldError = error || (props.maxLength !== undefined && count > props.maxLength ? `Maksimal ${props.maxLength} karakter.` : undefined);
    const descriptionId = `${textareaId}-description`;

    return (
      <div className="w-full min-w-0 space-y-1.5 font-sans">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-zinc-600">
            {label}
            {props.required && <span className="text-[#862d33] ml-0.5">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full min-w-0 rounded-lg border bg-white px-3.5 py-2.5 text-[13px] font-normal text-zinc-900 placeholder:text-zinc-400 outline-none transition duration-150 resize-y min-h-20 disabled:bg-zinc-50 disabled:text-zinc-400 ${
            fieldError
              ? "border-[#eed2d5] focus:border-[#862d33] focus:ring-2 focus:ring-[#862d33]/15"
              : "border-zinc-200 hover:border-zinc-300 focus:border-[#862d33] focus:ring-2 focus:ring-[#862d33]/15"
          } ${className}`}
          {...props}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={[props["aria-describedby"], (fieldError || hint || showCount) ? descriptionId : null].filter(Boolean).join(" ") || undefined}
        />

        {(fieldError || hint || showCount) && <div id={descriptionId} className="flex items-start justify-between gap-3 text-[10px] leading-4"><p className={`min-w-0 ${fieldError ? "text-[#862d33]" : "text-zinc-400"}`}>{fieldError || hint}</p>{showCount && <span className={`shrink-0 tabular-nums ${count >= props.maxLength! ? "text-[#862d33]" : "text-zinc-400"}`}>{count.toLocaleString("id-ID")} / {props.maxLength!.toLocaleString("id-ID")}</span>}</div>}

      </div>
    );
  }
);

Textarea.displayName = "Textarea";
