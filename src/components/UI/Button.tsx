import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-[#862d33] hover:bg-[#72262b] active:bg-[#5e1f24] text-white border border-[#862d33]/20 font-semibold focus-visible:ring-[#862d33]",
  secondary:
    "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 active:bg-zinc-100 font-semibold focus-visible:ring-zinc-400",
  danger:
    "bg-white border border-zinc-200 text-zinc-700 hover:bg-[#fbf4f5] hover:text-[#862d33] hover:border-[#eed2d5] font-semibold focus-visible:ring-zinc-400",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 focus-visible:ring-zinc-400",
  dark:
    "bg-black hover:bg-zinc-900 active:bg-zinc-800 text-white shadow-xs font-semibold focus-visible:ring-zinc-700",
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
