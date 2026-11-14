import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-700/20 font-semibold focus-visible:ring-blue-500",
  secondary:
    "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 active:bg-zinc-100 font-semibold focus-visible:ring-zinc-400",
  danger:
    "bg-white border border-zinc-200 text-zinc-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 font-semibold focus-visible:ring-zinc-400",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 focus-visible:ring-zinc-400",
  dark:
    "bg-zinc-900 hover:bg-black active:bg-zinc-800 text-white shadow-xs font-semibold focus-visible:ring-zinc-700",
};

export function Button({
  children,
  className = "",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${variantClassName[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
