import { forwardRef, type InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900",
            "placeholder:text-slate-400 backdrop-blur-sm transition",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
            "dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/30",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
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
