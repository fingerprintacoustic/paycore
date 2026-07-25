import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variant === "primary" &&
            "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500",
          variant === "secondary" &&
            "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          variant === "ghost" &&
            "text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30",
          className
        )}
        {...props}
      >
        {loading ? "Please wait…" : children}
      </button>
    );
  }
);
Button.displayName = "Button";
