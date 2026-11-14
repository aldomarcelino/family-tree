"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  size = "md",
  fullWidth = true,
  className = "",
}: TabsProps) {
  const pad = size === "sm" ? "py-1.5 px-2.5 text-xs" : "py-2 px-3 text-xs";

  return (
    <div
      className={`flex items-center bg-zinc-50 p-1 rounded-lg border border-zinc-200/80 font-sans ${
        fullWidth ? "w-full" : "inline-flex"
      } ${className}`}
    >
      {items.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`${fullWidth ? "flex-1" : ""} ${pad} flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                  isActive ? "bg-blue-50 text-blue-700" : "bg-zinc-200/70 text-zinc-600"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
