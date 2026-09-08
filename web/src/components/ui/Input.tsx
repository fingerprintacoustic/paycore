"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** For type="password": show an eye button that toggles the value visible. */
  revealable?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, revealable, type, ...props }, ref) => {
    const inputId = id ?? props.name;
    const [revealed, setRevealed] = useState(false);
    const canReveal = revealable && type === "password" && !props.disabled;
    const effectiveType = canReveal && revealed ? "text" : type;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={clsx(
              "w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900",
              "placeholder:text-slate-400 backdrop-blur-sm transition",
              "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
              "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/30",
              canReveal && "pr-11",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {canReveal && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide password" : "Show password"}
              aria-pressed={revealed}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
            >
              {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
